<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// Mobile nav toggle (replaces Bootstrap JS collapse)
const navOpen = ref(false)

function toggleNav() {
	navOpen.value = !navOpen.value
}

function closeNav() {
	navOpen.value = false
}

// Animated counter for stats
const stats = ref([
  { value: 0, target: 847, label: 'Domains Tracked', suffix: '+' },
  { value: 0, target: 124, label: 'Saved on Renewals', prefix: '$', suffix: 'K' },
  { value: 0, target: 2340, label: 'Prospects Found', suffix: '+' },
  { value: 0, target: 97, label: 'Uptime', suffix: '%' },
])

function animateCounters() {
  stats.value.forEach((stat) => {
    const duration = 2000
    const step = stat.target / (duration / 16)
    const interval = setInterval(() => {
      stat.value += step
      if (stat.value >= stat.target) {
        stat.value = stat.target
        clearInterval(interval)
      }
    }, 16)
  })
}

onMounted(() => {
  setTimeout(animateCounters, 300)
})

const features = [
  {
    icon: 'bi-grid-1x2-fill',
    title: 'Portfolio Dashboard',
    desc: 'Centralized view of all your domains across registrars. Track expiry dates, costs, and status at a glance.',
  },
  {
    icon: 'bi-cash-stack',
    title: 'Financial Ledger',
    desc: 'Amortized cost tracking, renewal forecasting, and portfolio burn rate analysis. Know your numbers.',
  },
  {
    icon: 'bi-bullseye',
    title: 'Prospect Engine',
    desc: 'Find potential buyers with automated company lookup, outreach tracking, and contact management.',
  },
  {
    icon: 'bi-graph-up-arrow',
    title: 'Valuation Insights',
    desc: 'AI-powered domain valuation combining backlink data, search volume, and comparable sales.',
  },
  {
    icon: 'bi-shield-check',
    title: 'Expiry Sentinel',
    desc: 'Never lose a domain. Smart alerts for upcoming expirations with auto-renew recommendations.',
  },
  {
    icon: 'bi-plug-fill',
    title: 'Registrar API Hub',
    desc: 'Connect GoDaddy, Porkbun, Cloudflare, NameSilo and more. One API to rule them all.',
  },
]

const domains = [
  { name: 'ai ventures.com', registrar: 'Cloudflare', price: '$12.00/yr', days: 284, status: 'safe' },
  { name: 'neural.io', registrar: 'Porkbun', price: '$8.50/yr', days: 142, status: 'warning' },
  { name: 'prompt.ai', registrar: 'GoDaddy', price: '$42.00/yr', days: 23, status: 'danger' },
  { name: 'dataforge.dev', registrar: 'NameSilo', price: '$6.99/yr', days: 361, status: 'safe' },
]

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    popular: false,
    features: [
      'Up to 25 domains',
      'Basic ledger',
      'Expiry alerts',
      '1 registrar API',
      'Prospect engine',
      'Valuation insights',
    ],
    cta: 'Get Started Free',
    ctaClass: 'btn-pricing',
  },
  {
    name: 'Premium',
    price: '$9',
    period: '/month',
    popular: true,
    features: [
      'Unlimited domains',
      'Full ledger + reports',
      'Prospect engine',
      'All registrar APIs',
      'Valuation insights',
      'Priority support',
    ],
    cta: 'Upgrade to Premium',
    ctaClass: 'btn-pricing btn-pricing-primary',
  },
  {
    name: 'Enterprise',
    price: '$49',
    period: '/month',
    popular: false,
    features: [
      'Everything in Premium',
      'Team accounts (5 seats)',
      'Webhook integrations',
      'Custom valuations',
      'SLA guarantee',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    ctaClass: 'btn-pricing',
  },
]
</script>

<template>
  <div class="landing">
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg fixed-top">
      <div class="container">
        <router-link to="/" class="navbar-brand">Domain<span>eat</span></router-link>
 <button class="navbar-toggler" type="button" :aria-expanded="navOpen" aria-label="Toggle navigation" @click="toggleNav">
 <span class="navbar-toggler-icon"></span>
 </button>
 <div class="navbar-collapse" :class="{ collapse: !navOpen }" id="navbarNav">
		<ul class="navbar-nav ms-auto align-items-center">
				<li class="nav-item"><a class="nav-link" href="#features" @click="closeNav">Features</a></li>
				<li class="nav-item"><a class="nav-link" href="#pricing" @click="closeNav">Pricing</a></li>
				<li v-if="auth.isLoggedIn" class="nav-item ms-lg-3">
					<router-link to="/home" class="btn btn-nav btn-nav-primary" @click="closeNav">
						<i class="bi bi-grid-1x2-fill me-1"></i> Dashboard
					</router-link>
				</li>
				<template v-else>
					<li class="nav-item ms-lg-3">
						<router-link to="/domains" class="btn btn-nav" @click="closeNav">Log in</router-link>
					</li>
					<li class="nav-item ms-2">
						<router-link to="/domains" class="btn btn-nav btn-nav-primary" @click="closeNav">Get Started</router-link>
					</li>
				</template>
 </ul>
 </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-grid"></div>
      <div class="container position-relative">
        <div class="row justify-content-center text-center">
          <div class="col-lg-8">
            <div class="badge-early">
              <span class="pulse-dot"></span>
              Now in Early Access
            </div>
            <h1>Your Domain Portfolio.<br><span class="text-gradient">Finally Organized.</span></h1>
            <p>Domaineat is the intelligent command center for domain investors. Track portfolios, manage finances, find buyers, and never miss a renewal — all in one beautiful dashboard.</p>
            <div class="hero-cta justify-content-center">
		<router-link :to="auth.isLoggedIn ? '/home' : '/domains'" class="btn btn-hero btn-hero-primary">
				{{ auth.isLoggedIn ? 'Go to Dashboard' : 'Start Free' }} <i class="bi bi-arrow-right"></i>
			</router-link>
              <a href="#features" class="btn btn-hero btn-hero-secondary">
                <i class="bi bi-play-circle"></i> Watch Demo
              </a>
            </div>
            <div class="hero-note justify-content-center">
              <span><i class="bi bi-check-circle-fill"></i> No credit card required</span>
              <span><i class="bi bi-check-circle-fill"></i> Free tier forever</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Dashboard Preview -->
    <section class="dashboard-section">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <div class="portfolio-badge">
              <i class="bi bi-globe2"></i> Live Portfolio
            </div>
            <div class="dashboard-card">
              <div class="dashboard-header">
                <div class="dashboard-dots">
                  <span class="dot-red"></span>
                  <span class="dot-yellow"></span>
                  <span class="dot-green"></span>
                </div>
                <span class="dashboard-title">Portfolio</span>
                <span class="ms-auto dashboard-active">12 active</span>
              </div>
              <div class="dashboard-body">
                <div v-for="domain in domains" :key="domain.name" class="domain-row">
                  <div class="domain-icon"><i class="bi bi-globe"></i></div>
                  <div class="domain-info">
                    <div class="domain-name">{{ domain.name }}</div>
                    <div class="domain-registrar">{{ domain.registrar }}</div>
                  </div>
                  <div class="domain-price">{{ domain.price }}</div>
                  <div class="domain-days" :class="'days-' + domain.status">
                    {{ domain.days }} days left
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="stats-section">
      <div class="container">
        <div class="row align-items-center justify-content-center">
          <div v-for="stat in stats" :key="stat.label" class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-number">
                <span>{{ stat.prefix || '' }}{{ Math.round(stat.value).toLocaleString() }}{{ stat.suffix || '' }}</span>
              </div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features-section" id="features">
      <div class="container">
        <div class="section-header">
          <div class="section-label"><i class="bi bi-stars"></i> Features</div>
          <h2>Everything You Need to <span class="text-gradient-inline">Eat the Domain Game</span></h2>
          <p>From portfolio tracking to buyer outreach, Domaineat covers the entire domain investment lifecycle.</p>
        </div>
        <div class="row g-4">
          <div v-for="feature in features" :key="feature.title" class="col-md-6 col-lg-4">
            <div class="feature-card">
              <div class="feature-icon"><i :class="'bi ' + feature.icon"></i></div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section class="pricing-section" id="pricing">
      <div class="container">
        <div class="section-header">
          <div class="section-label"><i class="bi bi-tag-fill"></i> Pricing</div>
          <h2>Simple, Transparent Pricing</h2>
          <p>Start free. Upgrade when your portfolio grows.</p>
        </div>
        <div class="row g-4 justify-content-center align-items-stretch">
          <div v-for="plan in pricingPlans" :key="plan.name" class="col-md-4">
            <div class="pricing-card" :class="{ popular: plan.popular }">
              <div v-if="plan.popular" class="popular-badge">Most Popular</div>
              <div class="pricing-name">{{ plan.name }}</div>
              <div class="pricing-price" v-html="plan.price + (plan.period.includes('/') ? '<span>' + plan.period + '</span>' : '')"></div>
              <div v-if="!plan.period.includes('/')" class="pricing-price"><span></span></div>
              <div class="pricing-period">{{ plan.period.includes('/') ? 'Unlimited power' : plan.period }}</div>
              <ul class="pricing-features">
                <li v-for="feat in plan.features" :key="feat">
                  <i class="bi bi-check-circle-fill"></i> {{ feat }}
                </li>
              </ul>
              <button :class="'btn ' + plan.ctaClass">{{ plan.cta }}</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-content">
          <h2>Ready to Dominate Your Domain Portfolio?</h2>
          <p>Join hundreds of domain investors who already manage their portfolios smarter.</p>
		<router-link :to="auth.isLoggedIn ? '/home' : '/domains'" class="btn btn-cta">
				{{ auth.isLoggedIn ? 'Go to Dashboard' : 'Get Started Free' }} <i class="bi bi-arrow-right"></i>
			</router-link>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-brand">Domain<span>eat</span></div>
        <div class="footer-copy">&copy; {{ new Date().getFullYear() }} Domaineat</div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ── Navigation ─────────────────────────────────────────────── */
.navbar {
  padding: 1.25rem 0;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(203, 213, 225, 0.3);
  z-index: 1030;
}

.navbar-brand {
  font-family: var(--font-display) !important;
  font-weight: 700 !important;
  font-size: 1.5rem !important;
  color: var(--dark) !important;
  letter-spacing: -0.03em;
  text-decoration: none;
}

.navbar-brand span {
  color: var(--primary);
}

.nav-link {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--gray-700) !important;
  padding: 0.5rem 1rem !important;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--primary) !important;
}

.btn-nav {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.625rem 1.5rem;
  border-radius: 0.75rem;
  border: 1.5px solid var(--gray-300);
  color: var(--gray-700);
  background: transparent;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-nav:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.btn-nav-primary {
  background: var(--dark);
  color: #fff !important;
  border-color: var(--dark);
}

.btn-nav-primary:hover {
 background: var(--gray-900);
 border-color: var(--gray-900);
 color: #fff !important;
}

/* ── Mobile nav toggle (Vue-driven, no Bootstrap JS) ─── */
.navbar-toggler {
 border: none;
 padding: 0.5rem 0.75rem;
}

.navbar-toggler:focus {
 box-shadow: none;
}

/* On mobile, collapsed nav is hidden; open nav slides down */
@media (max-width: 991.98px) {
 .navbar-collapse.collapse {
 display: none !important;
 }

 .navbar-collapse:not(.collapse) {
 display: flex !important;
 flex-direction: column;
 padding: 1rem 0;
 border-top: 1px solid rgba(203, 213, 225, 0.3);
 animation: navSlideDown 0.25s ease-out;
 }

 .navbar-collapse:not(.collapse) .navbar-nav {
 flex-direction: column;
 width: 100%;
 gap: 0.25rem;
 }

 .navbar-collapse:not(.collapse) .nav-item {
 width: 100%;
 }

 .navbar-collapse:not(.collapse) .nav-link {
 padding: 0.75rem 0 !important;
 }
}

@keyframes navSlideDown {
 from {
 opacity: 0;
 transform: translateY(-8px);
 }
 to {
 opacity: 1;
 transform: translateY(0);
 }
}

/* ── Hero Section ────────────────────────────────────────────── */
.hero {
  position: relative;
  padding: 8rem 0 6rem;
  background: var(--darker);
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent),
    radial-gradient(ellipse 60% 40% at 80% 80%, rgba(245, 158, 11, 0.08), transparent);
  pointer-events: none;
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent);
  -webkit-mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent);
}

.badge-early {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 2rem;
  color: var(--primary-light);
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 1.5rem;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--primary-light);
  border-radius: 50%;
  box-shadow: 0 0 12px var(--primary-light);
  animation: pulse 2s infinite;
  display: inline-block;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

.hero h1 {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  font-weight: 700;
  color: #fff;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin-bottom: 1.5rem;
}

.hero p {
  font-size: 1.125rem;
  color: var(--gray-400);
  max-width: 560px;
  line-height: 1.7;
  margin: 0 auto 2rem;
}

.hero-cta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.btn-hero {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.9375rem;
  padding: 0.875rem 2rem;
  border-radius: 0.875rem;
  border: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.btn-hero-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: #fff;
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.3);
}

.btn-hero-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4);
  color: #fff;
}

.btn-hero-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
}

.btn-hero-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.hero-note {
  display: flex;
  gap: 1.5rem;
  font-size: 0.8125rem;
  color: var(--gray-600);
  font-weight: 500;
}

.hero-note i {
  color: var(--success);
  margin-right: 0.25rem;
}

/* ── Dashboard Preview ───────────────────────────────────────── */
.dashboard-section {
  position: relative;
  margin-top: -4rem;
  padding-bottom: 5rem;
}

.portfolio-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary-light);
  background: rgba(99, 102, 241, 0.1);
  padding: 0.375rem 0.875rem;
  border-radius: 2rem;
  margin-bottom: 1rem;
}

.dashboard-card {
  background: var(--gray-900);
  border-radius: 1.5rem;
  border: 1px solid rgba(99, 102, 241, 0.15);
  overflow: hidden;
  box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

.dashboard-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dashboard-dots {
  display: flex;
  gap: 0.5rem;
}

.dashboard-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-red { background: #ef4444; }
.dot-yellow { background: #f59e0b; }
.dot-green { background: #10b981; }

.dashboard-title {
  font-family: var(--font-display);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-400);
  margin-left: 0.5rem;
}

.dashboard-active {
  color: var(--gray-600);
  font-size: 0.75rem;
  font-weight: 600;
}

.dashboard-body {
  padding: 1.5rem;
}

.domain-row {
  display: flex;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  gap: 1rem;
}

.domain-row:last-child {
  border-bottom: none;
}

.domain-icon {
  width: 40px;
  height: 40px;
  border-radius: 0.75rem;
  background: rgba(99, 102, 241, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-light);
  font-size: 1rem;
  flex-shrink: 0;
}

.domain-info {
  flex: 1;
  min-width: 0;
}

.domain-name {
  font-family: var(--font-display);
  font-weight: 600;
  color: #fff;
  font-size: 0.9375rem;
  letter-spacing: -0.01em;
}

.domain-registrar {
  font-size: 0.75rem;
  color: var(--gray-600);
  font-weight: 500;
}

.domain-price {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--gray-300);
  font-size: 0.875rem;
  text-align: right;
}

.domain-days {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  white-space: nowrap;
}

.days-safe {
  background: rgba(16, 185, 129, 0.12);
  color: var(--success);
}

.days-warning {
  background: rgba(245, 158, 11, 0.12);
  color: var(--warning);
}

.days-danger {
  background: rgba(239, 68, 68, 0.12);
  color: var(--danger);
}

/* ── Stats Section ───────────────────────────────────────────── */
.stats-section {
  padding: 4rem 0;
  background: var(--gray-50);
}

.stat-card {
  text-align: center;
  padding: 2rem 1rem;
}

.stat-number {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-number span {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--gray-600);
  font-weight: 500;
}

.stat-divider {
  width: 1px;
  background: var(--gray-300);
  height: 60px;
  margin: auto 0;
}

/* ── Features Section ────────────────────────────────────────── */
.features-section {
  padding: 6rem 0;
  background: #fff;
  position: relative;
}

.features-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gray-300), transparent);
}

.section-header {
  text-align: center;
  max-width: 640px;
  margin: 0 auto 4rem;
}

.section-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary);
  margin-bottom: 1rem;
}

.section-header h2 {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 700;
  margin-bottom: 1rem;
}

.section-header p {
  color: var(--gray-600);
  font-size: 1.0625rem;
}

.text-gradient-inline {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.feature-card {
  padding: 2.5rem;
  border-radius: 1.25rem;
  background: var(--gray-50);
  border: 1px solid var(--gray-100);
  height: 100%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  opacity: 0;
  transition: opacity 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.08);
  border-color: var(--gray-200);
}

.feature-card:hover::before {
  opacity: 1;
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 1rem;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25);
}

.feature-card h3 {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.feature-card p {
  font-size: 0.9375rem;
  color: var(--gray-600);
  line-height: 1.7;
  margin-bottom: 0;
}

/* ── Pricing Section ─────────────────────────────────────────── */
.pricing-section {
  padding: 6rem 0;
  background: var(--gray-50);
  position: relative;
}

.pricing-card {
  background: #fff;
  border-radius: 1.5rem;
  border: 1px solid var(--gray-200);
  padding: 2.5rem;
  height: 100%;
  position: relative;
  transition: all 0.3s;
}

.pricing-card:hover {
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.pricing-card.popular {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary), 0 24px 48px -12px rgba(99, 102, 241, 0.15);
  transform: scale(1.02);
}

.pricing-card.popular:hover {
  transform: scale(1.02) translateY(-4px);
}

.popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: #fff;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.375rem 1rem;
  border-radius: 2rem;
  letter-spacing: 0.02em;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.pricing-name {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--dark);
  margin-bottom: 0.25rem;
}

.pricing-price {
  font-family: var(--font-display);
  font-size: 3.5rem;
  font-weight: 700;
  color: var(--dark);
  line-height: 1;
  margin: 1.25rem 0 0.25rem;
  letter-spacing: -0.03em;
}

.pricing-price span {
  font-size: 1rem;
  font-weight: 500;
  color: var(--gray-600);
  vertical-align: baseline;
}

.pricing-period {
  font-size: 0.875rem;
  color: var(--gray-600);
  font-weight: 500;
  margin-bottom: 2rem;
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem;
}

.pricing-features li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0;
  font-size: 0.9375rem;
  color: var(--gray-700);
}

.pricing-features li i {
  color: var(--success);
  font-size: 1.125rem;
  flex-shrink: 0;
}

.btn-pricing {
  width: 100%;
  padding: 0.875rem;
  border-radius: 0.875rem;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.9375rem;
  border: 1.5px solid var(--gray-300);
  background: transparent;
  color: var(--gray-700);
  transition: all 0.2s;
}

.btn-pricing:hover {
  border-color: var(--dark);
  color: var(--dark);
}

.btn-pricing-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.25);
}

.btn-pricing-primary:hover {
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
  color: #fff;
  transform: translateY(-1px);
}

/* ── CTA Section ─────────────────────────────────────────────── */
.cta-section {
  padding: 6rem 0;
  background: var(--dark);
  position: relative;
  overflow: hidden;
}

.cta-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 50% 100%, rgba(99, 102, 241, 0.12), transparent),
    radial-gradient(ellipse 40% 30% at 20% 0%, rgba(245, 158, 11, 0.06), transparent);
}

.cta-content {
  position: relative;
  text-align: center;
  max-width: 640px;
  margin: 0 auto;
}

.cta-content h2 {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  color: #fff;
  font-weight: 700;
  margin-bottom: 1rem;
}

.cta-content p {
  color: var(--gray-500);
  font-size: 1.0625rem;
  margin-bottom: 2rem;
}

.btn-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: #fff;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 1rem;
  border-radius: 1rem;
  border: none;
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.3);
  transition: all 0.3s;
  text-decoration: none;
}

.btn-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4);
  color: #fff;
}

/* ── Footer ──────────────────────────────────────────────────── */
.footer {
  padding: 3rem 0;
  background: var(--darker);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
}

.footer-brand {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.25rem;
  color: #fff;
  margin-bottom: 0.5rem;
  display: inline-block;
}

.footer-brand span {
  color: var(--primary);
}

.footer-copy {
  color: var(--gray-700);
  font-size: 0.875rem;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 991.98px) {
  .hero {
    padding: 6rem 0 4rem;
  }
}

@media (max-width: 767.98px) {
  .hero h1 {
    font-size: 2.25rem;
  }
  .dashboard-section {
    margin-top: -2rem;
  }
  .feature-card {
    padding: 1.75rem;
  }
}
</style>
