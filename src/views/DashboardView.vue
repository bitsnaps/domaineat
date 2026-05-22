<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Animated counter for stats
const stats = ref([
  { icon: 'bi-globe2', value: 0, target: 847, label: 'Domains Tracked', suffix: '+' },
  { icon: 'bi-cash-stack', value: 0, target: 124, label: 'Saved on Renewals', prefix: '$', suffix: 'K' },
  { icon: 'bi-search', value: 0, target: 2340, label: 'Prospects Found', suffix: '+' },
  { icon: 'bi-graph-up-arrow', value: 0, target: 97, label: 'Uptime', suffix: '%' },
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
  // Trigger counters after a small delay for visual effect
  setTimeout(animateCounters, 300)
})

const features = [
  {
    icon: 'bi-globe2',
    title: 'Portfolio Dashboard',
    desc: 'Centralized view of all your domains across registrars. Track expiry dates, costs, and status at a glance.',
  },
  {
    icon: 'bi-cash-stack',
    title: 'Financial Ledger',
    desc: 'Amortized cost tracking, renewal forecasting, and portfolio burn rate analysis. Know your numbers.',
  },
  {
    icon: 'bi-search',
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
    icon: 'bi-plug',
    title: 'Registrar API Hub',
    desc: 'Connect GoDaddy, Porkbun, Cloudflare, NameSilo and more. One API to rule them all.',
  },
]
</script>

<template>
  <div class="landing">
    <!-- Hero Section -->
    <section class="hero-section py-5 position-relative overflow-hidden">
      <div class="hero-glow"></div>
      <div class="container position-relative" style="z-index: 2">
        <div class="row align-items-center min-vh-75 py-5">
          <div class="col-lg-7 text-center text-lg-start">
            <span class="badge bg-primary bg-opacity-25 text-primary px-3 py-2 mb-3 fs-6">
              <i class="bi bi-rocket-takeoff me-1"></i> Now in Early Access
            </span>
            <h1 class="display-3 fw-bold mb-4 lh-sm">
              Your Domain Portfolio.<br />
              <span class="text-primary">Finally Organized.</span>
            </h1>
            <p class="lead text-body-secondary mb-4 mx-auto mx-lg-0" style="max-width: 540px">
              Domaineat is the intelligent command center for domain investors. Track portfolios,
              manage finances, find buyers, and never miss a renewal — all in one beautiful dashboard.
            </p>
            <div class="d-flex flex-wrap gap-3 justify-content-center justify-content-lg-start">
              <router-link to="/domains" class="btn btn-primary btn-lg px-4 rounded-pill shadow-lg">
                <i class="bi bi-rocket-takeoff me-2"></i>Get Started Free
              </router-link>
              <a href="#features" class="btn btn-outline-light btn-lg px-4 rounded-pill">
                <i class="bi bi-play-circle me-2"></i>See How It Works
              </a>
            </div>
            <p class="text-body-secondary mt-3 small">
              <i class="bi bi-check-circle text-success me-1"></i> No credit card required
              <span class="ms-3"><i class="bi bi-check-circle text-success me-1"></i> Free tier forever</span>
            </p>
          </div>
          <div class="col-lg-5 mt-5 mt-lg-0">
            <div class="hero-card card border-0 shadow-lg rounded-4 overflow-hidden">
              <div class="card-header bg-primary d-flex justify-content-between align-items-center px-4 py-3" style="--bs-bg-opacity: 0.2">
                <span class="fw-bold text-primary"><i class="bi bi-globe2 me-2"></i>Portfolio</span>
                <span class="badge bg-success rounded-pill">12 active</span>
              </div>
              <div class="card-body p-0">
                <div class="list-group list-group-flush">
                  <div class="list-group-item d-flex justify-content-between align-items-center px-4 py-3">
                    <div>
                      <div class="fw-semibold">ai ventures<span class="text-primary">.com</span></div>
                      <small class="text-body-secondary">Cloudflare</small>
                    </div>
                    <div class="text-end">
                      <div class="fw-semibold text-success">$12.00/yr</div>
                      <small class="text-body-secondary">284 days left</small>
                    </div>
                  </div>
                  <div class="list-group-item d-flex justify-content-between align-items-center px-4 py-3">
                    <div>
                      <div class="fw-semibold">neural<span class="text-primary">.io</span></div>
                      <small class="text-body-secondary">Porkbun</small>
                    </div>
                    <div class="text-end">
                      <div class="fw-semibold text-success">$8.50/yr</div>
                      <small class="text-body-secondary">142 days left</small>
                    </div>
                  </div>
                  <div class="list-group-item d-flex justify-content-between align-items-center px-4 py-3">
                    <div>
                      <div class="fw-semibold">prompt<span class="text-warning">.ai</span></div>
                      <small class="text-body-secondary">GoDaddy</small>
                    </div>
                    <div class="text-end">
                      <div class="fw-semibold text-warning">$42.00/yr</div>
                      <small class="text-danger">23 days left</small>
                    </div>
                  </div>
                  <div class="list-group-item d-flex justify-content-between align-items-center px-4 py-3">
                    <div>
                      <div class="fw-semibold">dataforge<span class="text-primary">.dev</span></div>
                      <small class="text-body-secondary">NameSilo</small>
                    </div>
                    <div class="text-end">
                      <div class="fw-semibold text-success">$6.99/yr</div>
                      <small class="text-body-secondary">361 days left</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="stats-section py-5 bg-body-tertiary">
      <div class="container">
        <div class="row g-4 text-center">
          <div v-for="stat in stats" :key="stat.label" class="col-6 col-md-3">
            <div class="p-3">
              <i :class="'bi ' + stat.icon" class="fs-1 text-primary d-block mb-2"></i>
              <div class="display-5 fw-bold lh-1 mb-1">
                {{ stat.prefix || '' }}{{ Math.round(stat.value).toLocaleString() }}{{ stat.suffix || '' }}
              </div>
              <div class="text-body-secondary">{{ stat.label }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features-section py-5">
      <div class="container">
        <div class="text-center mb-5">
          <span class="badge bg-primary bg-opacity-25 text-primary px-3 py-2 mb-3">
            <i class="bi bi-grid me-1"></i> Features
          </span>
          <h2 class="display-5 fw-bold">Everything You Need to<br /><span class="text-primary">Eat the Domain Game</span></h2>
          <p class="lead text-body-secondary mx-auto" style="max-width: 600px">
            From portfolio tracking to buyer outreach, Domaineat covers the entire domain investment lifecycle.
          </p>
        </div>
        <div class="row g-4">
          <div v-for="feature in features" :key="feature.title" class="col-md-6 col-lg-4">
            <div class="card h-100 border-0 bg-body-tertiary rounded-4 p-4 feature-card">
              <div class="feature-icon-wrapper mb-3">
                <i :class="'bi ' + feature.icon" class="fs-2 text-primary"></i>
              </div>
              <h5 class="fw-bold mb-2">{{ feature.title }}</h5>
              <p class="text-body-secondary mb-0">{{ feature.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="pricing-section py-5 bg-body-tertiary">
      <div class="container">
        <div class="text-center mb-5">
          <span class="badge bg-primary bg-opacity-25 text-primary px-3 py-2 mb-3">
            <i class="bi bi-tag me-1"></i> Pricing
          </span>
          <h2 class="display-5 fw-bold">Simple, <span class="text-primary">Transparent</span> Pricing</h2>
          <p class="lead text-body-secondary mx-auto" style="max-width: 500px">
            Start free. Upgrade when your portfolio grows.
          </p>
        </div>
        <div class="row g-4 justify-content-center">
          <!-- Free Tier -->
          <div class="col-md-4">
            <div class="card h-100 border-0 rounded-4 p-4 shadow-sm">
              <div class="card-body d-flex flex-column">
                <span class="badge bg-secondary bg-opacity-25 text-secondary align-self-start mb-3">Free</span>
                <div class="display-4 fw-bold mb-0">$0</div>
                <small class="text-body-secondary mb-4">forever</small>
                <ul class="list-unstyled mb-4 flex-grow-1">
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Up to 25 domains</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Basic ledger</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Expiry alerts</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>1 registrar API</li>
                  <li class="mb-2 text-body-secondary"><i class="bi bi-x-circle me-2"></i>Prospect engine</li>
                  <li class="mb-2 text-body-secondary"><i class="bi bi-x-circle me-2"></i>Valuation insights</li>
                </ul>
                <router-link to="/domains" class="btn btn-outline-primary btn-lg rounded-pill w-100">
                  Start Free
                </router-link>
              </div>
            </div>
          </div>
          <!-- Premium Tier -->
          <div class="col-md-4">
            <div class="card h-100 border-primary border-2 rounded-4 p-4 shadow-lg position-relative">
              <span class="position-absolute top-0 start-50 translate-middle badge bg-primary rounded-pill px-3 py-2 shadow">
                Most Popular
              </span>
              <div class="card-body d-flex flex-column mt-2">
                <span class="badge bg-primary bg-opacity-25 text-primary align-self-start mb-3">Premium</span>
                <div class="display-4 fw-bold mb-0">$9</div>
                <small class="text-body-secondary mb-4">/month</small>
                <ul class="list-unstyled mb-4 flex-grow-1">
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Unlimited domains</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Full ledger + reports</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Prospect engine</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>All registrar APIs</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Valuation insights</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Priority support</li>
                </ul>
                <router-link to="/domains" class="btn btn-primary btn-lg rounded-pill w-100 shadow">
                  Go Premium
                </router-link>
              </div>
            </div>
          </div>
          <!-- Enterprise Tier -->
          <div class="col-md-4">
            <div class="card h-100 border-0 rounded-4 p-4 shadow-sm">
              <div class="card-body d-flex flex-column">
                <span class="badge bg-warning bg-opacity-25 text-warning align-self-start mb-3">Enterprise</span>
                <div class="display-4 fw-bold mb-0">$49</div>
                <small class="text-body-secondary mb-4">/month</small>
                <ul class="list-unstyled mb-4 flex-grow-1">
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Everything in Premium</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Team accounts (5 seats)</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Webhook integrations</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Custom valuations</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>SLA guarantee</li>
                  <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Dedicated support</li>
                </ul>
                <a href="mailto:hello@domaineat.com" class="btn btn-outline-warning btn-lg rounded-pill w-100">
                  Contact Sales
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section py-5">
      <div class="container">
        <div class="card border-0 rounded-4 overflow-hidden shadow-lg">
          <div class="card-body p-5 text-center bg-primary" style="--bs-bg-opacity: 0.15">
            <h2 class="display-6 fw-bold mb-3">Ready to Dominate Your Domain Portfolio?</h2>
            <p class="lead text-body-secondary mb-4 mx-auto" style="max-width: 500px">
              Join hundreds of domain investors who already manage their portfolios smarter.
            </p>
            <router-link to="/domains" class="btn btn-primary btn-lg px-5 rounded-pill shadow-lg">
              <i class="bi bi-rocket-takeoff me-2"></i>Start for Free Today
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer-section py-4 bg-body-tertiary">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-md-6 text-center text-md-start">
            <span class="text-body-secondary">
              <i class="bi bi-globe2 text-primary me-1"></i>
              <strong class="text-body">Domaineat</strong> &copy; {{ new Date().getFullYear() }}
            </span>
          </div>
          <div class="col-md-6 text-center text-md-end mt-2 mt-md-0">
            <a href="https://github.com/bitsnaps/domaineat" target="_blank" class="text-body-secondary text-decoration-none me-3">
              <i class="bi bi-github fs-5"></i>
            </a>
            <a href="mailto:hello@domaineat.com" class="text-body-secondary text-decoration-none me-3">
              <i class="bi bi-envelope fs-5"></i>
            </a>
            <a href="#" class="text-body-secondary text-decoration-none">
              <i class="bi bi-twitter-x fs-5"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Hero Section */
.hero-section {
  min-height: 85vh;
  display: flex;
  align-items: center;
}

.hero-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(111, 66, 193, 0.15) 0%, transparent 70%);
  top: -100px;
  right: -100px;
  z-index: 0;
  animation: glowPulse 6s ease-in-out infinite;
}

.hero-glow::before {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(253, 126, 20, 0.1) 0%, transparent 70%);
  bottom: -200px;
  left: -100px;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.min-vh-75 {
  min-height: 75vh;
}

/* Hero Card (mock dashboard preview) */
.hero-card {
  animation: floatCard 6s ease-in-out infinite;
}

@keyframes floatCard {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
}

.hero-card .list-group-item:last-child {
  border-bottom: none;
}

/* Feature Cards */
.feature-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.15);
}

.feature-icon-wrapper {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: rgba(111, 66, 193, 0.1);
}

/* Pricing Cards */
.pricing-section .card {
  transition: transform 0.3s ease;
}

.pricing-section .card:hover {
  transform: translateY(-4px);
}

/* CTA */
.cta-section .card {
  background: linear-gradient(135deg, rgba(111, 66, 193, 0.08) 0%, rgba(253, 126, 20, 0.05) 100%);
}

/* Landing page overrides — hide the sidebar for full-width hero */
.landing {
  width: 100%;
}
</style>
