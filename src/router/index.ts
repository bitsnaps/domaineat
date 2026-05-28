import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Layouts
const AppLayout = () => import('@/layouts/AppLayout.vue')
const DefaultLayout = () => import('@/layouts/DefaultLayout.vue')

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
const SettingsView = () => import('@/views/SettingsView.vue')

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
	// Public domain search — no auth required
	{
		path: '/search',
		name: 'search',
		component: DomainSearchView,
		meta: { public: true },
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
      { path: 'ledger', name: 'ledger', component: LedgerView },
      { path: 'prospects', name: 'prospects', component: ProspectsView },
      { path: 'settings', name: 'settings', component: SettingsView },
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

router.beforeEach((to) => {
  // Public routes are always accessible
  if (to.meta.public || publicRoutes.has(to.name as string)) return

  // Check if user is authenticated
  const auth = useAuthStore()
  if (!auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

export { routes }
export default router
