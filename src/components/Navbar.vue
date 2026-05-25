<script setup lang="ts">
import { useAppStateStore } from '@/stores/appState'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const appState = useAppStateStore()
const auth = useAuthStore()
const router = useRouter()

function handleLogout() {
	auth.logout()
	router.push('/login')
}
</script>

<template>
	<nav class="navbar navbar-expand px-3" style="border-bottom: 1px solid var(--gray-200);">
		<!-- Hamburger: toggles desktop sidebar OR mobile menu -->
		<button
			class="btn btn-sm btn-outline-secondary me-3 d-md-none"
			data-testid="mobile-hamburger"
			@click="appState.toggleMobileMenu"
			aria-label="Open menu"
		>
			<i class="bi bi-list fs-5"></i>
		</button>
		<button
			class="btn btn-sm btn-outline-secondary me-3 d-none d-md-inline-block"
			data-testid="sidebar-hamburger"
			@click="appState.toggleSidebar"
			:title="appState.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
		>
			<i class="bi bi-list fs-5"></i>
		</button>
		<span class="navbar-brand mb-0 h1 fs-6" style="font-family: var(--font-display); font-weight: 700; color: var(--dark);">
			Domain<span style="color: var(--primary);">eat</span>
		</span>
		<div class="ms-auto d-flex align-items-center gap-2">
			<!-- User email -->
			<span v-if="auth.isLoggedIn && auth.user" class="d-none d-md-inline small text-muted">
				{{ auth.user.email }}
			</span>
			<!-- Theme toggle -->
			<button
				class="btn btn-sm btn-outline-secondary"
				data-testid="theme-toggle"
				@click="appState.toggleTheme"
				:title="appState.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
			>
				<i class="bi" :class="appState.theme === 'dark' ? 'bi-sun' : 'bi-moon'"></i>
			</button>
			<!-- Logout button -->
			<button
				v-if="auth.isLoggedIn"
				class="btn btn-sm btn-outline-danger"
				data-testid="logout-button"
				@click="handleLogout"
				title="Sign out"
			>
				<i class="bi bi-box-arrow-right"></i>
			</button>
		</div>
	</nav>
</template>
