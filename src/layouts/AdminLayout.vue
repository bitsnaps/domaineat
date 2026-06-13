<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
// import { useAppStateStore } from '@/stores/appState'
// import { useAuthStore } from '@/stores/auth'

const route = useRoute()
// const appState = useAppStateStore()
// const auth = useAuthStore()

const tabs = [
	{ name: 'users', label: 'Users', icon: 'bi-people', route: '/admin/users' },
	{ name: 'plans', label: 'Plans', icon: 'bi-tag', route: '/admin/plans' },
	{ name: 'stats', label: 'Stats', icon: 'bi-bar-chart-line', route: '/admin/stats' },
	{ name: 'domains', label: 'Domains', icon: 'bi-globe', route: '/admin/domains' },
]

const activeTab = computed(() => {
	const path = route.path
	return tabs.find((t) => path.startsWith(t.route))?.name || 'users'
})
</script>

<template>
	<div class="admin-layout">
		<div class="admin-header d-flex align-items-center justify-content-between mb-4">
			<div class="d-flex align-items-center gap-3">
				<i class="bi bi-shield-lock fs-3" style="color: var(--primary);"></i>
				<div>
					<h4 class="mb-0 fw-bold">Admin Panel</h4>
					<small class="text-muted">Manage your platform</small>
				</div>
			</div>
			<span class="badge bg-primary">Admin</span>
		</div>

		<ul class="nav nav-tabs mb-4">
			<li class="nav-item" v-for="tab in tabs" :key="tab.name">
				<router-link
					:to="tab.route"
					class="nav-link d-flex align-items-center gap-2"
					:class="{ active: activeTab === tab.name }"
				>
					<i class="bi" :class="tab.icon"></i>
					<span>{{ tab.label }}</span>
				</router-link>
			</li>
		</ul>

		<router-view />
	</div>
</template>

<style scoped>
.admin-header {
	padding: 1.5rem;
	background: var(--bs-body-bg, #fff);
	border-radius: 0.75rem;
	border: 1px solid var(--gray-200, #e5e7eb);
}

.nav-tabs .nav-link {
	color: var(--gray-600, #6b7280);
	font-weight: 500;
	font-size: 0.9rem;
	border: none;
	border-bottom: 2px solid transparent;
	padding: 0.75rem 1.25rem;
	transition: all 0.2s;
}

.nav-tabs .nav-link:hover {
	color: var(--primary, #6366f1);
	background: transparent;
}

.nav-tabs .nav-link.active {
	color: var(--primary, #6366f1);
	border-bottom-color: var(--primary, #6366f1);
	font-weight: 600;
	background: transparent;
}
</style>
