<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DomainModal from '@/components/DomainModal.vue'
import { useLookupStore } from '@/stores/lookup'
import api from '@/lib/api'
import { appraise } from '@/lib/appraise'
import AppraisalBadge from '@/components/AppraisalBadge.vue'
import DecisionSignals from '@/components/DecisionSignals.vue'
import SmartCtaButton from '@/components/SmartCtaButton.vue'
import { getDecisionSignals } from '@/lib/decision-signals'
import { getSmartCta } from '@/lib/smart-ctas'
import type { Domain, LedgerEntry, Prospect, DnsResult } from '@/types'

const route = useRoute()
const router = useRouter()
const lookupStore = useLookupStore()

const showOutreachDraft = ref(false)

const domainId = computed(() => Number(route.params.id))

const domain = ref<Domain | null>(null)
const ledgerEntries = ref<LedgerEntry[]>([])
const prospects = ref<Prospect[]>([])
const dnsResult = ref<DnsResult | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Edit modal
const showEditModal = ref(false)

onMounted(async () => {
	try {
		const [domainRes, ledgerRes, prospectsRes] = await Promise.all([
			api.get(`/domains/${domainId.value}`),
			api.get(`/domains/${domainId.value}/ledger`),
			api.get(`/domains/${domainId.value}/prospects`),
		])

		domain.value = domainRes.data
		ledgerEntries.value = ledgerRes.data
		prospects.value = prospectsRes.data
	} catch (e: any) {
		error.value = e.response?.data?.error || e.message
	} finally {
		loading.value = false
	}
})

function daysUntilExpiry(dateStr: string): number {
	const expiry = new Date(dateStr)
	const now = new Date()
	return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function statusBadgeClass(status: string) {
	const map: Record<string, string> = {
		active: 'bg-success-subtle text-success',
		expired: 'bg-danger-subtle text-danger',
		sold: 'bg-primary-subtle text-primary',
		pending_delete: 'bg-warning-subtle text-warning',
		parked: 'bg-secondary-subtle text-secondary',
	}
	return map[status] || 'bg-secondary-subtle text-secondary'
}

async function handleSave(payload: any) {
	if (!domain.value) return
	try {
		const res = await api.put(`/domains/${domain.value.id}`, payload)
		domain.value = res.data
	} catch {
		// Silently fail — error handled by api interceptor
	}
	showEditModal.value = false
}

async function checkDns() {
	if (!domain.value) return
	dnsResult.value = null
	try {
		const res = await api.get(`/domains/${domain.value.id}/dns-check`)
		dnsResult.value = res.data
	} catch {
		// Silently fail — DNS check is best-effort
	}
}

async function fetchLiveRdap() {
	if (!domain.value) return
	await lookupStore.validateDomain(domain.value.domain_name)
}

async function handleDelete() {
	if (!domain.value) return
	if (!confirm(`Delete ${domain.value.domain_name}? This cannot be undone.`)) return
	try {
		await api.delete(`/domains/${domain.value.id}`)
		router.push({ name: 'domains' })
	} catch {
		// Error handled by api interceptor
	}
}

function formatDate(d: string) {
	return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const appraisal = computed(() => {
	if (!domain.value) return null
	return appraise(domain.value.domain_name)
})

const isHighValue = computed(() => {
	if (!appraisal.value) return false
	return appraisal.value.grade === 'A' || appraisal.value.grade === 'A+' || appraisal.value.range.low >= 5000
})

// ─── Decision Signals ──────────────────────────────────────────

const decisionSignals = computed(() => {
	if (!domain.value || !appraisal.value) return []
	return getDecisionSignals({
		domain: domain.value,
		appraisal: appraisal.value,
		prospectCount: prospects.value.length,
	})
})

// ─── Smart CTA ─────────────────────────────────────────────────

const hasUncontactedProspects = computed(() => {
	return prospects.value.some(p => p.outreach_status === 'uncontacted')
})

const smartCta = computed(() => {
	if (!domain.value || !appraisal.value) return null
	return getSmartCta({
		domain: domain.value,
		appraisal: appraisal.value,
		prospectCount: prospects.value.length,
		uncontactedProspects: hasUncontactedProspects.value,
	})
})

function handleCtaAction(key: string) {
	switch (key) {
		case 'find_prospects':
			scrollToProspects()
			break
		case 'start_outreach':
			showOutreachDraft.value = true
			break
		case 'renew':
			// Could navigate to a renewal flow — for now, open edit modal
			showEditModal.value = true
			break
		default:
			break
	}
}

function scrollToProspects() {
	document.querySelector('#prospects-section')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
	<div class="domain-detail-view">
		<!-- Loading -->
		<div class="text-center py-5" v-if="loading">
			<div class="spinner-border spinner-border-sm text-primary" role="status"></div>
			<p class="mt-2 text-muted small">Loading domain…</p>
		</div>

		<!-- Error -->
		<div class="alert alert-danger" v-if="error">
			<i class="bi bi-exclamation-triangle me-1"></i>{{ error }}
			<button class="btn btn-outline-secondary btn-sm ms-3" @click="router.push({ name: 'domains' })">\u2190 Back to Domains</button>
		</div>

		<template v-if="domain && !loading">
			<!-- Header -->
			<div class="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
				<div>
					<nav aria-label="breadcrumb" class="mb-2">
						<ol class="breadcrumb small mb-0">
							<li class="breadcrumb-item"><router-link to="/domains">Domains</router-link></li>
							<li class="breadcrumb-item active">{{ domain.domain_name }}</li>
						</ol>
					</nav>
					<h1 class="h3 mb-1" style="font-family: var(--font-display);">
						{{ domain.domain_name }}
					</h1>
					<div class="d-flex gap-2 mt-2">
						<span class="badge rounded-pill" :class="statusBadgeClass(domain.status)">{{ domain.status.replace('_', ' ') }}</span>
						<span class="badge rounded-pill"
							:class="daysUntilExpiry(domain.expiry_date) <= 0 ? 'bg-danger-subtle text-danger' : daysUntilExpiry(domain.expiry_date) <= 30 ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success'">
							{{ daysUntilExpiry(domain.expiry_date) <= 0 ? `${Math.abs(daysUntilExpiry(domain.expiry_date))}d overdue` : `${daysUntilExpiry(domain.expiry_date)}d to expiry` }}
						</span>
						<DecisionSignals :signals="decisionSignals" />
					</div>
				</div>
				<div class="d-flex gap-2">
					<SmartCtaButton v-if="smartCta" :cta="smartCta" @action="handleCtaAction" />
					<button class="btn btn-outline-secondary btn-sm" @click="showEditModal = true">
						<i class="bi bi-pencil me-1"></i>Edit
					</button>
					<button class="btn btn-outline-danger btn-sm" @click="handleDelete">
						<i class="bi bi-trash3 me-1"></i>Delete
					</button>
				</div>
			</div>

			<!-- Info cards -->
			<div class="row g-3 mb-4">
				<!-- Registration -->
				<div class="col-md-6">
					<div class="card border-0 shadow-sm h-100">
						<div class="card-body">
							<h6 class="text-muted small fw-semibold text-uppercase mb-3">Registration</h6>
							<table class="table table-sm table-borderless mb-0">
								<tr>
									<td class="text-muted small ps-0" style="width:40%;">Registrar</td>
									<td class="fw-medium small">{{ domain.registrar }}</td>
								</tr>
								<tr>
									<td class="text-muted small ps-0">Acquired</td>
									<td class="small">{{ domain.acquisition_date ? formatDate(domain.acquisition_date) : '\u2014' }}</td>
								</tr>
								<tr>
									<td class="text-muted small ps-0">Expiry</td>
									<td class="small">{{ formatDate(domain.expiry_date) }}</td>
								</tr>
								<tr>
									<td class="text-muted small ps-0">Purchase Price</td>
									<td class="small">${{ Number(domain.acquisition_cost).toFixed(2) }}</td>
								</tr>
								<tr>
									<td class="text-muted small ps-0">Renewal Cost</td>
									<td class="small">${{ Number(domain.renewal_cost).toFixed(2) }}/yr</td>
								</tr>
							</table>
						</div>
					</div>
				</div>

				<!-- DNS & Nameservers -->
				<div class="col-md-6">
					<div class="card border-0 shadow-sm h-100">
						<div class="card-body">
							<div class="d-flex justify-content-between align-items-center mb-3">
								<h6 class="text-muted small fw-semibold text-uppercase mb-0">DNS & Nameservers</h6>
								<button class="btn btn-outline-primary btn-sm" @click="checkDns">
									<i class="bi bi-arrow-clockwise me-1"></i>Check
								</button>
							</div>

							<div v-if="domain.nameservers" class="mb-2">
								<div class="text-muted small mb-1">Configured Nameservers</div>
								<div v-for="ns in domain.nameservers.split(',').map(n => n.trim())" :key="ns" class="small">
									<i class="bi bi-server me-1 text-muted"></i>{{ ns }}
								</div>
							</div>
							<div v-else class="text-muted small">No nameservers configured</div>

							<!-- DNS check result -->
							<div v-if="dnsResult" class="mt-3 pt-3 border-top">
								<div class="d-flex align-items-center mb-2">
									<i class="bi me-1" :class="dnsResult.resolved ? 'bi-check-circle text-success' : 'bi-x-circle text-danger'"></i>
									<span class="small fw-medium">{{ dnsResult.resolved ? 'Resolves' : 'Does not resolve' }}</span>
								</div>
								<div v-if="dnsResult.ip" class="small text-muted">IP: {{ dnsResult.ip }}</div>
								<div v-if="dnsResult.ssl_expiry" class="small text-muted">
									SSL Expiry: {{ formatDate(dnsResult.ssl_expiry) }}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

		<!-- Appraisal & AI Outreach -->
			<div class="row g-3 mb-4">
				<!-- Appraisal Card -->
				<div class="col-md-6">
					<div class="card border-0 shadow-sm h-100">
						<div class="card-body">
							<h6 class="text-muted small fw-semibold text-uppercase mb-3">
								<i class="bi bi-graph-up me-1"></i>Appraisal
							</h6>
							<div v-if="appraisal" class="text-center py-2">
								<AppraisalBadge :grade="appraisal.grade" :range="appraisal.range" size="lg" />
								<div class="mt-2 text-muted small">
									Estimated value: ${{ appraisal.range.low.toLocaleString() }} – ${{ appraisal.range.high.toLocaleString() }}
								</div>
								<div v-if="isHighValue" class="mt-2">
									<span class="badge bg-warning text-dark">
										<i class="bi bi-stars me-1"></i>High Value Domain
									</span>
								</div>
								<!-- Signal Breakdown -->
								<div class="mt-3 text-start">
									<div class="small text-muted fw-semibold mb-2">Signal Breakdown</div>
									<div v-for="(signal, key) in appraisal.signals" :key="key" class="d-flex justify-content-between align-items-center py-1 border-bottom">
										<span class="small text-capitalize">{{ key }}</span>
										<span class="small">
											<i class="bi me-1" :class="signal.passed ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'"></i>
											<span class="text-muted">{{ signal.label }}</span>
										</span>
									</div>
								</div>
							</div>
							<div v-else class="text-muted small">Loading appraisal…</div>
						</div>
					</div>
				</div>
				<!-- AI Outreach CTA Card -->
				<div class="col-md-6">
					<div class="card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, var(--bs-primary-bg-subtle, #e7f1ff) 0%, #fff 100%);">
						<div class="card-body d-flex flex-column justify-content-center">
							<h6 class="text-muted small fw-semibold text-uppercase mb-3">
								<i class="bi bi-robot me-1"></i>AI Outreach
							</h6>
							<p class="small mb-3">
								Let our AI agent find potential buyers, draft personalized outreach emails, and track responses — all automatically.
							</p>
							<div class="d-flex gap-2 flex-wrap">
								<button
									class="btn btn-primary btn-sm"
									@click="showOutreachDraft = true"
								>
									<i class="bi bi-send me-1"></i>Start AI Outreach
								</button>
								<button
									v-if="isHighValue && prospects.length === 0"
									class="btn btn-outline-primary btn-sm"
									@click="scrollToProspects"
								>
									<i class="bi bi-search me-1"></i>Find Prospects
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Live RDAP Data -->
			<div class="card border-0 shadow-sm mb-4">
				<div class="card-body">
					<div class="d-flex justify-content-between align-items-center mb-3">
						<h6 class="text-muted small fw-semibold text-uppercase mb-0">
							<i class="bi bi-broadcast me-1"></i>Live RDAP Data
						</h6>
						<button
							class="btn btn-outline-primary btn-sm"
							@click="fetchLiveRdap"
							:disabled="lookupStore.loading"
						>
							<span v-if="lookupStore.loading" class="spinner-border spinner-border-sm me-1"></span>
							<i v-else class="bi bi-arrow-clockwise me-1"></i>Fetch Live
						</button>
					</div>

					<!-- Error -->
					<div v-if="lookupStore.error" class="alert alert-warning py-2 small mb-0">
						<i class="bi bi-exclamation-triangle me-1"></i>{{ lookupStore.error }}
					</div>

					<!-- No data yet -->
					<p v-if="!lookupStore.validateResult && !lookupStore.loading && !lookupStore.error" class="text-muted small mb-0">
						Click "Fetch Live" to query the RDAP registry for real-time data.
					</p>

					<!-- Result -->
					<div v-if="lookupStore.validateResult" class="mt-2">
						<div class="row g-3">
							<div class="col-sm-6">
								<div class="small text-muted">Availability</div>
								<span class="badge" :class="lookupStore.validateResult.available ? 'bg-success' : 'bg-secondary'">
									{{ lookupStore.validateResult.available ? 'Available' : 'Registered' }}
								</span>
							</div>
							<div v-if="lookupStore.validateResult.whois?.registrar" class="col-sm-6">
								<div class="small text-muted">Registrar (RDAP)</div>
								<div class="small fw-semibold">{{ lookupStore.validateResult.whois.registrar }}</div>
							</div>
							<div v-if="lookupStore.validateResult.whois?.creationDate" class="col-sm-6">
								<div class="small text-muted">Created (RDAP)</div>
								<div class="small fw-semibold">{{ formatDate(lookupStore.validateResult.whois.creationDate) }}</div>
							</div>
							<div v-if="lookupStore.validateResult.whois?.expiryDate" class="col-sm-6">
								<div class="small text-muted">Expires (RDAP)</div>
								<div class="small fw-semibold">{{ formatDate(lookupStore.validateResult.whois.expiryDate) }}</div>
							</div>
							<div v-if="lookupStore.validateResult.whois?.status?.length" class="col-12">
								<div class="small text-muted mb-1">Registry Status</div>
								<span v-for="s in lookupStore.validateResult.whois.status" :key="s" class="badge bg-light text-dark me-1 mb-1">{{ s }}</span>
							</div>
							<div v-if="lookupStore.validateResult.whois?.nameservers?.length" class="col-12">
								<div class="small text-muted mb-1">RDAP Nameservers</div>
								<span v-for="ns in lookupStore.validateResult.whois.nameservers" :key="ns" class="badge bg-info text-dark me-1">{{ ns }}</span>
							</div>
							<div v-if="lookupStore.validateResult.dns" class="col-12 mt-2 pt-2 border-top">
								<div class="small text-muted mb-1">Live DNS</div>
								<span :class="lookupStore.validateResult.dns.resolved ? 'text-success' : 'text-danger'" class="small fw-semibold me-3">
									{{ lookupStore.validateResult.dns.resolved ? 'Resolves' : 'No resolution' }}
								</span>
								<span v-if="lookupStore.validateResult.dns.ip" class="small text-muted">IP: <code>{{ lookupStore.validateResult.dns.ip }}</code></span>
								<span v-if="lookupStore.validateResult.dns.ssl_expiry" class="small text-muted ms-3">SSL: {{ formatDate(lookupStore.validateResult.dns.ssl_expiry) }}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Ledger entries -->
			<div class="card border-0 shadow-sm mb-4">
				<div class="card-body">
					<div class="d-flex justify-content-between align-items-center mb-3">
						<h6 class="text-muted small fw-semibold text-uppercase mb-0">Ledger Entries</h6>
						<span class="badge bg-light text-dark">{{ ledgerEntries.length }}</span>
					</div>
					<div v-if="ledgerEntries.length" class="table-responsive">
						<table class="table table-sm table-hover mb-0">
							<thead class="table-light">
								<tr>
									<th>Date</th>
									<th>Type</th>
									<th>Amount</th>
									<th>Notes</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="entry in ledgerEntries" :key="entry.id">
									<td class="small">{{ formatDate(entry.transaction_date) }}</td>
									<td class="small"><span class="badge rounded-pill bg-light text-dark">{{ entry.transaction_type }}</span></td>
									<td class="small" :class="entry.transaction_type === 'sale' ? 'text-success' : 'text-danger'">
										{{ entry.transaction_type === 'sale' ? '+' : '-' }}${{ Number(entry.amount).toFixed(2) }}
									</td>
									<td class="small text-muted">{{ entry.notes || '\u2014' }}</td>
								</tr>
							</tbody>
						</table>
					</div>
					<p v-else class="text-muted small mb-0">No ledger entries for this domain.</p>
				</div>
			</div>

			<!-- Prospects -->
			<div id="prospects-section" class="card border-0 shadow-sm mb-4">
				<div class="card-body">
					<div class="d-flex justify-content-between align-items-center mb-3">
						<h6 class="text-muted small fw-semibold text-uppercase mb-0">Prospects</h6>
						<span class="badge bg-light text-dark">{{ prospects.length }}</span>
					</div>
					<div v-if="prospects.length" class="table-responsive">
						<table class="table table-sm table-hover mb-0">
							<thead class="table-light">
								<tr>
									<th>Domain</th>
									<th>Company</th>
									<th>Email</th>
									<th>Status</th>
									<th>Last Contact</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="p in prospects" :key="p.id">
									<td class="small fw-medium">{{ p.prospect_domain }}</td>
									<td class="small">{{ p.company_name || '\u2014' }}</td>
									<td class="small">{{ p.contact_email || '\u2014' }}</td>
									<td class="small"><span class="badge rounded-pill bg-light text-dark">{{ p.outreach_status }}</span></td>
									<td class="small text-muted">{{ p.last_contact_date ? formatDate(p.last_contact_date) : '\u2014' }}</td>
								</tr>
							</tbody>
						</table>
					</div>
					<p v-else class="text-muted small mb-0">No prospects for this domain.</p>
				</div>
			</div>

			<!-- Edit Modal -->
			<DomainModal
				v-if="showEditModal"
				:domain="domain"
				@save="handleSave"
				@close="showEditModal = false"
			/>
		</template>
	</div>
</template>

<style scoped>
.domain-detail-view {
	max-width: 1000px;
}

.card {
	border-radius: 0.75rem;
}

.breadcrumb-item a {
	color: var(--primary);
	text-decoration: none;
}

.table th {
	font-family: var(--font-body);
	font-weight: 600;
	font-size: 0.8125rem;
	color: var(--gray-600);
	text-transform: uppercase;
	letter-spacing: 0.03em;
}

.badge {
	font-weight: 500;
	font-size: 0.75rem;
}

.btn-outline-primary {
	color: var(--primary);
	border-color: var(--primary);
}

.btn-outline-primary:hover {
	background: var(--primary);
	border-color: var(--primary);
	color: #fff;
}
</style>
