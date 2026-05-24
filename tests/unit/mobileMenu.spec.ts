import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import MobileMenu from '@/components/MobileMenu.vue'
import { useAppStateStore } from '@/stores/appState'

const routes = [
 { path: '/home', component: { template: '<div>Home</div>' } },
 { path: '/domains', component: { template: '<div>Domains</div>' } },
 { path: '/ledger', component: { template: '<div>Ledger</div>' } },
 { path: '/prospects', component: { template: '<div>Prospects</div>' } },
 { path: '/settings', component: { template: '<div>Settings</div>' } },
]

async function createTestRouter() {
 const router = createRouter({
 history: createMemoryHistory(),
 routes,
 })
 await router.push('/home')
 await router.isReady()
 return router
}

// Teleport renders to document.body, so we query there
function findInBody(selector: string) {
 return document.body.querySelector(selector)
}

function findAllInBody(selector: string) {
 return document.body.querySelectorAll(selector)
}

describe('MobileMenu', () => {
 let pinia: ReturnType<typeof createPinia>

 beforeEach(async () => {
 pinia = createPinia()
 setActivePinia(pinia)
 // Clean up any leftover teleported content
 document.body.innerHTML = ''
 })

 afterEach(() => {
 // Clean up teleported content after each test
 document.body.innerHTML = ''
 })

 it('does not render panel when mobileMenuOpen is false', async () => {
 const router = await createTestRouter()
 mount(MobileMenu, {
 global: { plugins: [pinia, router] },
 attachTo: document.body,
 })
 expect(findInBody('.mobile-menu-panel')).toBeNull()
 expect(findInBody('.mobile-menu-backdrop')).toBeNull()
 })

 it('renders panel and backdrop when mobileMenuOpen is true', async () => {
 const store = useAppStateStore()
 store.mobileMenuOpen = true

 const router = await createTestRouter()
 mount(MobileMenu, {
 global: { plugins: [pinia, router] },
 attachTo: document.body,
 })

 // Wait for transitions to settle
 await new Promise(r => setTimeout(r, 50))

 expect(findInBody('.mobile-menu-panel')).not.toBeNull()
 expect(findInBody('.mobile-menu-backdrop')).not.toBeNull()
 })

 it('closes menu when backdrop is clicked', async () => {
 const store = useAppStateStore()
 store.mobileMenuOpen = true

 const router = await createTestRouter()
 mount(MobileMenu, {
 global: { plugins: [pinia, router] },
 attachTo: document.body,
 })

 await new Promise(r => setTimeout(r, 50))

 const backdrop = findInBody('.mobile-menu-backdrop')
 expect(backdrop).not.toBeNull()
 backdrop!.dispatchEvent(new Event('click'))

 expect(store.mobileMenuOpen).toBe(false)
 })

 it('closes menu when close button is clicked', async () => {
 const store = useAppStateStore()
 store.mobileMenuOpen = true

 const router = await createTestRouter()
 mount(MobileMenu, {
 global: { plugins: [pinia, router] },
 attachTo: document.body,
 })

 await new Promise(r => setTimeout(r, 50))

 const closeBtn = findInBody('.mobile-menu-header button')
 expect(closeBtn).not.toBeNull()
 closeBtn!.dispatchEvent(new Event('click'))

 expect(store.mobileMenuOpen).toBe(false)
 })

 it('renders all 5 nav links', async () => {
 const store = useAppStateStore()
 store.mobileMenuOpen = true

 const router = await createTestRouter()
 mount(MobileMenu, {
 global: { plugins: [pinia, router] },
 attachTo: document.body,
 })

 await new Promise(r => setTimeout(r, 50))

 const links = findAllInBody('.mobile-menu-panel .nav-link')
 expect(links.length).toBe(5)
 })

 it('has theme toggle button in footer', async () => {
 const store = useAppStateStore()
 store.mobileMenuOpen = true

 const router = await createTestRouter()
 mount(MobileMenu, {
 global: { plugins: [pinia, router] },
 attachTo: document.body,
 })

 await new Promise(r => setTimeout(r, 50))

 expect(findInBody('.mobile-menu-footer button')).not.toBeNull()
 })
})
