<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore, type AdminUser } from '@/stores/admin'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const admin = useAdminStore()
const auth = useAuthStore()

const showDeleteModal = ref(false)
const userToDelete = ref<AdminUser | null>(null)
const deleteCascade = ref(false)

onMounted(() => {
	admin.fetchUsers()
})

function viewUser(id: number) {
	router.push(`/admin/users/${id}`)
}

function confirmDelete(user: AdminUser) {
	userToDelete.value = user
	deleteCascade.value = false
	showDeleteModal.value = true
}

async function executeDelete() {
	if (!userToDelete.value) return
	await admin.deleteUser(userToDelete.value.id, deleteCascade.value)
	showDeleteModal.value = false
	userToDelete.value = null
}

function getRoleBadge(role: string) {
	return role === 'admin' ? 'bg-primary' : 'bg-secondary'
}

function getTierBadge(tier: string) {
	const badges: Record<string, string> = {
		free: 'bg-light text-dark',
		premium: 'bg-warning text-dark',
		enterprise: 'bg-success',
	}
	return badges[tier] || 'bg-secondary'
}

function formatDate(dateStr: string) {
	if (!dateStr) return '—'
	return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
	<div>
		<div class="d-flex justify-content-between align-items-center mb-3">
			<h5 class="fw-semibold mb-0">Users ({{ admin.users.length }})</h5>
			<input
				v-model="admin.userSearch"
				type="text"
				class="form-control form-control-sm"
				placeholder="Search by email..."
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
						<th>Email</th>
						<th>Role</th>
						<th>Tier</th>
						<th>Created</th>
						<th class="text-end">Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="user in admin.filteredUsers" :key="user.id">
						<td class="text-muted">{{ user.id }}</td>
						<td class="fw-medium">{{ user.email }}</td>
						<td>
							<span class="badge" :class="getRoleBadge(user.role)">{{ user.role }}</span>
						</td>
						<td>
							<span class="badge" :class="getTierBadge(user.tier)">{{ user.tier }}</span>
						</td>
						<td class="text-muted">{{ formatDate(user.created_at) }}</td>
						<td class="text-end">
							<div class="btn-group btn-group-sm">
								<button class="btn btn-outline-primary" @click="viewUser(user.id)" title="View details">
									<i class="bi bi-eye"></i>
								</button>
								<button
									class="btn btn-outline-danger"
									@click="confirmDelete(user)"
									title="Delete user"
									:disabled="user.id === auth.user?.id"
								>
									<i class="bi bi-trash"></i>
								</button>
							</div>
						</td>
					</tr>
					<tr v-if="admin.filteredUsers.length === 0">
						<td colspan="6" class="text-center text-muted py-4">No users found</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Delete Confirmation Modal -->
		<div v-if="showDeleteModal" class="modal-backdrop fade show" @click="showDeleteModal = false"></div>
		<div v-if="showDeleteModal" class="modal fade show d-block" tabindex="-1">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Delete User</h5>
						<button type="button" class="btn-close" @click="showDeleteModal = false"></button>
					</div>
					<div class="modal-body">
						<p>Are you sure you want to delete <strong>{{ userToDelete?.email }}</strong>?</p>
						<div class="form-check">
							<input class="form-check-input" type="checkbox" id="cascadeCheck" v-model="deleteCascade" />
							<label class="form-check-label" for="cascadeCheck">
								Cascade delete all user data (domains, ledger, prospects, watchlist, wishlist, notifications)
							</label>
						</div>
						<p v-if="!deleteCascade" class="text-muted mt-2 small">
							User-only delete: records will remain orphaned for review.
						</p>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" @click="showDeleteModal = false">Cancel</button>
						<button type="button" class="btn btn-danger" @click="executeDelete">
							{{ deleteCascade ? 'Delete Everything' : 'Delete User Only' }}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
