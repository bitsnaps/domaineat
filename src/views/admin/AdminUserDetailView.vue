<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore, type AdminUser } from '@/stores/admin'

const props = defineProps<{ id: string }>()
const router = useRouter()
const admin = useAdminStore()

const user = ref<AdminUser | null>(null)
const editing = ref(false)
const editData = ref({ tier: '', role: '' })

onMounted(async () => {
	user.value = await admin.fetchUser(Number(props.id))
	if (user.value) {
		editData.value = { tier: user.value.tier, role: user.value.role }
	}
})

function startEdit() {
	editing.value = true
}

function cancelEdit() {
	if (user.value) {
		editData.value = { tier: user.value.tier, role: user.value.role }
	}
	editing.value = false
}

async function saveEdit() {
	if (!user.value) return
	const ok = await admin.updateUser(user.value.id, editData.value)
	if (ok) {
		user.value = { ...user.value, ...editData.value }
		editing.value = false
	}
}

async function resetUsage() {
	if (!user.value) return
	const ok = await admin.resetUsage(user.value.id)
	if (ok && user.value) {
		user.value.daily_ai_calls = 0
		user.value.daily_rdap_calls = 0
	}
}

function goBack() {
	router.push('/admin/users')
}

function formatDate(dateStr: string) {
	if (!dateStr) return '—'
	return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
	<div>
		<button class="btn btn-sm btn-outline-secondary mb-3" @click="goBack">
			<i class="bi bi-arrow-left me-1"></i> Back to Users
		</button>

		<div v-if="!user" class="text-center py-5">
			<div class="spinner-border text-primary" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>

		<div v-else>
			<div class="card mb-4">
				<div class="card-header d-flex justify-content-between align-items-center">
					<h5 class="mb-0 fw-semibold">{{ user.email }}</h5>
					<div class="d-flex gap-2">
						<button v-if="!editing" class="btn btn-sm btn-primary" @click="startEdit">
							<i class="bi bi-pencil me-1"></i> Edit
						</button>
						<button class="btn btn-sm btn-outline-warning" @click="resetUsage">
							<i class="bi bi-arrow-counterclockwise me-1"></i> Reset Usage
						</button>
					</div>
				</div>
				<div class="card-body">
					<div v-if="editing" class="row g-3">
						<div class="col-md-6">
							<label class="form-label fw-medium">Tier</label>
							<select v-model="editData.tier" class="form-select">
								<option value="free">Free</option>
								<option value="premium">Premium</option>
								<option value="enterprise">Enterprise</option>
							</select>
						</div>
						<div class="col-md-6">
							<label class="form-label fw-medium">Role</label>
							<select v-model="editData.role" class="form-select">
								<option value="user">User</option>
								<option value="admin">Admin</option>
							</select>
						</div>
						<div class="col-12 d-flex gap-2">
							<button class="btn btn-sm btn-success" @click="saveEdit">Save</button>
							<button class="btn btn-sm btn-secondary" @click="cancelEdit">Cancel</button>
						</div>
					</div>

					<div v-else class="row g-3">
						<div class="col-md-4">
							<small class="text-muted d-block">Role</small>
							<span class="badge" :class="user.role === 'admin' ? 'bg-primary' : 'bg-secondary'">{{ user.role }}</span>
						</div>
						<div class="col-md-4">
							<small class="text-muted d-block">Tier</small>
							<span class="badge" :class="{
								'bg-light text-dark': user.tier === 'free',
								'bg-warning text-dark': user.tier === 'premium',
								'bg-success': user.tier === 'enterprise'
							}">{{ user.tier }}</span>
						</div>
						<div class="col-md-4">
							<small class="text-muted d-block">Created</small>
							<span>{{ formatDate(user.created_at) }}</span>
						</div>
						<div class="col-md-4">
							<small class="text-muted d-block">AI Calls Today</small>
							<span>{{ user.daily_ai_calls }}</span>
						</div>
						<div class="col-md-4">
							<small class="text-muted d-block">RDAP Calls Today</small>
							<span>{{ user.daily_rdap_calls }}</span>
						</div>
						<div class="col-md-4">
							<small class="text-muted d-block">AI Provider</small>
							<span>{{ user.llm_provider || '—' }}</span>
						</div>
						<div class="col-md-4">
							<small class="text-muted d-block">AI Model</small>
							<span>{{ user.llm_model || '—' }}</span>
						</div>
						<div class="col-md-4">
							<small class="text-muted d-block">Preferred Registrar</small>
							<span>{{ user.preferred_registrar || '—' }}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
