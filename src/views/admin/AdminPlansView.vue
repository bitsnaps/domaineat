<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAdminStore, type AdminPlan } from '@/stores/admin'

const admin = useAdminStore()

const editingTier = ref<string | null>(null)
const editData = ref<any>({})

onMounted(() => {
	admin.fetchPlans()
})

function startEdit(plan: AdminPlan) {
	editingTier.value = plan.tier
	editData.value = {
		name: plan.name,
		price_monthly: plan.price_monthly,
		price_yearly: plan.price_yearly,
		domains: plan.domains,
		rdap_daily: plan.rdap_daily,
		ai_daily: plan.ai_daily,
		watchlist: plan.watchlist,
		wishlist: plan.wishlist,
		active: plan.active,
	}
}

function cancelEdit() {
	editingTier.value = null
	editData.value = {}
}

async function saveEdit() {
	if (!editingTier.value) return
	const ok = await admin.updatePlan(editingTier.value, editData.value)
	if (ok) editingTier.value = null
}

function formatLimit(val: number) {
	return val < 0 ? '∞' : val === 0 ? '—' : val.toLocaleString()
}

function formatPrice(val: number) {
	return `$${val.toFixed(2)}`
}

function getTierColor(tier: string) {
	const colors: Record<string, string> = { free: '#6b7280', premium: '#f59e0b', enterprise: '#10b981' }
	return colors[tier] || '#6b7280'
}
</script>

<template>
	<div>
		<h5 class="fw-semibold mb-3">Plans & Pricing</h5>

		<div v-if="admin.loading" class="text-center py-5">
			<div class="spinner-border text-primary" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>

		<div v-else class="row g-4">
			<div v-for="plan in admin.plans" :key="plan.tier" class="col-md-4">
				<div class="card h-100" :class="{ 'border-success': plan.tier === 'enterprise', 'border-warning': plan.tier === 'premium' }">
					<div class="card-header text-center" :style="{ borderTopColor: getTierColor(plan.tier), borderTopWidth: '3px' }">
						<h5 class="fw-bold mb-0">{{ plan.name }}</h5>
					</div>
					<div class="card-body">
						<div v-if="editingTier === plan.tier" class="d-flex flex-column gap-3">
							<div>
								<label class="form-label small fw-medium">Name</label>
								<input v-model="editData.name" type="text" class="form-control form-control-sm" />
							</div>
							<div class="row g-2">
								<div class="col-6">
									<label class="form-label small fw-medium">Monthly</label>
									<input v-model.number="editData.price_monthly" type="number" step="0.01" class="form-control form-control-sm" />
								</div>
								<div class="col-6">
									<label class="form-label small fw-medium">Yearly</label>
									<input v-model.number="editData.price_yearly" type="number" step="0.01" class="form-control form-control-sm" />
								</div>
							</div>
							<div class="row g-2">
								<div class="col-6">
									<label class="form-label small fw-medium">Domains</label>
									<input v-model.number="editData.domains" type="number" class="form-control form-control-sm" title="-1 for unlimited" />
								</div>
								<div class="col-6">
									<label class="form-label small fw-medium">RDAP/Day</label>
									<input v-model.number="editData.rdap_daily" type="number" class="form-control form-control-sm" title="-1 for unlimited" />
								</div>
							</div>
							<div class="row g-2">
								<div class="col-6">
									<label class="form-label small fw-medium">AI/Day</label>
									<input v-model.number="editData.ai_daily" type="number" class="form-control form-control-sm" title="-1 for unlimited" />
								</div>
								<div class="col-6">
									<label class="form-label small fw-medium">Watchlist</label>
									<input v-model.number="editData.watchlist" type="number" class="form-control form-control-sm" title="-1 for unlimited" />
								</div>
							</div>
							<div class="row g-2">
								<div class="col-6">
									<label class="form-label small fw-medium">Wishlist</label>
									<input v-model.number="editData.wishlist" type="number" class="form-control form-control-sm" title="-1 for unlimited" />
								</div>
								<div class="col-6 d-flex align-items-end">
									<div class="form-check">
										<input v-model="editData.active" class="form-check-input" type="checkbox" id="activeCheck" />
										<label class="form-check-label" for="activeCheck">Active</label>
									</div>
								</div>
							</div>
							<div class="d-flex gap-2">
								<button class="btn btn-sm btn-success" @click="saveEdit">Save</button>
								<button class="btn btn-sm btn-secondary" @click="cancelEdit">Cancel</button>
							</div>
						</div>

						<div v-else>
							<div class="text-center mb-3">
								<span class="fs-3 fw-bold" :style="{ color: getTierColor(plan.tier) }">{{ formatPrice(plan.price_monthly) }}</span>
								<span class="text-muted">/mo</span>
							</div>
							<p class="text-center text-muted small mb-3">{{ formatPrice(plan.price_yearly) }}/year</p>
							<ul class="list-unstyled">
								<li class="d-flex justify-content-between py-1 border-bottom">
									<span class="text-muted">Domains</span>
									<span class="fw-medium">{{ formatLimit(plan.domains) }}</span>
								</li>
								<li class="d-flex justify-content-between py-1 border-bottom">
									<span class="text-muted">RDAP Calls</span>
									<span class="fw-medium">{{ formatLimit(plan.rdap_daily) }}/day</span>
								</li>
								<li class="d-flex justify-content-between py-1 border-bottom">
									<span class="text-muted">AI Calls</span>
									<span class="fw-medium">{{ formatLimit(plan.ai_daily) }}/day</span>
								</li>
								<li class="d-flex justify-content-between py-1 border-bottom">
									<span class="text-muted">Watchlist</span>
									<span class="fw-medium">{{ formatLimit(plan.watchlist) }}</span>
								</li>
								<li class="d-flex justify-content-between py-1">
									<span class="text-muted">Wishlist</span>
									<span class="fw-medium">{{ formatLimit(plan.wishlist) }}</span>
								</li>
							</ul>
							<div class="text-center mt-2">
								<span class="badge" :class="plan.active ? 'bg-success' : 'bg-secondary'">{{ plan.active ? 'Active' : 'Inactive' }}</span>
							</div>
						</div>
					</div>
					<div v-if="editingTier !== plan.tier" class="card-footer text-center">
						<button class="btn btn-sm btn-outline-primary" @click="startEdit(plan)">
							<i class="bi bi-pencil me-1"></i> Edit Plan
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
