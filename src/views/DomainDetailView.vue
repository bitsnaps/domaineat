<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DomainModal from '@/components/DomainModal.vue'
import type { Domain, LedgerEntry, Prospect, DnsResult } from '@/types'

const API_BASE = '/api'
const route = useRoute()
const router = useRouter()

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
      fetch(`${API_BASE}/domains/${domainId.value}`),
      fetch(`${API_BASE}/domains/${domainId.value}/ledger`),
      fetch(`${API_BASE}/domains/${domainId.value}/prospects`),
    ])

    if (!domainRes.ok) throw new Error(`Domain not found (HTTP ${domainRes.status})`)
    domain.value = await domainRes.json()
    if (ledgerRes.ok) ledgerEntries.value = await ledgerRes.json()
    if (prospectsRes.ok) prospects.value = await prospectsRes.json()
  } catch (e: any) {
    error.value = e.message
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
  const res = await fetch(`${API_BASE}/domains/${domain.value.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (res.ok) domain.value = await res.json()
  showEditModal.value = false
}

async function checkDns() {
  if (!domain.value) return
  dnsResult.value = null
  try {
    const res = await fetch(`${API_BASE}/domains/${domain.value.id}/dns-check`)
    if (res.ok) dnsResult.value = await res.json()
  } catch {
    // Silently fail — DNS check is best-effort
  }
}

async function handleDelete() {
  if (!domain.value) return
  if (!confirm(`Delete ${domain.value.domain_name}? This cannot be undone.`)) return
  const res = await fetch(`${API_BASE}/domains/${domain.value.id}`, { method: 'DELETE' })
  if (res.ok) router.push({ name: 'domains' })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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
      <button class="btn btn-outline-secondary btn-sm ms-3" @click="router.push({ name: 'domains' })">← Back to Domains</button>
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
          </div>
        </div>
        <div class="d-flex gap-2">
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
                  <td class="small">{{ domain.acquisition_date ? formatDate(domain.acquisition_date) : '—' }}</td>
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
                  <td class="small text-muted">{{ entry.notes || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-muted small mb-0">No ledger entries for this domain.</p>
        </div>
      </div>

      <!-- Prospects -->
      <div class="card border-0 shadow-sm mb-4">
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
                  <td class="small">{{ p.company_name || '—' }}</td>
                  <td class="small">{{ p.contact_email || '—' }}</td>
                  <td class="small"><span class="badge rounded-pill bg-light text-dark">{{ p.outreach_status }}</span></td>
                  <td class="small text-muted">{{ p.last_contact_date ? formatDate(p.last_contact_date) : '—' }}</td>
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
