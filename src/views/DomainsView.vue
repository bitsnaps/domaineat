<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useDomainsStore } from '@/stores/domains'
import { useWatchlistStore } from '@/stores/watchlist'
import { useWishlistStore } from '@/stores/wishlist'
import DomainModal from '@/components/DomainModal.vue'
import CsvImportModal from '@/components/CsvImportModal.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import EmptyState from '@/components/EmptyState.vue'
import SmartFolderBar from '@/components/SmartFolderBar.vue'
import type { Domain, DomainStatus, SmartFolderKey } from '@/types'

const store = useDomainsStore()
const watchlistStore = useWatchlistStore()
const wishlistStore = useWishlistStore()

// Modal state
const showModal = ref(false)
const showCsvModal = ref(false)
const editingDomain = ref<Domain | null>(null)

// Selection state
const selectedIds = ref<number[]>([])
const selectAll = ref(false)

const hasSelection = computed(() => selectedIds.value.length > 0)
const selectedCount = computed(() => selectedIds.value.length)

function handleFolderSelect(folder: SmartFolderKey) {
	store.filterSmartFolder = folder
}

function toggleSelectAll() {
	if (selectAll.value) {
		selectedIds.value = store.pagedDomains.map(d => d.id)
	} else {
		selectedIds.value = []
	}
}

function toggleSelect(id: number) {
	const idx = selectedIds.value.indexOf(id)
	if (idx === -1) selectedIds.value.push(id)
	else selectedIds.value.splice(idx, 1)
	selectAll.value = selectedIds.value.length === store.pagedDomains.length
}

function clearSelection() {
	selectedIds.value = []
	selectAll.value = false
}

onMounted(() => {
	if (store.domains.length === 0) store.fetchDomains()
})

function openAdd() {
  editingDomain.value = null
  showModal.value = true
}

function openEdit(domain: Domain) {
  editingDomain.value = domain
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingDomain.value = null
}

async function handleSave(payload: any) {
  if (editingDomain.value) {
    await store.updateDomain(editingDomain.value.id, payload)
  } else {
    await store.createDomain(payload)
  }
  closeModal()
}

async function handleCsvImport(domains: any[]) {
  for (const payload of domains) {
    await store.createDomain(payload)
  }
  showCsvModal.value = false
}

async function handleDelete(domain: Domain) {
	if (confirm(`Delete ${domain.domain_name}? This cannot be undone.`)) {
		await store.deleteDomain(domain.id)
		selectedIds.value = selectedIds.value.filter(id => id !== domain.id)
	}
}

async function handleBulkDelete() {
	if (!selectedIds.value.length) return
	const count = selectedIds.value.length
	if (!confirm(`Delete ${count} domain${count > 1 ? 's' : ''}? This cannot be undone.`)) return
	await store.bulkDelete(selectedIds.value)
	clearSelection()
}

async function handleAddToWatchlist() {
	if (!selectedIds.value.length) return
	const domains = store.domains.filter(d => selectedIds.value.includes(d.id))
	let added = 0
	for (const d of domains) {
		const ok = await watchlistStore.addToWatchlist({
			domain_name: d.domain_name,
			tld: store.getTld(d.domain_name).replace('.', ''),
			notes: 'Added from portfolio',
		})
		if (ok) added++
	}
	if (added > 0) clearSelection()
}

async function handleAddToWishlist() {
	if (!selectedIds.value.length) return
	const domains = store.domains.filter(d => selectedIds.value.includes(d.id))
	let added = 0
	for (const d of domains) {
		const ok = await wishlistStore.addToWishlist({
			domain_name: d.domain_name,
			tld: store.getTld(d.domain_name).replace('.', ''),
			priority: 'medium',
			notes: 'Added from portfolio',
		})
		if (ok) added++
	}
	if (added > 0) clearSelection()
}

async function handleBulkTag() {
	if (!selectedIds.value.length) return
	const tag = prompt('Enter tag to apply to selected domains:')
	if (!tag?.trim()) return
	await store.bulkTag(selectedIds.value, tag.trim())
	clearSelection()
}

async function handleBulkOutreach() {
	if (!selectedIds.value.length) return
	const { useProspectsStore } = await import('@/stores/prospects')
	const prospectsStore = useProspectsStore()
	const domains = store.domains.filter(d => selectedIds.value.includes(d.id))
	let generated = 0
	for (const d of domains) {
		try {
			await prospectsStore.createProspect({
				domain_id: d.id,
				prospect_domain: d.domain_name,
				outreach_status: 'uncontacted',
			})
			generated++
		} catch { /* skip failures */ }
	}
	if (generated > 0) {
		const toast = (await import('@/stores/toast')).useToastStore()
		toast.success(`Generated outreach for ${generated} domain${generated !== 1 ? 's' : ''}`)
	}
	clearSelection()
}

function toggleSort(field: keyof Domain) {
  if (store.sortField === field) {
    store.sortAsc = !store.sortAsc
  } else {
    store.sortField = field
    store.sortAsc = true
  }
}

function sortIcon(field: keyof Domain) {
  if (store.sortField !== field) return 'bi-arrow-down-up'
  return store.sortAsc ? 'bi-arrow-up' : 'bi-arrow-down'
}

function statusBadgeClass(status: DomainStatus) {
  const map: Record<DomainStatus, string> = {
    active: 'bg-success-subtle text-success',
    expired: 'bg-danger-subtle text-danger',
    sold: 'bg-primary-subtle text-primary',
    pending_delete: 'bg-warning-subtle text-warning',
    parked: 'bg-secondary-subtle text-secondary',
  }
  return map[status] || 'bg-secondary-subtle text-secondary'
}

function daysBadge(domain: Domain) {
  const days = store.daysUntilExpiry(domain.expiry_date)
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, class: 'bg-danger-subtle text-danger' }
  if (days <= 30) return { text: `${days}d left`, class: 'bg-warning-subtle text-warning' }
  return { text: `${days}d left`, class: 'bg-success-subtle text-success' }
}
</script>

<template>
  <div class="domains-view">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
      <div>
        <h1 class="h3 mb-1" style="font-family: var(--font-display);">Domain Portfolio</h1>
        <p class="text-muted mb-0 small">{{ store.count }} domains tracked</p>
      </div>
		<div class="d-flex gap-2">
			<button class="btn btn-outline-secondary btn-sm" @click="store.clearFilters" v-if="store.searchQuery || store.filterTld || store.filterRegistrar || store.filterStatus">
				<i class="bi bi-x-circle me-1"></i>Clear filters
			</button>
			<button class="btn btn-outline-secondary btn-sm" @click="store.exportCsv()" :disabled="store.loading || store.domains.length === 0">
				<i class="bi bi-download me-1"></i>Export
			</button>
			<button class="btn btn-outline-primary btn-sm" @click="showCsvModal = true">
				<i class="bi bi-upload me-1"></i>Import CSV
			</button>
			<button class="btn btn-primary btn-sm" @click="openAdd">
				<i class="bi bi-plus-lg me-1"></i>Add Domain
			</button>
		</div>
    </div>

    <!-- Summary cards -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body py-3">
            <div class="text-muted small fw-medium">Total Domains</div>
            <div class="fs-4 fw-semibold" style="color: var(--dark);">{{ store.count }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body py-3">
            <div class="text-muted small fw-medium">Active</div>
            <div class="fs-4 fw-semibold text-success">{{ store.countByStatus['active'] || 0 }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body py-3">
            <div class="text-muted small fw-medium">Expiring Soon</div>
            <div class="fs-4 fw-semibold text-warning">{{ store.expiringSoon.length }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body py-3">
            <div class="text-muted small fw-medium">Renewal Cost/yr</div>
            <div class="fs-4 fw-semibold" style="color: var(--dark);">${{ store.totalRenewalCost.toFixed(2) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Smart Folders -->
<SmartFolderBar
	:active-folder="store.filterSmartFolder"
	:counts="store.smartFolderCounts"
	@select="handleFolderSelect"
	v-if="store.domains.length > 0"
/>

<!-- Filters -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body py-3">
        <div class="row g-2 align-items-center">
          <div class="col-12 col-md-4">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control" placeholder="Search domains…" v-model="store.searchQuery" />
            </div>
          </div>
          <div class="col-6 col-md-2">
            <select class="form-select form-select-sm" v-model="store.filterTld">
              <option value="">All TLDs</option>
              <option v-for="tld in store.tldOptions" :key="tld" :value="tld">{{ tld }}</option>
            </select>
          </div>
          <div class="col-6 col-md-3">
            <select class="form-select form-select-sm" v-model="store.filterRegistrar">
              <option value="">All Registrars</option>
              <option v-for="reg in store.registrarOptions" :key="reg" :value="reg">{{ reg }}</option>
            </select>
          </div>
          <div class="col-6 col-md-2">
            <select class="form-select form-select-sm" v-model="store.filterStatus">
              <option value="">All Status</option>
              <option v-for="s in store.statusOptions" :key="s" :value="s">{{ s.replace('_', ' ') }}</option>
            </select>
          </div>
          <div class="col-6 col-md-1 text-end">
            <span class="badge bg-light text-dark">{{ store.filteredDomains.length }} results</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
	<table class="table table-hover align-middle mb-0" v-if="!store.loading && store.pagedDomains.length">
		<thead class="table-light">
			<tr>
				<th style="width: 40px;">
					<input type="checkbox" class="form-check-input" v-model="selectAll" @change="toggleSelectAll" />
				</th>
				<th class="cursor-pointer" @click="toggleSort('domain_name')">
					Domain <i class="bi" :class="sortIcon('domain_name')"></i>
				</th>
				<th class="cursor-pointer d-none d-md-table-cell" @click="toggleSort('registrar')">
					Registrar <i class="bi" :class="sortIcon('registrar')"></i>
				</th>
				<th class="d-none d-lg-table-cell">Acquired</th>
				<th class="cursor-pointer" @click="toggleSort('expiry_date')">
					Expires <i class="bi" :class="sortIcon('expiry_date')"></i>
				</th>
				<th class="d-none d-md-table-cell">Cost</th>
				<th>Status</th>
				<th class="text-end">Actions</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="domain in store.pagedDomains" :key="domain.id">
				<td>
					<input
						type="checkbox"
						class="form-check-input"
						:checked="selectedIds.includes(domain.id)"
						@change="toggleSelect(domain.id)"
					/>
				</td>
              <td>
                <router-link :to="{ name: 'domain-detail', params: { id: domain.id } }" class="text-decoration-none">
                  <div class="fw-semibold" style="color: var(--dark);">{{ domain.domain_name }}</div>
                </router-link>
                <div class="text-muted small">{{ store.getTld(domain.domain_name) }}</div>
              </td>
              <td class="d-none d-md-table-cell">{{ domain.registrar }}</td>
              <td class="d-none d-lg-table-cell text-muted small">{{ domain.acquisition_date }}</td>
              <td>
                <div class="small">{{ domain.expiry_date }}</div>
                <span class="badge rounded-pill small" :class="daysBadge(domain).class">{{ daysBadge(domain).text }}</span>
              </td>
              <td class="d-none d-md-table-cell">${{ Number(domain.renewal_cost).toFixed(2) }}/yr</td>
              <td>
                <span class="badge rounded-pill" :class="statusBadgeClass(domain.status)">{{ domain.status.replace('_', ' ') }}</span>
              </td>
              <td class="text-end">
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-secondary" @click="openEdit(domain)" title="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-outline-danger" @click="handleDelete(domain)" title="Delete">
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

 <!-- Empty state -->
 <EmptyState
 v-if="!store.loading && !store.pagedDomains.length"
 :icon="store.searchQuery || store.filterTld || store.filterRegistrar || store.filterStatus ? 'bi-funnel' : 'bi-globe'"
 :message="store.searchQuery || store.filterTld || store.filterRegistrar || store.filterStatus ? 'No domains match your filters' : 'No domains yet. Add your first domain!'"
 :action-label="(!store.searchQuery && !store.filterTld) ? 'Add Domain' : ''"
 @action="openAdd"
 />

 <!-- Loading -->
 <div class="p-4" v-if="store.loading">
 <LoadingSkeleton :lines="6" height="20px" />
 </div>

 <!-- Error -->
 <div class="alert alert-danger m-3" v-if="store.error">
 <i class="bi bi-exclamation-triangle me-1"></i>{{ store.error }}
 </div>
      </div>

      <!-- Pagination -->
      <div class="card-footer bg-white d-flex justify-content-between align-items-center" v-if="store.totalPages > 1">
        <span class="text-muted small">Page {{ store.currentPage }} of {{ store.totalPages }}</span>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" :disabled="store.currentPage <= 1" @click="store.currentPage--">
            <i class="bi bi-chevron-left"></i>
          </button>
          <button class="btn btn-outline-secondary" :disabled="store.currentPage >= store.totalPages" @click="store.currentPage++">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Sticky Bulk Action Bar (Gmail pattern) -->
<div v-if="hasSelection" class="bulk-action-bar">
	<span class="text-muted small me-2">{{ selectedCount }} selected</span>
	<button class="btn btn-sm btn-outline-primary" @click="handleAddToWatchlist">
		<i class="bi bi-eye me-1"></i>Add to Watchlist
	</button>
	<button class="btn btn-sm btn-outline-danger" @click="handleAddToWishlist">
		<i class="bi bi-heart me-1"></i>Add to Wishlist
	</button>
	<button class="btn btn-sm btn-outline-info" @click="handleBulkTag">
		<i class="bi bi-tag me-1"></i>Tag
	</button>
	<button class="btn btn-sm btn-outline-success" @click="handleBulkOutreach">
		<i class="bi bi-chat-dots me-1"></i>Generate Outreach
	</button>
	<button class="btn btn-sm btn-outline-danger" @click="handleBulkDelete">
		<i class="bi bi-trash3 me-1"></i>Delete
	</button>
	<button class="btn btn-sm btn-outline-secondary" @click="clearSelection">
		<i class="bi bi-x-lg me-1"></i>Clear
	</button>
</div>

<!-- Domain Modal -->
    <DomainModal
      v-if="showModal"
      :domain="editingDomain"
      @save="handleSave"
      @close="closeModal"
    />

    <!-- CSV Import Modal -->
    <CsvImportModal
      v-if="showCsvModal"
      @import="handleCsvImport"
      @close="showCsvModal = false"
    />
  </div>
</template>

<style scoped>
.domains-view {
  max-width: 1200px;
}

.cursor-pointer {
  cursor: pointer;
  user-select: none;
}

.card {
  border-radius: 0.75rem;
}

.table th {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom-width: 1px;
}

.table td {
  font-size: 0.875rem;
  vertical-align: middle;
}

.badge {
  font-weight: 500;
  font-size: 0.75rem;
}

.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
}

.btn-primary:hover {
	background: var(--primary-dark);
	border-color: var(--primary-dark);
}

.bulk-action-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 1040;
	background: var(--bs-body-bg, #fff);
	border-top: 1px solid var(--bs-border-color, #dee2e6);
	box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
	padding: 0.75rem 1.5rem;
	display: flex;
	align-items: center;
	gap: 0.5rem;
}
</style>
