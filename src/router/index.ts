import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Layouts
const AppLayout = () => import('@/layouts/AppLayout.vue')
const DefaultLayout = () => import('@/layouts/DefaultLayout.vue')
const LookupLayout = () => import('@/layouts/LookupLayout.vue')

// Views — landing page (no sidebar)
const DashboardView = () => import('@/views/DashboardView.vue')

// Views — auth (no layout wrapper)
const LoginView = () => import('@/views/LoginView.vue')

// Views — public pages (no auth required)
const DomainSearchView = () => import('@/views/DomainSearchView.vue')

// Views — app pages (with sidebar)
const HomeView = () => import('@/views/HomeView.vue')
const DomainsView = () => import('@/views/DomainsView.vue')
const DomainDetailView = () => import('@/views/DomainDetailView.vue')
const LedgerView = () => import('@/views/LedgerView.vue')
const ProspectsView = () => import('@/views/ProspectsView.vue')
const WatchlistView = () => import('@/views/WatchlistView.vue')
const WishlistView = () => import('@/views/WishlistView.vue')
const SettingsView = () => import('@/views/SettingsView.vue')

// Views — admin pages
const AdminLayout = () => import('@/layouts/AdminLayout.vue')
const AdminUsersView = () => import('@/views/admin/AdminUsersView.vue')
const AdminUserDetailView = () => import('@/views/admin/AdminUserDetailView.vue')
const AdminPlansView = () => import('@/views/admin/AdminPlansView.vue')
const AdminStatsView = () => import('@/views/admin/AdminStatsView.vue')
const AdminDomainsView = () => import('@/views/admin/AdminDomainsView.vue')

const routes = [
	// Public landing page — no sidebar
	{
		path: '/',
		component: AppLayout,
		children: [
			{ path: '', name: 'dashboard', component: DashboardView },
		],
	},
	// Auth pages — no sidebar, public access
	{
		path: '/login',
		name: 'login',
		component: LoginView,
		meta: { public: true },
	},
	// Public domain search — full-width with LookupLayout navbar
	{
		path: '/search',
		component: LookupLayout,
		children: [
			{ path: '', name: 'search', component: DomainSearchView, meta: { public: true } },
		],
	},
	// Authenticated app pages — sidebar + navbar
	{
		path: '/',
		component: DefaultLayout,
		meta: { requiresAuth: true },
		children: [
			{ path: 'home', name: 'home', component: HomeView },
			{ path: 'domains', name: 'domains', component: DomainsView },
			{ path: 'domains/:id', name: 'domain-detail', component: DomainDetailView, props: true },
			{ path: 'lookup', name: 'lookup', component: DomainSearchView },
			{ path: 'ledger', name: 'ledger', component: LedgerView },
			{ path: 'prospects', name: 'prospects', component: ProspectsView },
			{ path: 'watchlist', name: 'watchlist', component: WatchlistView },
			{ path: 'wishlist', name: 'wishlist', component: WishlistView },
			{ path: 'settings', name: 'settings', component: SettingsView },
		],
	},
	// Admin pages — nested under DefaultLayout
	{
		path: '/admin',
		component: DefaultLayout,
		meta: { requiresAuth: true, requiresAdmin: true },
		children: [
			{
				path: '',
				component: AdminLayout,
				children: [
					{ path: '', redirect: '/admin/users' },
					{ path: 'users', name: 'admin-users', component: AdminUsersView },
					{ path: 'users/:id', name: 'admin-user-detail', component: AdminUserDetailView, props: true },
					{ path: 'plans', name: 'admin-plans', component: AdminPlansView },
					{ path: 'stats', name: 'admin-stats', component: AdminStatsView },
					{ path: 'domains', name: 'admin-domains', component: AdminDomainsView },
				],
			},
		],
	},
]

const router = createRouter({
	history: createWebHistory(),
	routes,
})

// ─── Navigation Guard ──────────────────────────────────────────────────

// Routes that don't require authentication
const publicRoutes = new Set(['dashboard', 'login', 'search'])

router.beforeEach(async (to) => {
	// Public routes are always accessible
	if (to.meta.public || publicRoutes.has(to.name as string)) return

	// Check if user is authenticated
	const auth = useAuthStore()
	if (!auth.isLoggedIn) {
		return { name: 'login', query: { redirect: to.fullPath } }
	}

	// Admin routes require admin role
	if (to.meta.requiresAdmin || to.matched.some((r) => r.meta.requiresAdmin)) {
		// Ensure profile is loaded
		if (!auth.user && auth.isLoggedIn) {
			await auth.fetchProfile()
		}
		if (!auth.isAdmin) {
			return { name: 'home' }
		}
	}
})

export { routes }
export default router
