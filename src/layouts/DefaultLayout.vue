<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import Navbar from '@/components/Navbar.vue'
import MobileMenu from '@/components/MobileMenu.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import { useAppStateStore } from '@/stores/appState'

const appState = useAppStateStore()
const route = useRoute()

// Close mobile menu on route change
watch(route, () => {
 appState.closeMobileMenu()
})
</script>

<template>
 <div class="d-flex h-100">
 <!-- Desktop sidebar (hidden on mobile) -->
 <Sidebar class="d-none d-md-flex" />

 <div class="d-flex flex-column flex-grow-1 overflow-hidden default-layout-main" style="background: var(--gray-50);">
 <Navbar />
 <div class="d-flex flex-grow-1 overflow-hidden">
 <main class="flex-grow-1 overflow-auto p-4">
 <RouterView />
 </main>
 </div>
 </div>

 <!-- Mobile slide-out menu (right side) -->
 <MobileMenu />

 <!-- Toast Notifications -->
 <ToastNotification />
 </div>
</template>

<style scoped>
.default-layout-main {
 min-width: 0;
}

@media (max-width: 767.98px) {
 .default-layout-main {
 width: 100%;
 }
}
</style>
