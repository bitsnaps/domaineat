<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWatchlistStore } from '@/stores/watchlist'
import AppraisalBadge from '@/components/AppraisalBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import { formatDate } from '@/lib/format'
import type { WatchlistCreate } from '@/types'

const store = useWatchlistStore()

const showAddModal = ref(false)
const selectedIds = ref<number[]>([])
const selectAll = ref(false)

const newDomain = ref('')
const newTld = ref('com')
const newNotes = ref('')

const availableTlds = ['com', 'net', 'org', 'io', 'co', 'dev', 'app', 'ai', 'xyz', 'me']

onMounted(() => {
	store.fetchWatchlist()
})

const hasSelection = computed(() => selectedIds.value.length > 0)

function toggleSelectAll() {
	if (selectAll.value) {
		selectedIds.value = store.items.map(i => i.id)
	} else {
		selectedIds.value = []
	}
}

function toggleSelect(id: number) {
	const idx = selectedIds.value.indexOf(id)
	if (idx === -1) {
		selectedIds.value.push(id)
	} else {
		selectedIds.value.splice(idx, 1)
	}
	selectAll.value = selectedIds.value.length === store.items.length
}

function handleAdd() {
	if (!newDomain.value.trim()) return
	const payload: WatchlistCreate = {
		domain_name: newDomain.value.trim().toLowerCase(),
		tld: newTld.value,
		notes: newNotes.value.trim() || null,
	}
	store.addToWatchlist(payload).then((ok) => {
		if (ok) {
			newDomain.value = ''
			newTld.value = 'com'
			newNotes.value = ''
			showAddModal.value = false
		}
	})
}

async function handleBulkCheck() {
	await store.bulkCheck()
}

async function handleMoveToPortfolio() {
	if (!selectedIds.value.length) return
	const ok = await store.moveToPortfolio(selectedIds.value)
	if (ok) selectedIds.value = []
}

async function handleBulkDelete() {
	if (!selectedIds.value.length) return
	const deleted = await store.bulkDelete(selectedIds.value)
	if (deleted > 0) {
		selectedIds.value = []
		selectAll.value = false
	}
}

async function handleRemove(id: number) {
	await store.removeFromWatchlist(id)
	selectedIds.value = selectedIds.value.filter(i => i !== id)
}
</script>

<template>
	<div class="container-fluid p-4">
		<div class="d-flex justify-content-between align-items-center mb-4">
			<h3 class="mb-0">
				<i class="bi bi-eye me-2" style="color: var(--primary);"></i>
				Watchlist
			</h3>
			<div class="d-flex gap-2">
				<button class="btn btn-outline-primary btn-sm" @click="handleBulkCheck" :disabled="store.loading || store.items.length === 0">
					<i class="bi bi-arrow-repeat me-1"></i>Check All
				</button>
				<button
					class="btn btn-outline-success btn-sm"
					:disabled="!hasSelection"
					@click="handleMoveToPortfolio"
				>
					<i class="bi bi-box-arrow-in-right me-1"></i>Move to Portfolio
				</button>
				<button
					class="btn btn-outline-danger btn-sm"
					:disabled="!hasSelection"
					@click="handleBulkDelete"
				>
					<i class="bi bi-trash3 me-1"></i>Delete
				</button>
				<button class="btn btn-outline-secondary btn-sm" @click="store.exportCsv()" :disabled="store.loading || store.items.length === 0">
					<i class="bi bi-download me-1"></i>Export
				</button>
				<button class="btn btn-primary btn-sm" @click="showAddModal = true">
					<i class="bi bi-plus-lg me-1"></i>Add Domain
				</button>
			</div>
		</div>

		<!-- Loading -->
		<div v-if="store.loading && store.items.length === 0">
			<LoadingSkeleton :count="3" />
		</div>

		<!-- Error -->
		<div v-if="store.error" class="alert alert-danger">
			<i class="bi bi-exclamation-triangle me-2"></i>{{ store.error }}
		</div>

		<!-- Empty State -->
		<EmptyState
			v-if="!store.loading && store.items.length === 0 && !store.error"
			icon="bi-eye"
			title="No watched domains"
			description="Add domains to your watchlist to monitor their availability status."
		/>

		<!-- Table -->
		<div v-if="store.items.length > 0" class="card shadow-sm">
			<div class="table-responsive">
				<table class="table table-hover align-middle mb-0">
					<thead class="table-light">
						<tr>
							<th style="width: 40px;">
								<input type="checkbox" class="form-check-input" v-model="selectAll" @change="toggleSelectAll" />
							</th>
							<th>Domain</th>
							<th style="width: 10%;">TLD</th>
							<th style="width: 10%;">Status</th>
							<th style="width: 10%;">Grade</th>
							<th>Notes</th>
							<th style="width: 15%;">Last Checked</th>
							<th style="width: 80px;">Actions</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="item in store.items" :key="item.id">
							<td>
								<input
									type="checkbox"
									class="form-check-input"
									:checked="selectedIds.includes(item.id)"
									@change="toggleSelect(item.id)"
								/>
							</td>
							<td class="fw-semibold">{{ item.domain_name }}</td>
							<td><span class="badge bg-light text-dark">.{{ item.tld }}</span></td>
							<td>
								<span v-if="item.available === true" class="badge bg-success">Available</span>
								<span v-else-if="item.available === false" class="badge bg-secondary">Taken</span>
								<span v-else class="badge bg-warning text-dark">Unknown</span>
							</td>
							<td>
								<AppraisalBadge v-if="item.appraisal_grade" :grade="item.appraisal_grade" size="sm" />
								<span v-else class="text-muted small">—</span>
							</td>
							<td class="text-muted small">{{ item.notes || '—' }}</td>
							<td class="text-muted small">{{ item.last_checked_at ? formatDate(item.last_checked_at) : 'Never' }}</td>
							<td>
								<button class="btn btn-sm btn-outline-danger" @click="handleRemove(item.id)" title="Remove">
									<i class="bi bi-trash3"></i>
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Add Modal -->
		<div v-if="showAddModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);" @click.self="showAddModal = false">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title"><i class="bi bi-eye me-2"></i>Add to Watchlist</h5>
						<button type="button" class="btn-close" @click="showAddModal = false"></button>
					</div>
					<div class="modal-body">
						<div class="mb-3">
							<label class="form-label">Domain Name</label>
							<input v-model="newDomain" type="text" class="form-control" placeholder="e.g. mybrand.com" @keydown.enter="handleAdd" />
						</div>
						<div class="mb-3">
							<label class="form-label">TLD</label>
							<select v-model="newTld" class="form-select">
								<option v-for="t in availableTlds" :key="t" :value="t">.{{ t }}</option>
							</select>
						</div>
						<div class="mb-3">
							<label class="form-label">Notes (optional)</label>
							<textarea v-model="newNotes" class="form-control" rows="2" placeholder="Why are you watching this domain?"></textarea>
						</div>
					</div>
					<div class="modal-footer">
						<button class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
						<button class="btn btn-primary" @click="handleAdd" :disabled="!newDomain.trim()">
							<i class="bi bi-plus-lg me-1"></i>Add
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
