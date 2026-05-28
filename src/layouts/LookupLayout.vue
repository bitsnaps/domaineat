<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
	<div class="lookup-layout">
		<!-- Public navbar -->
		<nav class="lookup-navbar">
			<div class="lookup-navbar-inner">
				<router-link to="/" class="lookup-brand">
					Domain<span>eat</span>
				</router-link>
				<div class="lookup-nav-links">
					<router-link to="/" class="lookup-nav-link">Home</router-link>
					<router-link to="/search" class="lookup-nav-link">Lookup</router-link>
					<router-link v-if="auth.isLoggedIn" to="/home" class="lookup-nav-link">Dashboard</router-link>
					<router-link v-else to="/login" class="lookup-nav-link">Sign in</router-link>
				</div>
			</div>
		</nav>

		<!-- Page content -->
		<main class="lookup-main">
			<RouterView />
		</main>
	</div>
</template>

<style scoped>
.lookup-layout {
	min-height: 100vh;
	background: var(--gray-50, #f8fafc);
}

/* ── Public Navbar ─────────────────────────────────────────── */
.lookup-navbar {
	position: sticky;
	top: 0;
	z-index: 1030;
	background: rgba(255, 255, 255, 0.85);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	border-bottom: 1px solid var(--gray-200, #e2e8f0);
}

.lookup-navbar-inner {
	max-width: 1400px;
	margin: 0 auto;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0.75rem 1.5rem;
}

.lookup-brand {
	font-family: var(--font-display);
	font-weight: 700;
	font-size: 1.25rem;
	color: var(--dark);
	text-decoration: none;
	letter-spacing: -0.03em;
}

.lookup-brand span {
	color: var(--primary);
}

.lookup-nav-links {
	display: flex;
	align-items: center;
	gap: 0.25rem;
}

.lookup-nav-link {
	font-family: var(--font-body);
	font-weight: 500;
	font-size: 0.875rem;
	color: var(--gray-600);
	padding: 0.5rem 1rem;
	border-radius: 0.5rem;
	text-decoration: none;
	transition: color 0.2s, background 0.2s;
}

.lookup-nav-link:hover {
	color: var(--primary);
	background: rgba(99, 102, 241, 0.06);
}

.lookup-nav-link.router-link-active {
	color: var(--primary);
	background: rgba(99, 102, 241, 0.1);
	font-weight: 600;
}

@media (max-width: 767.98px) {
	.lookup-navbar-inner {
		padding: 0.75rem 1rem;
	}
}
</style>
