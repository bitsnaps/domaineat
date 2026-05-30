<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWishlistStore } from '@/stores/wishlist'
import { useProspectsStore } from '@/stores/prospects'
import { useAuthStore } from '@/stores/auth'
import EmptyState from '@/components/EmptyState.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import { gradeToRange } from '@/lib/appraise'
import type { WishlistCreate, WishlistUpdate, WishlistPriority, AppraisalGrade } from '@/types'

const store = useWishlistStore()
const prospectsStore = useProspectsStore()
const authStore = useAuthStore()

const showAddModal = ref(false)
const selectedIds = ref<number[]>([])
const selectAll = ref(false)
const priorityFilter = ref<WishlistPriority | 'all'>('all')

const newDomain = ref('')
const newTld = ref('com')
const newBudget = ref<string>('')
const newPriority = ref<WishlistPriority>('medium')
const newNotes = ref('')
const newAutoProspect = ref(false)
const newAiAgent = ref(false)

const editId = ref<number | null>(null)
const editPriority = ref<WishlistPriority>('medium')
const editBudget = ref<string>('')
const editNotes = ref('')

const availableTlds = ['com', 'net', 'org', 'io', 'co', 'dev', 'app', 'ai', 'xyz', 'me']
const priorities: WishlistPriority[] = ['critical', 'high', 'medium', 'low']

const priorityVariant: Record<WishlistPriority, string> = {
	critical: 'bg-danger',
	high: 'bg-warning text-dark',
	medium: 'bg-info text-dark',
	low: 'bg-secondary',
}

onMounted(() => {
	store.fetchWishlist()
})

const filteredItems = computed(() => {
	const list = store.sortedByPriority
	if (priorityFilter.value === 'all') return list
	return list.filter(i => i.priority === priorityFilter.value)
})

const hasSelection = computed(() => selectedIds.value.length > 0)

function toggleSelectAll() {
	if (selectAll.value) {
		selectedIds.value = filteredItems.value.map(i => i.id)
	} else {
		selectedIds.value = []
	}
}

function toggleSelect(id: number) {
	const idx = selectedIds.value.indexOf(id)
	if (idx === -1) selectedIds.value.push(id)
	else selectedIds.value.splice(idx, 1)
	selectAll.value = selectedIds.value.length === filteredItems.value.length
}

function resetAddForm() {
	newDomain.value = ''
	newTld.value = 'com'
	newBudget.value = ''
	newPriority.value = 'medium'
	newNotes.value = ''
	newAutoProspect.value = false
	newAiAgent.value = false
}

function handleAdd() {
	if (!newDomain.value.trim()) return
	const payload: WishlistCreate = {
		domain_name: newDomain.value.trim().toLowerCase(),
		tld: newTld.value,
		max_budget: newBudget.value ? Number(newBudget.value) : null,
		priority: newPriority.value,
		notes: newNotes.value.trim() || null,
		auto_prospect: newAutoProspect.value,
		ai_agent: newAiAgent.value,
	}
	store.addToWishlist(payload).then((ok) => {
		if (ok) {
			resetAddForm()
			showAddModal.value = false
		}
	})
}

async function handleMoveToPortfolio() {
	if (!selectedIds.value.length) return
	const ok = await store.moveToPortfolio(selectedIds.value)
	if (ok) selectedIds.value = []
}

async function handleBulkCheck() {
	await store.bulkCheck()
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
	await store.removeFromWishlist(id)
	selectedIds.value = selectedIds.value.filter(i => i !== id)
}

function startEdit(item: typeof store.items[0]) {
	editId.value = item.id
	editPriority.value = item.priority
	editBudget.value = item.max_budget ? String(item.max_budget) : ''
	editNotes.value = item.notes || ''
}

async function saveEdit() {
	if (editId.value === null) return
	const payload: WishlistUpdate = {
		priority: editPriority.value,
		max_budget: editBudget.value ? Number(editBudget.value) : null,
		notes: editNotes.value.trim() || null,
	}
	await store.updateWishlistItem(editId.value, payload)
	editId.value = null
}

async function toggleAutoProspect(item: typeof store.items[0]) {
	await store.updateWishlistItem(item.id, { auto_prospect: !item.auto_prospect })
}

async function toggleAiAgent(item: typeof store.items[0]) {
	await store.updateWishlistItem(item.id, { ai_agent: !item.ai_agent })
}

async function handleFindProspects() {
	if (!selectedIds.value.length) return
	const takenIds = filteredItems.value
		.filter(i => selectedIds.value.includes(i.id) && i.available === false)
		.map(i => i.id)
	if (takenIds.length === 0) {
		const { useToastStore } = await import('@/stores/toast')
		useToastStore().info('Only taken domains can have prospects')
		return
	}
	await store.prospectAll(takenIds)
	prospectsStore.fetchProspects()
	selectedIds.value = []
	selectAll.value = false
}

/** Compare user's budget vs appraisal range. Returns label + CSS class. */
function budgetVsAppraisal(item: typeof store.items[0]) {
	if (!item.max_budget || !item.appraisal_grade) return { label: '—', class: '' }
	const range = gradeToRange(item.appraisal_grade as AppraisalGrade)
	const budget = item.max_budget
	if (budget < range.low) return { label: 'Under', class: 'text-danger' }
	if (budget > range.high) return { label: 'Over', class: 'text-warning' }
	return { label: 'In range', class: 'text-success' }
}

/** Generate registrar search URL for available domains */
function registerUrl(item: typeof store.items[0]) {
	const q = encodeURIComponent(item.domain_name)
	const registrar = authStore.user?.preferred_registrar
	if (registrar) {
		// Custom registrar URL template — user sets full URL with {domain} placeholder
		if (registrar.includes('{domain}')) return registrar.replace('{domain}', q)
		// If just a domain, build a search URL
		return `https://${registrar.replace(/^https?:\/\//, '')}?domain=${q}`
	}
	// Default: Namecheap
	return `https://www.namecheap.com/domains/registration/results/?domain=${q}`
}
</script>

<template>
	<div class="container-fluid p-4">
		<div class="d-flex justify-content-between align-items-center mb-4">
			<h3 class="mb-0">
				<i class="bi bi-heart me-2" style="color: var(--primary);"></i>
				Wishlist
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
				class="btn btn-outline-info btn-sm"
				:disabled="!hasSelection"
				@click="handleFindProspects"
			>
				<i class="bi bi-people me-1"></i>Find Prospects
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

		<!-- Priority Filter -->
		<div v-if="store.items.length > 0" class="btn-group btn-group-sm mb-3">
			<button
				class="btn"
				:class="priorityFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'"
				@click="priorityFilter = 'all'"
			>All</button>
			<button
				v-for="p in priorities"
				:key="p"
				class="btn text-capitalize"
				:class="priorityFilter === p ? 'btn-primary' : 'btn-outline-primary'"
				@click="priorityFilter = p"
			>{{ p }}</button>
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
			icon="bi-heart"
			title="No wishlisted domains"
			description="Add domains you want to acquire to your wishlist with budget and priority tracking."
		/>

		<!-- Table -->
		<div v-if="filteredItems.length > 0" class="card shadow-sm">
			<div class="table-responsive">
				<table class="table table-hover align-middle mb-0">
					<thead class="table-light">
						<tr>
							<th style="width: 40px;">
								<input type="checkbox" class="form-check-input" v-model="selectAll" @change="toggleSelectAll" />
							</th>
							<th>Domain</th>
							<th style="width: 8%;">TLD</th>
							<th style="width: 10%;">Priority</th>
						<th style="width: 10%;">Budget</th>
						<th style="width: 10%;">Value</th>
						<th style="width: 8%;">Status</th>
							<th style="width: 8%;">Auto</th>
							<th style="width: 8%;">AI</th>
							<th>Notes</th>
							<th style="width: 100px;">Actions</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="item in filteredItems" :key="item.id">
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
								<span v-if="editId !== item.id" class="badge text-capitalize" :class="priorityVariant[item.priority]">{{ item.priority }}</span>
								<select v-else v-model="editPriority" class="form-select form-select-sm">
									<option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
								</select>
							</td>
							<td>
								<span v-if="editId !== item.id">{{ item.max_budget ? `$${item.max_budget}` : '—' }}</span>
								<input v-else v-model="editBudget" type="number" class="form-control form-control-sm" placeholder="Budget" />
							</td>
						<td>
							<span :class="budgetVsAppraisal(item).class" class="fw-semibold">
								{{ budgetVsAppraisal(item).label }}
							</span>
							<div v-if="item.appraisal_grade" class="text-muted small">
								{{ item.appraisal_grade }} · ${{ gradeToRange(item.appraisal_grade as AppraisalGrade).low.toLocaleString() }}–${{ gradeToRange(item.appraisal_grade as AppraisalGrade).high.toLocaleString() }}
							</div>
						</td>
						<td>
							<span v-if="item.available === true" class="badge bg-success">Available</span>
							<span v-else-if="item.available === false" class="badge bg-secondary">Taken</span>
							<span v-else class="badge bg-warning text-dark">Unknown</span>
							<a
								v-if="item.available === true"
								:href="registerUrl(item)"
								target="_blank"
								rel="noopener"
								class="btn btn-sm btn-outline-success ms-1 py-0 px-1"
								title="Register Now"
							>
								<i class="bi bi-cart-plus"></i>
							</a>
						</td>
							<td>
								<div class="form-check form-switch">
									<input type="checkbox" class="form-check-input" :checked="item.auto_prospect" @change="toggleAutoProspect(item)" />
								</div>
							</td>
							<td>
								<div class="form-check form-switch">
									<input type="checkbox" class="form-check-input" :checked="item.ai_agent" @change="toggleAiAgent(item)" />
								</div>
							</td>
							<td>
								<span v-if="editId !== item.id" class="text-muted small">{{ item.notes || '—' }}</span>
								<input v-else v-model="editNotes" type="text" class="form-control form-control-sm" placeholder="Notes" />
							</td>
							<td>
								<div v-if="editId !== item.id" class="d-flex gap-1">
									<button class="btn btn-sm btn-outline-primary" @click="startEdit(item)" title="Edit">
										<i class="bi bi-pencil"></i>
									</button>
									<button class="btn btn-sm btn-outline-danger" @click="handleRemove(item.id)" title="Remove">
										<i class="bi bi-trash3"></i>
									</button>
								</div>
								<div v-else class="d-flex gap-1">
									<button class="btn btn-sm btn-success" @click="saveEdit" title="Save">
										<i class="bi bi-check-lg"></i>
									</button>
									<button class="btn btn-sm btn-secondary" @click="editId = null" title="Cancel">
										<i class="bi bi-x-lg"></i>
									</button>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- Add Modal -->
	<div v-if="showAddModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);" @click.self="showAddModal = false">
		<div class="modal-dialog modal-dialog-centered">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title"><i class="bi bi-heart me-2"></i>Add to Wishlist</h5>
					<button type="button" class="btn-close" @click="showAddModal = false"></button>
				</div>
				<div class="modal-body">
					<div class="mb-3">
						<label class="form-label">Domain Name</label>
						<input v-model="newDomain" type="text" class="form-control" placeholder="e.g. mybrand.com" @keydown.enter="handleAdd" />
					</div>
					<div class="row g-3 mb-3">
						<div class="col-6">
							<label class="form-label">TLD</label>
							<select v-model="newTld" class="form-select">
								<option v-for="t in availableTlds" :key="t" :value="t">.{{ t }}</option>
							</select>
						</div>
						<div class="col-6">
							<label class="form-label">Max Budget ($)</label>
							<input v-model="newBudget" type="number" class="form-control" placeholder="e.g. 500" min="0" />
						</div>
					</div>
					<div class="mb-3">
						<label class="form-label">Priority</label>
						<select v-model="newPriority" class="form-select">
							<option v-for="p in priorities" :key="p" :value="p" class="text-capitalize">{{ p }}</option>
						</select>
					</div>
					<div class="mb-3">
						<label class="form-label">Notes (optional)</label>
						<textarea v-model="newNotes" class="form-control" rows="2" placeholder="Why do you want this domain?"></textarea>
					</div>
					<div class="d-flex gap-4">
						<div class="form-check form-switch">
							<input v-model="newAutoProspect" class="form-check-input" type="checkbox" id="addAutoProspect" />
							<label class="form-check-label" for="addAutoProspect">Auto-Prospect</label>
						</div>
						<div class="form-check form-switch">
							<input v-model="newAiAgent" class="form-check-input" type="checkbox" id="addAiAgent" />
							<label class="form-check-label" for="addAiAgent">AI Agent</label>
						</div>
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
</template>
