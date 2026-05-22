import { createRouter, createWebHistory } from 'vue-router'

// Layouts
const AppLayout = () => import('@/layouts/AppLayout.vue')
const DefaultLayout = () => import('@/layouts/DefaultLayout.vue')

// Views — landing page (no sidebar)
const DashboardView = () => import('@/views/DashboardView.vue')

// Views — app pages (with sidebar)
const DomainsView = () => import('@/views/DomainsView.vue')
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
  // Authenticated app pages — sidebar + navbar
  {
    path: '/',
    component: DefaultLayout,
    children: [
      { path: 'domains', name: 'domains', component: DomainsView },
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

export default router
