<script setup lang="ts">
import { useAppStateStore } from '@/stores/appState'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useRouter } from 'vue-router'
import { ref, onMounted, computed } from 'vue'
import { formatDate } from '@/lib/format'

const appState = useAppStateStore()
const auth = useAuthStore()
const router = useRouter()
const notifications = useNotificationsStore()

const showNotifPanel = ref(false)

onMounted(() => {
	if (auth.isLoggedIn) {
		notifications.fetchNotifications()
	}
})

const unreadCount = computed(() => notifications.unreadCount)

function handleLogout() {
	auth.logout()
	router.push('/login')
}

function toggleNotifPanel() {
	showNotifPanel.value = !showNotifPanel.value
}

async function handleDismiss(id: number) {
	await notifications.dismissNotification(id)
}

async function handleDismissAll() {
	await notifications.dismissAll()
}

function typeIcon(type: string): string {
	if (type === 'status_change') return 'bi-arrow-repeat text-info'
	if (type === 'expiry_warning') return 'bi-clock text-warning'
	if (type === 'appraisal_shift') return 'bi-graph-up-arrow text-primary'
	if (type === 'new_prospect') return 'bi-person-plus text-success'
	if (type === 'agent_action') return 'bi-robot text-primary'
	if (type === 'outreach_reply') return 'bi-envelope text-info'
	return 'bi-bell text-secondary'
}

function levelClass(level: string): string {
	if (level === 'urgent') return 'border-start border-danger border-3'
	if (level === 'warning') return 'border-start border-warning border-3'
	return 'border-start border-info border-3'
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
		<router-link to="/" class="navbar-brand mb-0 h1 fs-6 text-decoration-none" style="font-family: var(--font-display); font-weight: 700; color: var(--dark);">
			Domain<span style="color: var(--primary);">eat</span>
		</router-link>
		<div class="ms-auto d-flex align-items-center gap-2">
			<!-- User email -->
			<span v-if="auth.isLoggedIn && auth.user" class="d-none d-md-inline small text-muted">
				{{ auth.user.email }}
			</span>
			<!-- Notification Bell -->
			<div v-if="auth.isLoggedIn" class="dropdown-center position-relative">
				<button
					class="btn btn-sm btn-outline-secondary position-relative"
					data-testid="notif-bell"
					@click="toggleNotifPanel"
					title="Notifications"
				>
					<i class="bi bi-bell"></i>
					<span
						v-if="unreadCount > 0"
						class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
						style="font-size: 0.65rem;"
					>
						{{ unreadCount > 9 ? '9+' : unreadCount }}
					</span>
				</button>
				<!-- Dropdown Panel -->
				<div
					v-if="showNotifPanel"
					class="dropdown-menu show end-0 shadow-sm"
					style="width: 360px; max-height: 400px; overflow-y: auto;"
					data-testid="notif-panel"
				>
					<div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
						<span class="fw-semibold small">Notifications</span>
						<button
							v-if="unreadCount > 0"
							class="btn btn-link btn-sm p-0 text-muted small"
							@click="handleDismissAll"
						>Mark all read</button>
					</div>
					<div v-if="notifications.loading" class="p-3 text-center text-muted small">
						<span class="spinner-border spinner-border-sm me-1"></span>Loading...
					</div>
					<div v-else-if="notifications.items.length === 0" class="p-3 text-center text-muted small">
						No notifications
					</div>
					<template v-else>
						<div
							v-for="n in notifications.items"
							:key="n.id"
							class="dropdown-item-text px-3 py-2 border-bottom small"
							:class="[levelClass(n.level), { 'opacity-50': n.dismissed }]"
						>
							<div class="d-flex align-items-start gap-2">
								<i class="bi mt-1" :class="typeIcon(n.type)"></i>
								<div class="flex-grow-1">
									<div>{{ n.message }}</div>
									<div class="text-muted" style="font-size: 0.75rem;">{{ formatDate(n.created_at) }}</div>
								</div>
								<button
									v-if="!n.dismissed"
									class="btn btn-link btn-sm p-0 text-muted"
									@click.stop="handleDismiss(n.id)"
									title="Dismiss"
								>
									<i class="bi bi-x"></i>
								</button>
							</div>
						</div>
					</template>
				</div>
			</div>
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
