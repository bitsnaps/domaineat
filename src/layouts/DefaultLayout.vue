<script setup lang="ts">
import Sidebar from '@/components/Sidebar.vue'
import Navbar from '@/components/Navbar.vue'
</script>

<template>
  <div class="d-flex h-100">
    <Sidebar />
    <div class="d-flex flex-column flex-grow-1 overflow-hidden" style="background: var(--gray-50);">
      <Navbar />
      <div class="d-flex flex-grow-1 overflow-hidden">
        <main class="flex-grow-1 overflow-auto p-4">
          <RouterView />
        </main>
      </div>
    </div>
  </div>
</template>
