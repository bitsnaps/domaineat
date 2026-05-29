<script setup lang="ts">
import { useAppStateStore } from '@/stores/appState'
const appState = useAppStateStore()
</script>

<template>
 <Teleport to="body">
 <!-- Backdrop -->
 <Transition name="mobile-menu-fade">
 <div
 v-if="appState.mobileMenuOpen"
 class="mobile-menu-backdrop"
 @click="appState.closeMobileMenu"
 ></div>
 </Transition>

 <!-- Slide-out panel from right -->
 <Transition name="mobile-menu-slide">
 <div v-if="appState.mobileMenuOpen" class="mobile-menu-panel">
 <!-- Header -->
 <div class="mobile-menu-header">
			<router-link to="/" class="mobile-menu-brand text-decoration-none" @click="appState.closeMobileMenu">
				Domain<span style="color: var(--primary);">eat</span>
			</router-link>
 <button
 class="btn btn-sm btn-outline-secondary"
 @click="appState.closeMobileMenu"
 aria-label="Close menu"
 >
 <i class="bi bi-x-lg"></i>
 </button>
 </div>

 <hr class="my-2" />

 <!-- Navigation -->
 <ul class="nav nav-pills flex-column gap-1 mt-2">
 <li class="nav-item">
 <router-link to="/home" class="nav-link d-flex align-items-center" active-class="active"
 @click="appState.closeMobileMenu">
 <i class="bi bi-speedometer2 me-3"></i>
 <span>Dashboard</span>
 </router-link>
 </li>
			<li class="nav-item">
				<router-link to="/domains" class="nav-link d-flex align-items-center" active-class="active"
					@click="appState.closeMobileMenu">
					<i class="bi bi-globe me-3"></i>
					<span>Domains</span>
				</router-link>
			</li>
			<li class="nav-item">
				<router-link to="/lookup" class="nav-link d-flex align-items-center" active-class="active"
					@click="appState.closeMobileMenu">
					<i class="bi bi-search me-3"></i>
					<span>Lookup</span>
				</router-link>
			</li>
			<li class="nav-item">
				<router-link to="/ledger" class="nav-link d-flex align-items-center" active-class="active"
					@click="appState.closeMobileMenu">
					<i class="bi bi-cash-stack me-3"></i>
					<span>Ledger</span>
				</router-link>
			</li>
			<li class="nav-item">
				<router-link to="/prospects" class="nav-link d-flex align-items-center" active-class="active"
					@click="appState.closeMobileMenu">
					<i class="bi bi-people me-3"></i>
					<span>Prospects</span>
				</router-link>
			</li>
			<li class="nav-item">
				<router-link to="/watchlist" class="nav-link d-flex align-items-center" active-class="active"
					@click="appState.closeMobileMenu">
					<i class="bi bi-eye me-3"></i>
					<span>Watchlist</span>
				</router-link>
			</li>
			<li class="nav-item">
				<router-link to="/wishlist" class="nav-link d-flex align-items-center" active-class="active"
					@click="appState.closeMobileMenu">
					<i class="bi bi-heart me-3"></i>
					<span>Wishlist</span>
				</router-link>
			</li>
			<li class="nav-item">
				<router-link to="/settings" class="nav-link d-flex align-items-center" active-class="active"
					@click="appState.closeMobileMenu">
					<i class="bi bi-gear me-3"></i>
					<span>Settings</span>
				</router-link>
			</li>
 </ul>

 <!-- Footer -->
 <div class="mobile-menu-footer mt-auto pt-3 border-top">
 <button
 class="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
 @click="appState.toggleTheme(); appState.closeMobileMenu()"
 >
 <i class="bi" :class="appState.theme === 'dark' ? 'bi-sun' : 'bi-moon'"></i>
 {{ appState.theme === 'dark' ? 'Light Mode' : 'Dark Mode' }}
 </button>
 </div>
 </div>
 </Transition>
 </Teleport>
</template>

<style scoped>
.mobile-menu-backdrop {
 position: fixed;
 inset: 0;
 background: rgba(0, 0, 0, 0.5);
 z-index: 1050;
}

.mobile-menu-panel {
 position: fixed;
 top: 0;
 right: 0;
 bottom: 0;
 width: 280px;
 max-width: 85vw;
 z-index: 1060;
 background: var(--bs-body-bg, #fff);
 border-left: 1px solid var(--gray-200);
 box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
 display: flex;
 flex-direction: column;
 padding: 1rem 1.25rem;
 overflow-y: auto;
}

.mobile-menu-header {
 display: flex;
 align-items: center;
 justify-content: space-between;
}

.mobile-menu-brand {
 font-family: var(--font-display);
 font-weight: 700;
 font-size: 1.1rem;
 color: var(--dark);
}

.mobile-menu-panel .nav-link {
 color: var(--gray-700);
 font-weight: 500;
 font-size: 0.95rem;
 border-radius: 0.5rem;
 padding: 0.65rem 1rem;
 transition: all 0.2s;
}

.mobile-menu-panel .nav-link:hover {
 color: var(--primary);
 background: rgba(99, 102, 241, 0.06);
}

.mobile-menu-panel .nav-link.active {
 color: var(--primary);
 background: rgba(99, 102, 241, 0.1);
 font-weight: 600;
}

.mobile-menu-footer {
 border-color: var(--gray-200) !important;
}

/* ── Vue transition classes ── */
.mobile-menu-fade-enter-active,
.mobile-menu-fade-leave-active {
 transition: opacity 0.25s ease;
}
.mobile-menu-fade-enter-from,
.mobile-menu-fade-leave-to {
 opacity: 0;
}

.mobile-menu-slide-enter-active,
.mobile-menu-slide-leave-active {
 transition: transform 0.3s ease;
}
.mobile-menu-slide-enter-from,
.mobile-menu-slide-leave-to {
 transform: translateX(100%);
}

/* ── Dark mode ── */
:deep([data-bs-theme='dark']) .mobile-menu-panel {
 background: #0f172a;
 border-left-color: #1e293b;
}
</style>
