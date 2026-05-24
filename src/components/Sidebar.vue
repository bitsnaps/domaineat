<script setup lang="ts">
import { useAppStateStore } from '@/stores/appState'
const appState = useAppStateStore()
</script>

<template>
  <aside
    class="sidebar d-flex flex-column border-end"
    :class="{ 'sidebar-collapsed': appState.sidebarCollapsed }"
  >
  <router-link to="/home" class="sidebar-brand d-flex align-items-center mb-3 text-decoration-none">
    <i class="bi bi-globe2 fs-3" style="color: var(--primary);"></i>
    <span class="sidebar-label fs-5 fw-bold ms-2" style="font-family: var(--font-display); color: var(--dark);">
      Domain<span style="color: var(--primary);">eat</span>
    </span>
  </router-link>
  <hr />

  <ul class="nav nav-pills flex-column mb-auto gap-1">
    <li class="nav-item">
      <router-link to="/home" class="nav-link d-flex align-items-center" active-class="active"
        :title="appState.sidebarCollapsed ? 'Dashboard' : ''">
        <i class="bi bi-speedometer2 sidebar-icon"></i>
        <span class="sidebar-label ms-3">Dashboard</span>
      </router-link>
    </li>
    <li class="nav-item">
      <router-link to="/domains" class="nav-link d-flex align-items-center" active-class="active"
        :title="appState.sidebarCollapsed ? 'Domains' : ''">
        <i class="bi bi-globe sidebar-icon"></i>
        <span class="sidebar-label ms-3">Domains</span>
      </router-link>
    </li>
    <li class="nav-item">
      <router-link to="/ledger" class="nav-link d-flex align-items-center" active-class="active"
        :title="appState.sidebarCollapsed ? 'Ledger' : ''">
        <i class="bi bi-cash-stack sidebar-icon"></i>
        <span class="sidebar-label ms-3">Ledger</span>
      </router-link>
    </li>
    <li class="nav-item">
      <router-link to="/prospects" class="nav-link d-flex align-items-center" active-class="active"
        :title="appState.sidebarCollapsed ? 'Prospects' : ''">
        <i class="bi bi-search sidebar-icon"></i>
        <span class="sidebar-label ms-3">Prospects</span>
      </router-link>
    </li>
    <li class="nav-item">
      <router-link to="/settings" class="nav-link d-flex align-items-center" active-class="active"
        :title="appState.sidebarCollapsed ? 'Settings' : ''">
        <i class="bi bi-gear sidebar-icon"></i>
        <span class="sidebar-label ms-3">Settings</span>
      </router-link>
    </li>
  </ul>

  <hr />
  <button class="btn btn-sm btn-outline-secondary mt-2 sidebar-toggle-btn"
    @click="appState.toggleSidebar"
    :title="appState.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
    <i class="bi" :class="appState.sidebarCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'"></i>
  </button>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  padding: 1rem;
  transition: width 0.3s ease, padding 0.3s ease, transform 0.3s ease;
  overflow: hidden;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid var(--gray-200) !important;
}

.sidebar .nav-link {
  color: var(--gray-700);
  font-weight: 500;
  font-size: 0.9rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.sidebar .nav-link:hover {
  color: var(--primary);
  background: rgba(99, 102, 241, 0.06);
}

.sidebar .nav-link.active {
  color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
  font-weight: 600;
}

.sidebar-collapsed {
  width: 64px;
  padding: 1rem 0.5rem;
}

.sidebar-collapsed .sidebar-label {
  opacity: 0;
  width: 0;
  overflow: hidden;
  white-space: nowrap;
  transition: opacity 0.2s ease, width 0.2s ease;
}

.sidebar .sidebar-label {
  opacity: 1;
  transition: opacity 0.2s ease 0.1s, width 0.2s ease;
}

.sidebar-collapsed .nav-link {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.sidebar-collapsed .sidebar-brand {
  justify-content: center;
  margin-left: 0;
}

.sidebar-toggle-btn {
  width: 100%;
}

/* Mobile: hide the collapse toggle, use hamburger instead */
@media (max-width: 767.98px) {
  .sidebar-toggle-btn {
    display: none;
  }

  .sidebar {
    background: #fff;
  }
}
</style>
