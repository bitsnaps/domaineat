<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLookupStore, type LookupHistoryEntry } from '@/stores/lookup'
import { useAuthStore } from '@/stores/auth'
import { usePricingStore } from '@/stores/pricing'
import DomainLookupCard from '@/components/DomainLookupCard.vue'
import AppraisalBadge from '@/components/AppraisalBadge.vue'
import PricingCard from '@/components/PricingCard.vue'
import TldSelector from '@/components/TldSelector.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import type { ExtensionCheckResult, DomainAppraisal } from '@/types'
import { formatDate } from '@/lib/format'
import { appraise } from '@/lib/appraise'

const store = useLookupStore()
const auth = useAuthStore()
const pricingStore = usePricingStore()

const searchInput = ref('')
const selectedTlds = ref<string[]>([...store.defaultTlds])
const mode = ref<'search' | 'validate'>('search')
const viewMode = ref<'card' | 'list'>('card')
const showHistory = ref(false)

// Debounce: 1s cooldown after submitting
const lastSubmitTime = ref(0)
const DEBOUNCE_MS = 1000
const submitCooldown = computed(() => {
	if (lastSubmitTime.value === 0) return false
	return Date.now() - lastSubmitTime.value < DEBOUNCE_MS
})

const inputPlaceholder = computed(() =>
	mode.value === 'search'
		? 'e.g. mybrand (SLD only, no TLD)'
		: 'e.g. mybrand.com (full domain)'
)

const isLoggedIn = computed(() => auth.isLoggedIn)

function handleSubmit() {
	if (submitCooldown.value) return
	const input = searchInput.value.trim().toLowerCase().replace(/^www\./, '')
	if (!input) return

	lastSubmitTime.value = Date.now()

	// Reset previous results before new search
	store.reset()

	if (mode.value === 'validate') {
		store.validateDomain(input)
	} else {
		const sld = input.split('.')[0] || input
		store.searchDomain(sld, selectedTlds.value)
	}
}

function handleCardClick(result: ExtensionCheckResult) {
	mode.value = 'validate'
	searchInput.value = result.domain
	store.reset()
	store.validateDomain(result.domain)
}

function handleRowClick(result: ExtensionCheckResult) {
	handleCardClick(result)
}

function handleHistoryClick(entry: LookupHistoryEntry) {
	searchInput.value = entry.query
	mode.value = entry.mode
	if (entry.mode === 'search' && entry.tlds) {
		selectedTlds.value = [...entry.tlds]
	}
	store.restoreFromHistory(entry)
	showHistory.value = false
}

function formatHistoryTime(ts: number): string {
	const diff = Date.now() - ts
	if (diff < 60000) return 'just now'
	if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
	if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
	return formatDate(new Date(ts).toISOString())
}

function statusIcon(available: boolean | null) {
	if (available === true) return 'bi-check-circle-fill text-success'
	if (available === false) return 'bi-x-circle-fill text-secondary'
	return 'bi-question-circle-fill text-warning'
}

function statusLabel(available: boolean | null) {
	if (available === true) return 'Available'
	if (available === false) return 'Taken'
	return 'Unknown'
}

// ─── Appraisal helpers ──────────────────────────────────────────────

/** Compute appraisal for the current validate result */
const validateAppraisal = computed<DomainAppraisal | null>(() => {
	if (!store.validateResult) return null
	return appraise(store.validateResult.domain)
})

function formatRange(range: { low: number; high: number }): string {
	const fmt = (n: number) => {
		if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`
		if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
		return `$${n}`
	}
	return `${fmt(range.low)} – ${fmt(range.high)}`
}

function signalIcon(passed: boolean): string {
	return passed ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-warning'
}

// ─── Pricing Integration ────────────────────────────────────────────

/** Auto-fetch pricing when a validate result is available */
watch(
	() => store.validateResult,
	(result) => {
		if (result?.domain) {
			pricingStore.fetchPricing(result.domain)
		} else {
			pricingStore.clearPricing()
		}
	},
)
</script>

<template>
	<div class="lookup-panel">
		<!-- Header -->
		<div class="text-center mb-4">
			<h2 class="fw-bold">
				<i class="bi bi-search me-2" style="color: var(--primary);"></i>
				Domain Lookup
			</h2>
			<p class="text-muted">
				Check domain availability across multiple TLDs
			</p>
			<p v-if="!isLoggedIn" class="small text-info">
				<i class="bi bi-info-circle me-1"></i>
				Anonymous: 30 lookups/day.
				<router-link to="/login">Sign in</router-link> for higher limits.
			</p>
		</div>

		<!-- Search Bar -->
		<div class="card shadow-sm mb-4">
			<div class="card-body p-4">
				<!-- Mode Toggle -->
				<div class="btn-group btn-group-sm mb-3 w-100" role="group">
					<button
						class="btn"
						:class="mode === 'search' ? 'btn-primary' : 'btn-outline-primary'"
						@click="mode = 'search'; store.reset()"
					>
						<i class="bi bi-grid me-1"></i>Multi-TLD Search
					</button>
					<button
						class="btn"
						:class="mode === 'validate' ? 'btn-primary' : 'btn-outline-primary'"
						@click="mode = 'validate'; store.reset()"
					>
						<i class="bi bi-zoom-in me-1"></i>Deep Validate
					</button>
				</div>

				<!-- Input -->
				<div class="input-group input-group-lg">
					<input
						v-model="searchInput"
						type="text"
						class="form-control"
						:placeholder="inputPlaceholder"
						@keydown.enter="handleSubmit"
						autofocus
					/>
					<button
						class="btn btn-primary px-4"
						@click="handleSubmit"
						:disabled="store.loading || !searchInput.trim() || submitCooldown"
						:title="submitCooldown ? 'Please wait a moment...' : 'Lookup'"
					>
						<span v-if="store.loading" class="spinner-border spinner-border-sm me-1"></span>
						{{ store.loading ? 'Looking up...' : 'Lookup' }}
					</button>
				</div>

				<!-- TLD Selector (search mode only) -->
				<TldSelector
					v-if="mode === 'search'"
					v-model="selectedTlds"
					:available="store.defaultTlds"
					class="mt-3"
				/>
			</div>
		</div>

		<!-- Search History -->
		<div v-if="store.history.length > 0" class="mb-3">
			<button
				class="btn btn-sm btn-outline-secondary"
				@click="showHistory = !showHistory"
			>
				<i class="bi bi-clock-history me-1"></i>
				Recent searches
				<span class="badge bg-secondary ms-1">{{ store.history.length }}</span>
				<i class="bi ms-1" :class="showHistory ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
			</button>
			<div v-if="showHistory" class="card mt-2 shadow-sm">
				<div class="list-group list-group-flush">
					<button
						v-for="(entry, idx) in store.history"
						:key="idx"
						class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
						@click="handleHistoryClick(entry)"
					>
						<div>
							<i class="bi me-1" :class="entry.mode === 'search' ? 'bi-grid' : 'bi-zoom-in'"></i>
							<span class="fw-semibold">{{ entry.query }}</span>
							<span v-if="entry.mode === 'search' && entry.tlds" class="text-muted small ms-1">
								.{{ entry.tlds.join(', .') }}
							</span>
						</div>
						<span class="text-muted small">{{ formatHistoryTime(entry.timestamp) }}</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Error -->
		<div v-if="store.error" class="alert alert-danger d-flex align-items-center" role="alert">
			<i class="bi bi-exclamation-triangle me-2"></i>
			{{ store.error }}
			<span v-if="store.rateLimitInfo" class="ms-auto small">
				{{ store.rateLimitInfo.used }}/{{ store.rateLimitInfo.limit }} ({{ store.rateLimitInfo.tier }})
			</span>
		</div>

		<!-- Loading -->
		<div v-if="store.loading">
			<LoadingSkeleton :count="mode === 'search' ? 5 : 1" />
		</div>

		<!-- Search Results -->
		<div v-if="!store.loading && store.searchResult" class="mt-3">
			<div class="d-flex justify-content-between align-items-center mb-3">
				<h5 class="mb-0">
					Results for <strong>{{ store.searchResult.sld }}</strong>
					<span class="badge bg-primary ms-2">{{ store.searchResult.results.length }} TLDs</span>
					<span v-if="store.fromCache" class="badge bg-info ms-2" title="Result served from cache">
						<i class="bi bi-lightning-fill me-1"></i>Cached
					</span>
				</h5>
				<!-- View Mode Toggle -->
				<div class="btn-group btn-group-sm" role="group">
					<button
						class="btn"
						:class="viewMode === 'card' ? 'btn-primary' : 'btn-outline-primary'"
						@click="viewMode = 'card'"
						title="Card view"
					>
						<i class="bi bi-grid-3x3-gap"></i>
					</button>
					<button
						class="btn"
						:class="viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'"
						@click="viewMode = 'list'"
						title="Table view"
					>
						<i class="bi bi-list-ul"></i>
					</button>
				</div>
			</div>

			<!-- Card View -->
			<div v-if="viewMode === 'card'" class="row g-3">
				<div
					v-for="result in store.searchResult.results"
					:key="result.domain"
					class="col-12 col-sm-6 col-md-4 col-lg-3"
				>
					<DomainLookupCard
						:result="result"
						@click="handleCardClick(result)"
					/>
				</div>
			</div>

			<!-- List / Table View -->
			<div v-else class="card shadow-sm">
				<div class="table-responsive">
					<table class="table table-hover align-middle mb-0">
						<thead class="table-light">
							<tr>
								<th style="width: 35%;">Domain</th>
								<th style="width: 12%;">Status</th>
								<th style="width: 8%;">Grade</th>
								<th style="width: 22%;">Registrar</th>
								<th style="width: 18%;">Expiry</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="result in store.searchResult.results"
								:key="result.domain"
								class="lookup-row"
								@click="handleRowClick(result)"
							>
								<td>
									<div class="d-flex align-items-center">
										<i class="bi me-2" :class="statusIcon(result.available)"></i>
										<span class="fw-semibold">{{ result.domain }}</span>
									</div>
								</td>
							<td>
								<span
									class="badge"
									:class="result.available ? 'bg-success' : 'bg-secondary'"
								>
									{{ statusLabel(result.available) }}
								</span>
							</td>
							<td>
								<AppraisalBadge :grade="appraise(result.domain).grade" size="sm" />
							</td>
								<td class="text-muted small">
									{{ result.registrar || '—' }}
								</td>
								<td class="text-muted small">
									{{ formatDate(result.expiryDate) }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Validate Result (single domain deep-dive) -->
		<div v-if="!store.loading && store.validateResult" class="mt-3">
			<div class="card shadow-sm">
				<div class="card-header d-flex justify-content-between align-items-center">
					<h5 class="mb-0">
						{{ store.validateResult.domain }}
						<span v-if="store.fromCache" class="badge bg-info ms-2" title="Result served from cache">
							<i class="bi bi-lightning-fill me-1"></i>Cached
						</span>
					</h5>
					<span
						class="badge fs-6"
						:class="store.validateResult.available ? 'bg-success' : 'bg-secondary'"
					>
						{{ store.validateResult.available ? 'Available' : 'Registered' }}
					</span>
				</div>
				<div class="card-body">
					<!-- WHOIS/RDAP Info -->
					<div v-if="store.validateResult.whois" class="mb-4">
						<h6 class="fw-semibold mb-3">
							<i class="bi bi-card-text me-2"></i>Registration Info
						</h6>
						<div class="row g-3">
							<div v-if="store.validateResult.whois.registrar" class="col-sm-6 col-md-3">
								<div class="small text-muted">Registrar</div>
								<div class="fw-semibold">{{ store.validateResult.whois.registrar }}</div>
							</div>
							<div v-if="store.validateResult.whois.creationDate" class="col-sm-6 col-md-3">
								<div class="small text-muted">Created</div>
								<div class="fw-semibold">{{ formatDate(store.validateResult.whois.creationDate) }}</div>
							</div>
							<div v-if="store.validateResult.whois.expiryDate" class="col-sm-6 col-md-3">
								<div class="small text-muted">Expires</div>
								<div class="fw-semibold">{{ formatDate(store.validateResult.whois.expiryDate) }}</div>
							</div>
							<div v-if="store.validateResult.whois.status?.length" class="col-sm-6 col-md-3">
								<div class="small text-muted">Status</div>
								<div>
									<span
										v-for="s in store.validateResult.whois.status"
										:key="s"
										class="badge bg-light text-dark me-1 mb-1"
									>{{ s }}</span>
								</div>
							</div>
						</div>
						<!-- Nameservers -->
						<div v-if="store.validateResult.whois.nameservers?.length" class="mt-3">
							<div class="small text-muted mb-1">Nameservers</div>
							<div class="d-flex flex-wrap gap-1">
								<span
									v-for="ns in store.validateResult.whois.nameservers"
									:key="ns"
									class="badge bg-info text-dark"
								>{{ ns }}</span>
							</div>
						</div>
				</div>

				<!-- Domain Appraisal -->
				<div v-if="validateAppraisal" class="mb-4">
					<h6 class="fw-semibold mb-3">
						<i class="bi bi-bar-chart-line me-2"></i>Domain Appraisal
					</h6>
					<div class="d-flex align-items-center gap-3 mb-3">
						<AppraisalBadge
							:grade="(store.appraisalResult ?? validateAppraisal).grade"
							:range="(store.appraisalResult ?? validateAppraisal).range"
							size="lg"
						/>
						<div>
							<div class="fw-semibold">{{ formatRange((store.appraisalResult ?? validateAppraisal).range) }}</div>
							<div class="small text-muted">
								{{ store.appraisalResult ? 'Server-verified market value' : 'Estimated market value range' }}
							</div>
						</div>
					</div>
					<!-- Signal breakdown -->
					<div class="row g-2">
						<div v-for="(signal, key) in (store.appraisalResult ?? validateAppraisal).signals" :key="key" class="col-sm-6 col-md-4">
							<div class="d-flex align-items-center gap-2 p-2 rounded bg-light">
								<i class="bi" :class="signalIcon(signal.passed)"></i>
								<div class="flex-grow-1">
									<div class="small fw-semibold text-capitalize">{{ key }}</div>
									<div class="small text-muted">{{ signal.label }}</div>
								</div>
								<span class="badge bg-white text-dark border">{{ signal.score }}/10</span>
							</div>
						</div>
					</div>
					<!-- Market Appraisal button (Tier 2) -->
					<div class="mt-3">
						<button
							v-if="!store.appraisalResult"
							class="btn btn-outline-primary btn-sm"
							:disabled="store.appraisalLoading"
							@click="store.fetchAppraisal(store.validateResult.domain)"
						>
							<span v-if="store.appraisalLoading" class="spinner-border spinner-border-sm me-1"></span>
							<i v-else class="bi bi-lightning-charge me-1"></i>
							{{ store.appraisalLoading ? 'Verifying...' : 'Get Market Appraisal' }}
						</button>
						<div v-else class="d-flex align-items-center gap-2">
							<span class="badge bg-info">
								<i class="bi bi-patch-check me-1"></i>Server-verified
							</span>
							<button
								class="btn btn-link btn-sm p-0 text-muted"
								@click="store.clearAppraisal"
							>
								Reset to instant
							</button>
						</div>
						<div v-if="store.appraisalError" class="small text-danger mt-1">
							{{ store.appraisalError }}
						</div>
					</div>
				</div>

				<!-- DNS Info -->
					<div v-if="store.validateResult.dns">
						<h6 class="fw-semibold mb-3">
							<i class="bi bi-hdd-network me-2"></i>DNS Check
						</h6>
						<div class="row g-3">
							<div class="col-sm-6 col-md-3">
								<div class="small text-muted">Resolves</div>
								<div class="fw-semibold">
									<span :class="store.validateResult.dns.resolved ? 'text-success' : 'text-danger'">
										{{ store.validateResult.dns.resolved ? 'Yes' : 'No' }}
									</span>
								</div>
							</div>
							<div v-if="store.validateResult.dns.ip" class="col-sm-6 col-md-3">
								<div class="small text-muted">IP Address</div>
								<code>{{ store.validateResult.dns.ip }}</code>
							</div>
							<div v-if="store.validateResult.dns.ssl_expiry" class="col-sm-6 col-md-3">
								<div class="small text-muted">SSL Expiry</div>
								<div class="fw-semibold">{{ formatDate(store.validateResult.dns.ssl_expiry) }}</div>
							</div>
							<div v-if="store.validateResult.dns.nameservers?.length" class="col-12">
								<div class="small text-muted mb-1">DNS Nameservers</div>
								<div class="d-flex flex-wrap gap-1">
									<span
										v-for="ns in store.validateResult.dns.nameservers"
										:key="ns"
										class="badge bg-info text-dark"
									>{{ ns }}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Available prompt -->
					<div v-if="store.validateResult.available" class="text-center py-3">
						<i class="bi bi-check-circle-fill text-success fs-1"></i>
						<p class="mt-2 mb-0 text-success fw-semibold">
							This domain appears to be available for registration!
						</p>
					</div>
				</div>
			</div>

			<!-- Domain Pricing -->
			<div v-if="pricingStore.loading || pricingStore.pricingResult" class="mt-3">
				<div v-if="pricingStore.loading" class="card shadow-sm">
					<div class="card-body text-center py-3">
						<span class="spinner-border spinner-border-sm me-2"></span>
						Fetching pricing from providers...
					</div>
				</div>
				<PricingCard v-else-if="pricingStore.pricingResult" :pricing="pricingStore.pricingResult" />
			</div>
		</div>
	</div>
</template>

<style scoped>
.lookup-panel {
	max-width: 1400px;
	margin: 0 auto;
	padding: 2rem 1.5rem 3rem;
}

/* Table row click */
.lookup-row {
	cursor: pointer;
	transition: background 0.15s;
}
.lookup-row:hover {
	background: rgba(99, 102, 241, 0.04);
}

@media (max-width: 767.98px) {
	.lookup-panel {
		padding: 1.25rem 1rem 2rem;
	}
}
</style>
