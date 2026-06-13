<script setup lang="ts">
import type { ExtensionCheckResult } from '@/types'
import { formatDate } from '@/lib/format'
import { appraise } from '@/lib/appraise'
import AppraisalBadge from '@/components/AppraisalBadge.vue'
import { computed, ref } from 'vue'
import { useWatchlistStore } from '@/stores/watchlist'
import { useWishlistStore } from '@/stores/wishlist'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'

const props = defineProps<{
	result: ExtensionCheckResult
}>()

const emit = defineEmits<{
	click: []
}>()

const watchlistStore = useWatchlistStore()
const wishlistStore = useWishlistStore()
const auth = useAuthStore()

const showMenu = ref(false)
const importing = ref(false)
const findingProspects = ref(false)
const prospectResult = ref<{ found: number } | null>(null)

const appraisal = computed(() => appraise(props.result.domain))

// ─── Decision Signals ──────────────────────────────────────────────

const isHotBuy = computed(() => {
	const a = appraisal.value
	return props.result.available && a.grade !== 'F' && a.range.low >= 500
})

const isHighValueTarget = computed(() => {
	const a = appraisal.value
	return !props.result.available && (a.grade === 'A' || a.grade === 'A+' || a.range.low >= 5000)
})

// ─── Action Menu Handlers ──────────────────────────────────────────

const domainParts = computed(() => {
	const parts = props.result.domain.split('.')
	const tld = parts.length > 1 ? parts.pop()! : 'com'
	const sld = parts.join('.')
	return { sld, tld }
})

async function addToWatchlist() {
	if (!auth.isLoggedIn) return
	await watchlistStore.addToWatchlist({
		domain_name: props.result.domain,
		tld: domainParts.value.tld,
	})
	showMenu.value = false
}

async function addToWishlist() {
	if (!auth.isLoggedIn) return
	await wishlistStore.addToWishlist({
		domain_name: props.result.domain,
		tld: domainParts.value.tld,
		priority: props.result.available ? 'high' : 'medium',
	})
	showMenu.value = false
}

async function addToPortfolio() {
	if (!auth.isLoggedIn) return
	importing.value = true
	try {
		await api.post('/domains/from-lookup', { domain_name: props.result.domain })
		const { useToastStore } = await import('@/stores/toast')
		useToastStore().success(`${props.result.domain} added to portfolio`)
	} catch (e: any) {
		const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
		const { useToastStore } = await import('@/stores/toast')
		useToastStore().error(`Failed to add: ${msg}`)
	} finally {
		importing.value = false
		showMenu.value = false
	}
}

async function findProspects() {
	if (!auth.isLoggedIn) return
	findingProspects.value = true
	prospectResult.value = null
	try {
		// First add to portfolio if not already there
		const addRes = await api.post('/domains/from-lookup', { domain_name: props.result.domain })
		const domainId = (addRes.data as any).id
		// Then find prospects
		const res = await api.post('/domains/find-prospects', { domain_id: domainId })
		prospectResult.value = res.data
		const { useToastStore } = await import('@/stores/toast')
		useToastStore().success(`Found ${res.data.found} prospect${res.data.found !== 1 ? 's' : ''} for ${props.result.domain}`)
	} catch (e: any) {
		const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
		const { useToastStore } = await import('@/stores/toast')
		useToastStore().error(`Failed to find prospects: ${msg}`)
	} finally {
		findingProspects.value = false
		showMenu.value = false
	}
}

function closeMenu() {
  showMenu.value = false
}

/** Generate registrar search URL for available domains */
function registerUrl() {
  const q = encodeURIComponent(props.result.domain)
  const registrar = auth.user?.preferred_registrar
  if (registrar) {
    if (registrar.includes('{domain}')) return registrar.replace('{domain}', q)
    return `https://${registrar.replace(/^https?:\/\//, '')}?domain=${q}`
  }
  return `https://www.namecheap.com/domains/registration/results/?domain=${q}`
}
</script>

<template>
	<div
		class="card lookup-card h-100"
		:class="{ 'card-available': result.available, 'card-taken': !result.available }"
		tabindex="0"
		@keydown.escape="closeMenu"
	>
		<div class="card-body d-flex flex-column p-3">
			<!-- Top row: domain name + action menu -->
			<div class="d-flex justify-content-between align-items-start">
				<h6
					class="card-title mb-1 text-break flex-grow-1"
					style="word-break: break-all; cursor: pointer;"
					@click="$emit('click')"
				>
					{{ result.domain }}
				</h6>
				<!-- Decision Signals -->
				<span v-if="isHotBuy" class="badge bg-danger ms-1 flex-shrink-0" title="Hot Buy — Available + good appraisal">
					🔥 Hot Buy
				</span>
				<span v-else-if="isHighValueTarget" class="badge bg-warning text-dark ms-1 flex-shrink-0" title="High Value Target — Premium taken domain">
					💰 High Value
				</span>
				<!-- Action Menu ⋯ -->
				<div v-if="auth.isLoggedIn" class="dropdown-center ms-1 flex-shrink-0">
					<button
						class="btn btn-sm btn-link text-muted p-0"
						@click.stop="showMenu = !showMenu"
						title="Actions"
						data-testid="card-action-menu"
					>
						<i class="bi bi-three-dots-vertical"></i>
					</button>
					<div
						v-if="showMenu"
						class="dropdown-menu show end-0 shadow-sm"
						style="min-width: 180px;"
						data-testid="card-action-dropdown"
					>
						<button class="dropdown-item" @click.stop="addToWatchlist">
							<i class="bi bi-eye me-2"></i>Add to Watchlist
						</button>
						<button class="dropdown-item" @click.stop="addToWishlist">
							<i class="bi bi-heart me-2"></i>Add to Wishlist
						</button>
						<button class="dropdown-item" @click.stop="addToPortfolio" :disabled="importing">
							<i class="bi bi-box-arrow-in-right me-2"></i>
							{{ importing ? 'Adding...' : 'Add to Portfolio' }}
						</button>
						<button v-if="!result.available" class="dropdown-item" @click.stop="findProspects" :disabled="findingProspects">
							<i class="bi bi-search me-2"></i>
							{{ findingProspects ? 'Finding...' : 'Find Prospects' }}
						</button>
					</div>
				</div>
			</div>

			<!-- Badges: status + appraisal -->
			<div class="d-flex align-items-center gap-1 mb-2">
				<span
					class="badge"
					:class="result.available ? 'bg-success' : 'bg-secondary'"
					style="cursor: pointer;"
					@click="$emit('click')"
				>
					{{ result.available ? 'Available' : 'Taken' }}
				</span>
				<AppraisalBadge :grade="appraisal.grade" :range="appraisal.range" size="sm" />
			</div>

			<!-- Details -->
			<div v-if="!result.available" class="small text-muted mt-auto">
				<div v-if="result.registrar" class="text-truncate" :title="result.registrar">
					<i class="bi bi-building me-1"></i>{{ result.registrar }}
				</div>
				<div v-if="result.expiryDate">
					<i class="bi bi-calendar me-1"></i>Exp: {{ formatDate(result.expiryDate) }}
				</div>
			</div>
			<div v-else class="small mt-auto">
			  <div class="text-success mb-1">
			    <i class="bi bi-check-circle me-1"></i>Available for registration
			  </div>
			  <a
			    :href="registerUrl()"
			    target="_blank"
			    rel="noopener"
			    class="btn btn-sm btn-success py-0 px-2"
			  >
			    <i class="bi bi-cart-plus me-1"></i>Register Now →
			  </a>
			</div>
			<!-- Prospect result indicator -->
			<div v-if="prospectResult" class="small mt-2 text-info">
			  <i class="bi bi-check-circle me-1"></i>{{ prospectResult.found }} prospect{{ prospectResult.found !== 1 ? 's' : '' }} found
			</div>
		</div>
	</div>
</template>

<style scoped>
.lookup-card {
	transition: transform 0.15s, box-shadow 0.15s;
	cursor: default;
}
.lookup-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.card-available {
	border-left: 3px solid var(--bs-success, #198754);
}
.card-taken {
	border-left: 3px solid var(--bs-secondary, #6c757d);
}
</style>
