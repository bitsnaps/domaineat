import { createRouter, createWebHistory } from 'vue-router'

// Placeholder views — will be replaced with real components
const DashboardView = () => import('@/views/DashboardView.vue')
const DomainsView = () => import('@/views/DomainsView.vue')
const LedgerView = () => import('@/views/LedgerView.vue')
const ProspectsView = () => import('@/views/ProspectsView.vue')
const SettingsView = () => import('@/views/SettingsView.vue')

const routes = [
  { path: '/', name: 'dashboard', component: DashboardView },
  { path: '/domains', name: 'domains', component: DomainsView },
  { path: '/ledger', name: 'ledger', component: LedgerView },
  { path: '/prospects', name: 'prospects', component: ProspectsView },
  { path: '/settings', name: 'settings', component: SettingsView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
