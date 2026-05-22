<script setup lang="ts">
import { computed } from 'vue'
import { useLedgerStore } from '@/stores/ledger'
import { useDomainsStore } from '@/stores/domains'
import { useCurrency } from '@/composables/useCurrency'

const ledger = useLedgerStore()
const domains = useDomainsStore()
const { preferredCurrency, formatCurrency, currentRate } = useCurrency()

/** Domains expiring in next 30 days */
const expiringSoon = computed(() => {
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)
    .toISOString()
    .slice(0, 10)
  return domains.domains.filter((d) => d.expiry_date <= cutoff && d.status === 'active')
})

/** Average renewal cost per domain */
const avgRenewal = computed(() => {
  const active = domains.domains.filter((d) => d.status === 'active')
  if (active.length === 0) return 0
  return active.reduce((sum, d) => sum + Number(d.renewal_cost), 0) / active.length
})

/** Amortized monthly cost = total costs / months of holding */
const amortizedMonthlyCost = computed(() => {
  if (ledger.entries.length === 0) return 0
  const dates = ledger.entries.map((e) => new Date(e.transaction_date).getTime())
  const earliest = Math.min(...dates)
  const latest = Math.max(...dates)
  const months = Math.max(1, (latest - earliest) / (30.44 * 24 * 60 * 60 * 1000))
  return ledger.totalCosts / months
})

/** Renewal rate = renewals / (renewals + expiries) over last 12 months */
const renewalRate = computed(() => {
  const now = new Date()
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    .toISOString()
    .slice(0, 10)
  const recentRenewals = ledger.entries.filter(
    (e) => e.transaction_type === 'renewal' && e.transaction_date >= yearAgo
  ).length
  const recentExpiries = domains.domains.filter(
    (d) => d.status === 'expired' && d.expiry_date >= yearAgo
  ).length
  const total = recentRenewals + recentExpiries
  return total === 0 ? 100 : (recentRenewals / total) * 100
})

/** Tenure (average holding period in months) for unsold domains */
const avgTenureMonths = computed(() => {
  const held = domains.domains.filter((d) => d.status === 'active')
  if (held.length === 0) return 0
  const now = Date.now()
  const totalMonths = held.reduce((sum, d) => {
    const acq = new Date(d.acquisition_date).getTime()
    return sum + (now - acq) / (30.44 * 24 * 60 * 60 * 1000)
  }, 0)
  return totalMonths / held.length
})

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="financial-dashboard">
    <!-- Primary KPI Row -->
    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">Net Profit</div>
            <div class="h4 mb-0" :class="ledger.netProfit >= 0 ? 'text-success' : 'text-danger'">
              {{ formatCurrency(ledger.netProfit) }}
            </div>
            <div class="text-muted small mt-1">
              ROI: <span :class="ledger.roi >= 0 ? 'text-success' : 'text-danger'">{{ ledger.roi.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">Monthly Burn Rate</div>
            <div class="h4 mb-0 text-warning">{{ formatCurrency(ledger.burnRate) }}</div>
            <div class="text-muted small mt-1">
              Amortized: {{ formatCurrency(amortizedMonthlyCost) }}/mo
            </div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">NAV (Held Domains)</div>
            <div class="h4 mb-0" style="color: #6366f1;">{{ formatCurrency(ledger.nav) }}</div>
            <div class="text-muted small mt-1">Avg tenure: {{ avgTenureMonths.toFixed(1) }} months</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">Renewal Rate</div>
            <div class="h4 mb-0" :class="renewalRate >= 80 ? 'text-success' : 'text-warning'">
              {{ renewalRate.toFixed(0) }}%
            </div>
            <div class="text-muted small mt-1">Avg renewal: {{ formatCurrency(avgRenewal) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Expiring Alerts -->
    <div v-if="expiringSoon.length" class="card border-0 shadow-sm mb-4">
      <div class="card-body py-3">
        <div class="d-flex align-items-center mb-2">
          <span class="text-warning me-2">⚠</span>
          <span class="fw-semibold small">{{ expiringSoon.length }} domain(s) expiring within 30 days</span>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <span v-for="d in expiringSoon" :key="d.id" class="badge bg-light text-dark rounded-pill">
            {{ d.domain_name }} — {{ formatDate(d.expiry_date) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Currency indicator -->
    <div class="text-muted small mb-3">
      Displaying in {{ preferredCurrency }} (1 USD = {{ currentRate.toFixed(4) }} {{ preferredCurrency }})
    </div>
  </div>
</template>

<style scoped>
.financial-dashboard {
  --indigo: #6366f1;
}
</style>
