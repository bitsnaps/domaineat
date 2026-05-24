<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import Navbar from '@/components/Navbar.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import { useAppStateStore } from '@/stores/appState'

const appState = useAppStateStore()
const route = useRoute()

function closeMobileSidebar() {
 appState.closeMobileMenu()
}

// Close mobile sidebar on route change
watch(route, () => {
 closeMobileSidebar()
})
</script>

<template>
 <div class="d-flex h-100">
 <!-- Mobile overlay -->
 <div
 class="sidebar-overlay"
 :class="{ show: appState.mobileMenuOpen }"
 @click="closeMobileSidebar"
 ></div>

 <!-- Sidebar (handles its own mobile-open class internally) -->
 <Sidebar />

 <div class="d-flex flex-column flex-grow-1 overflow-hidden default-layout-main" style="background: var(--gray-50);">
 <Navbar />
 <div class="d-flex flex-grow-1 overflow-hidden">
 <main class="flex-grow-1 overflow-auto p-4" @click="closeMobileSidebar">
 <RouterView />
 </main>
 </div>
 </div>

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
