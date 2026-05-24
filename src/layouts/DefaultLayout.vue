<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import Navbar from '@/components/Navbar.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import { useAppStateStore } from '@/stores/appState'

const appState = useAppStateStore()
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const mobileSidebarOpen = ref(false)

function toggleMobileSidebar() {
  mobileSidebarOpen.value = !mobileSidebarOpen.value
}

function closeMobileSidebar() {
  mobileSidebarOpen.value = false
}

// On mobile, when the Navbar hamburger triggers toggleSidebar,
// we instead toggle the mobile overlay sidebar
watch(() => appState.sidebarCollapsed, (newVal, oldVal) => {
  if (isMobile.value && newVal !== oldVal) {
    toggleMobileSidebar()
  }
})


</script>

<template>
  <div class="d-flex h-100">
    <!-- Mobile overlay -->
    <div
      class="sidebar-overlay"
      :class="{ show: isMobile && mobileSidebarOpen }"
      @click="closeMobileSidebar"
    ></div>

    <!-- Sidebar -->
    <Sidebar
      :class="{
        'sidebar-mobile-open': isMobile && mobileSidebarOpen,
      }"
    />

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
