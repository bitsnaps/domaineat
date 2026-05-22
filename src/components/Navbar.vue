<script setup lang="ts">
import { useAppStateStore } from '@/stores/appState'
const appState = useAppStateStore()
</script>

<template>
  <nav class="navbar navbar-expand bg-body-tertiary px-3" style="border-bottom: 1px solid rgba(255,255,255,0.15);">
    <button
      class="btn btn-sm btn-outline-secondary me-3"
      data-testid="sidebar-hamburger"
      @click="appState.toggleSidebar"
      :title="appState.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
    >
      <i class="bi bi-list fs-5"></i>
    </button>
    <span class="navbar-brand mb-0 h1 text-body-secondary fs-6">Domaineat</span>
    <div class="ms-auto d-flex align-items-center gap-2">
      <button
        class="btn btn-sm btn-outline-secondary"
        data-testid="theme-toggle"
        @click="appState.toggleTheme"
        :title="appState.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <i class="bi" :class="appState.theme === 'dark' ? 'bi-sun' : 'bi-moon'"></i>
      </button>
    </div>
  </nav>
</template>
