<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useAdminStore } from '@/stores/admin'

const admin = useAdminStore()
const searchQuery = ref('')

onMounted(() => {
	admin.fetchAllDomains()
})

const filteredDomains = computed(() => {
	if (!searchQuery.value) return admin.domains
	const q = searchQuery.value.toLowerCase()
	return admin.domains.filter((d: any) =>
		d.domain_name?.toLowerCase().includes(q) ||
		String(d.user_id).includes(q)
	)
})

function getStatusBadge(status: string) {
	const badges: Record<string, string> = {
		active: 'bg-success',
		expired: 'bg-danger',
		sold: 'bg-info',
		pending_delete: 'bg-warning text-dark',
		parked: 'bg-secondary',
	}
	return badges[status] || 'bg-secondary'
}

function formatDate(dateStr: string) {
	if (!dateStr) return '—'
	return new Date(dateStr).toLocaleDateString()
}

function formatCost(val: number) {
	return `$${Number(val || 0).toFixed(2)}`
}
</script>

<template>
	<div>
		<div class="d-flex justify-content-between align-items-center mb-3">
			<h5 class="fw-semibold mb-0">All Domains ({{ admin.domains.length }})</h5>
			<input
				v-model="searchQuery"
				type="text"
				class="form-control form-control-sm"
				placeholder="Search by domain or user ID..."
				style="max-width: 280px;"
			/>
		</div>

		<div v-if="admin.loading" class="text-center py-5">
			<div class="spinner-border text-primary" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>

		<div v-else class="table-responsive">
			<table class="table table-hover align-middle">
				<thead class="table-light">
					<tr>
						<th>ID</th>
						<th>Domain</th>
						<th>User ID</th>
						<th>Registrar</th>
						<th>Status</th>
						<th>Acquired</th>
						<th>Expires</th>
						<th class="text-end">Cost</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="domain in filteredDomains" :key="domain.id">
						<td class="text-muted">{{ domain.id }}</td>
						<td class="fw-medium">{{ domain.domain_name }}</td>
						<td class="text-muted">{{ domain.user_id }}</td>
						<td class="text-muted">{{ domain.registrar }}</td>
						<td>
							<span class="badge" :class="getStatusBadge(domain.status)">{{ domain.status }}</span>
						</td>
						<td class="text-muted">{{ formatDate(domain.acquisition_date) }}</td>
						<td class="text-muted">{{ formatDate(domain.expiry_date) }}</td>
						<td class="text-end">{{ formatCost(domain.acquisition_cost) }}</td>
					</tr>
					<tr v-if="filteredDomains.length === 0">
						<td colspan="8" class="text-center text-muted py-4">No domains found</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
