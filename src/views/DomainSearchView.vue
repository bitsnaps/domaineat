<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLookupStore } from '@/stores/lookup'
import { useAuthStore } from '@/stores/auth'
import DomainLookupCard from '@/components/DomainLookupCard.vue'
import TldSelector from '@/components/TldSelector.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'

const store = useLookupStore()
const auth = useAuthStore()

const searchInput = ref('')
const selectedTlds = ref<string[]>([...store.defaultTlds])
const mode = ref<'search' | 'validate'>('search')

const inputPlaceholder = computed(() =>
	mode.value === 'search'
		? 'e.g. mybrand (SLD only, no TLD)'
		: 'e.g. mybrand.com (full domain)'
)

function handleSubmit() {
	const input = searchInput.value.trim().toLowerCase().replace(/^www\./, '')
	if (!input) return

	if (mode.value === 'validate') {
		store.validateDomain(input)
	} else {
		// Extract SLD if user entered a full domain
		const sld = input.split('.')[0] || input
		store.searchDomain(sld, selectedTlds.value)
	}
}

function handleCardClick(result: any) {
	// Switch to validate mode for deep-dive
	mode.value = 'validate'
	searchInput.value = result.domain
	store.validateDomain(result.domain)
}

const isLoggedIn = computed(() => auth.isLoggedIn)
</script>

<template>
	<div class="domain-search-view container-fluid py-4">
		<div class="row justify-content-center">
			<div class="col-lg-10 col-xl-8">
				<!-- Header -->
				<div class="text-center mb-4">
					<h2 class="fw-bold">
						<i class="bi bi-search me-2" style="color: var(--primary);"></i>
						Domain Lookup
					</h2>
					<p class="text-muted">
						Check domain availability across multiple TLDs — no sign-up required
					</p>
					<p v-if="!isLoggedIn" class="small text-info">
						<i class="bi bi-info-circle me-1"></i>
						Anonymous: 20 lookups/day.
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
								@click="mode = 'search'"
							>
								<i class="bi bi-grid me-1"></i>Multi-TLD Search
							</button>
							<button
								class="btn"
								:class="mode === 'validate' ? 'btn-primary' : 'btn-outline-primary'"
								@click="mode = 'validate'"
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
								:disabled="store.loading || !searchInput.trim()"
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

				<!-- Search Results (multi-TLD grid) -->
				<div v-if="!store.loading && store.searchResult" class="mt-3">
					<h5 class="mb-3">
						Results for <strong>{{ store.searchResult.sld }}</strong>
						<span class="badge bg-primary ms-2">{{ store.searchResult.results.length }} TLDs</span>
					</h5>
					<div class="row g-3">
						<div
							v-for="result in store.searchResult.results"
							:key="result.domain"
							class="col-sm-6 col-md-4 col-lg-3"
						>
							<DomainLookupCard
								:result="result"
								@click="handleCardClick(result)"
							/>
						</div>
					</div>
				</div>

				<!-- Validate Result (single domain deep-dive) -->
				<div v-if="!store.loading && store.validateResult" class="mt-3">
					<div class="card shadow-sm">
						<div class="card-header d-flex justify-content-between align-items-center">
							<h5 class="mb-0">{{ store.validateResult.domain }}</h5>
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
									<div v-if="store.validateResult.whois.registrar" class="col-sm-6">
										<div class="small text-muted">Registrar</div>
										<div class="fw-semibold">{{ store.validateResult.whois.registrar }}</div>
									</div>
									<div v-if="store.validateResult.whois.creationDate" class="col-sm-6">
										<div class="small text-muted">Created</div>
										<div class="fw-semibold">{{ store.validateResult.whois.creationDate }}</div>
									</div>
									<div v-if="store.validateResult.whois.expiryDate" class="col-sm-6">
										<div class="small text-muted">Expires</div>
										<div class="fw-semibold">{{ store.validateResult.whois.expiryDate }}</div>
									</div>
									<div v-if="store.validateResult.whois.status?.length" class="col-sm-6">
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

							<!-- DNS Info -->
							<div v-if="store.validateResult.dns">
								<h6 class="fw-semibold mb-3">
									<i class="bi bi-hdd-network me-2"></i>DNS Check
								</h6>
								<div class="row g-3">
									<div class="col-sm-6">
										<div class="small text-muted">Resolves</div>
										<div class="fw-semibold">
											<span :class="store.validateResult.dns.resolved ? 'text-success' : 'text-danger'">
												{{ store.validateResult.dns.resolved ? 'Yes' : 'No' }}
											</span>
										</div>
									</div>
									<div v-if="store.validateResult.dns.ip" class="col-sm-6">
										<div class="small text-muted">IP Address</div>
										<code>{{ store.validateResult.dns.ip }}</code>
									</div>
									<div v-if="store.validateResult.dns.ssl_expiry" class="col-sm-6">
										<div class="small text-muted">SSL Expiry</div>
										<div class="fw-semibold">{{ store.validateResult.dns.ssl_expiry }}</div>
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
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.domain-search-view {
	min-height: 80vh;
}
</style>
