<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useLedgerStore } from '@/stores/ledger'
import { useDomainsStore } from '@/stores/domains'
import LedgerEntryModal from '@/components/LedgerEntryModal.vue'
import type { LedgerEntry, TransactionType } from '@/types'

const store = useLedgerStore()
const domains = useDomainsStore()

const USER_ID = 1

// Modal state
const showModal = ref(false)
const editingEntry = ref<LedgerEntry | null>(null)

// Pagination
const page = ref(1)
const perPage = 15

onMounted(async () => {
  await Promise.all([store.fetchEntries(), domains.fetchDomains(USER_ID)])
})

// Paginated entries
const paginatedEntries = computed(() => {
  const start = (page.value - 1) * perPage
  return store.filteredEntries.slice(start, start + perPage)
})
const totalPages = computed(() => Math.ceil(store.filteredEntries.length / perPage))

// Format helpers
function formatCurrency(val: number) {
  return `$${val.toFixed(2)}`
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
function typeBadgeClass(type: TransactionType) {
  const map: Record<string, string> = {
    purchase: 'bg-danger text-white',
    renewal: 'bg-warning text-dark',
    transfer: 'bg-info text-white',
    sale: 'bg-success text-white',
    listing_fee: 'bg-secondary text-white',
    other: 'bg-light text-dark',
  }
  return map[type] || 'bg-light text-dark'
}
function domainName(domainId: number) {
  const d = domains.domains.find((d) => d.id === domainId)
  return d ? d.domain_name : `#${domainId}`
}

// Modal handlers
function openAdd() {
  editingEntry.value = null
  showModal.value = true
}
function openEdit(entry: LedgerEntry) {
  editingEntry.value = entry
  showModal.value = true
}
function closeModal() {
  showModal.value = false
  editingEntry.value = null
}
async function handleSave(payload: any) {
  if (editingEntry.value) {
    await store.updateEntry(editingEntry.value.id, payload)
  } else {
    await store.createEntry(payload)
  }
  closeModal()
}
async function handleDelete(entry: LedgerEntry) {
  if (confirm(`Delete this ${entry.transaction_type} entry ($${Number(entry.amount).toFixed(2)})?`)) {
    await store.deleteEntry(entry.id)
  }
}

// Type options for filter
const typeOptions: TransactionType[] = ['purchase', 'renewal', 'transfer', 'sale', 'listing_fee', 'other']
</script>

<template>
  <div class="ledger-view">
    <!-- Summary Cards -->
    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">Total Costs</div>
            <div class="h4 mb-0 text-danger">{{ formatCurrency(store.totalCosts) }}</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">Total Revenue</div>
            <div class="h4 mb-0 text-success">{{ formatCurrency(store.totalRevenue) }}</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">Net Profit</div>
            <div class="h4 mb-0" :class="store.netProfit >= 0 ? 'text-success' : 'text-danger'">
              {{ store.netProfit >= 0 ? '+' : '' }}{{ formatCurrency(store.netProfit) }}
            </div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">Monthly Burn Rate</div>
            <div class="h4 mb-0 text-warning">{{ formatCurrency(store.burnRate) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Financial Indicators Row -->
    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">ROI</div>
            <div class="h4 mb-0" :class="store.roi >= 0 ? 'text-success' : 'text-danger'">
              {{ store.roi.toFixed(1) }}%
            </div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">NAV (Held Domains)</div>
            <div class="h4 mb-0" style="color: var(--indigo);">{{ formatCurrency(store.nav) }}</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">Transactions</div>
            <div class="h4 mb-0" style="color: var(--dark);">{{ store.filteredEntries.length }}</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">Sales Count</div>
            <div class="h4 mb-0" style="color: var(--dark);">{{ store.countByType['sale'] || 0 }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters + Actions -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body py-3">
        <div class="row g-2 align-items-center">
          <div class="col-auto">
            <input
              v-model="store.searchQuery"
              type="text"
              class="form-control form-control-sm"
              placeholder="Search notes, amount…"
              style="width: 180px"
            />
          </div>
          <div class="col-auto">
            <select v-model="store.filterType" class="form-select form-select-sm" style="width: 140px">
              <option value="">All Types</option>
              <option v-for="t in typeOptions" :key="t" :value="t">{{ t.replace('_', ' ') }}</option>
            </select>
          </div>
          <div class="col-auto">
            <select v-model="store.filterDomainId" class="form-select form-select-sm" style="width: 180px">
              <option :value="null">All Domains</option>
              <option v-for="d in domains.domains" :key="d.id" :value="d.id">{{ d.domain_name }}</option>
            </select>
          </div>
          <div class="col-auto">
            <input v-model="store.filterDateFrom" type="date" class="form-control form-control-sm" style="width: 150px" />
          </div>
          <div class="col-auto">
            <span class="text-muted small">to</span>
          </div>
          <div class="col-auto">
            <input v-model="store.filterDateTo" type="date" class="form-control form-control-sm" style="width: 150px" />
          </div>
          <div class="col-auto">
            <button class="btn btn-outline-secondary btn-sm" @click="store.clearFilters" v-if="store.searchQuery || store.filterType || store.filterDomainId || store.filterDateFrom || store.filterDateTo">
              ✕ Clear
            </button>
          </div>
          <div class="col-auto ms-auto">
            <button class="btn btn-sm text-white" style="background: var(--indigo);" @click="openAdd">
              + Add Entry
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Transaction Table -->
    <div class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div v-if="store.loading" class="text-center py-5 text-muted">Loading…</div>
        <div v-else-if="store.filteredEntries.length === 0" class="text-center py-5 text-muted">
          <div class="mb-2">No ledger entries found.</div>
          <button class="btn btn-sm btn-outline-primary" @click="openAdd">+ Add your first entry</button>
        </div>
        <div v-else class="table-responsive">
          <table class="table table-sm table-hover mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>Date</th>
                <th>Domain</th>
                <th>Type</th>
                <th class="text-end">Amount</th>
                <th>Notes</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in paginatedEntries" :key="entry.id">
                <td class="small">{{ formatDate(entry.transaction_date) }}</td>
                <td class="small fw-medium">{{ domainName(entry.domain_id) }}</td>
                <td class="small">
                  <span class="badge rounded-pill" :class="typeBadgeClass(entry.transaction_type)">
                    {{ entry.transaction_type.replace('_', ' ') }}
                  </span>
                </td>
                <td class="small text-end fw-medium" :class="entry.transaction_type === 'sale' ? 'text-success' : 'text-danger'">
                  {{ entry.transaction_type === 'sale' ? '+' : '-' }}{{ formatCurrency(Number(entry.amount)) }}
                </td>
                <td class="small text-muted">{{ entry.notes || '—' }}</td>
                <td class="small text-end">
                  <button class="btn btn-sm btn-link text-muted p-0 me-2" @click="openEdit(entry)" title="Edit">✎</button>
                  <button class="btn btn-sm btn-link text-danger p-0" @click="handleDelete(entry)" title="Delete">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="d-flex justify-content-between align-items-center px-3 py-2 border-top">
          <span class="text-muted small">
            Showing {{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, store.filteredEntries.length) }} of {{ store.filteredEntries.length }}
          </span>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" :disabled="page === 1" @click="page--">←</button>
            <button class="btn btn-outline-secondary" :disabled="page === totalPages" @click="page++">→</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Ledger Entry Modal -->
    <LedgerEntryModal
      v-if="showModal"
      :entry="editingEntry"
      @save="handleSave"
      @close="closeModal"
    />
  </div>
</template>

<style scoped>
.ledger-view {
  --indigo: #6366f1;
  --dark: #1e293b;
}
</style>
