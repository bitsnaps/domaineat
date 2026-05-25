<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDomainsStore } from '@/stores/domains'
import { useLedgerStore } from '@/stores/ledger'
import { useProspectsStore } from '@/stores/prospects'

const auth = useAuthStore()
const domainsStore = useDomainsStore()
const ledgerStore = useLedgerStore()
const prospectsStore = useProspectsStore()

const loading = ref(true)

// ─── Summary Cards ──────────────────────────────────────────────────────

const summaryCards = computed(() => [
  {
    label: 'Total Domains',
    value: domainsStore.count,
    icon: 'bi-globe2',
    color: 'var(--primary)',
    bg: 'rgba(99, 102, 241, 0.08)',
  },
  {
    label: 'Expiring Soon',
    value: domainsStore.expiringSoon.length,
    icon: 'bi-clock-history',
    color: domainsStore.expiringSoon.length > 0 ? 'var(--warning)' : 'var(--success)',
    bg: domainsStore.expiringSoon.length > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
  },
  {
    label: 'Net Profit',
    value: formatCurrency(ledgerStore.netProfit),
    icon: 'bi-graph-up-arrow',
    color: ledgerStore.netProfit >= 0 ? 'var(--success)' : 'var(--danger)',
    bg: ledgerStore.netProfit >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
  },
  {
    label: 'Hot Prospects',
    value: prospectsStore.hotProspects.length,
    icon: 'bi-fire',
    color: 'var(--accent)',
    bg: 'rgba(245, 158, 11, 0.08)',
  },
])

// ─── Quick Actions ──────────────────────────────────────────────────────

const quickActions = [
  { label: 'Add Domain', icon: 'bi-plus-circle', route: '/domains', color: 'var(--primary)' },
  { label: 'New Ledger Entry', icon: 'bi-journal-plus', route: '/ledger', color: 'var(--success)' },
  { label: 'Find Prospects', icon: 'bi-search', route: '/prospects', color: 'var(--accent)' },
  { label: 'Settings', icon: 'bi-gear', route: '/settings', color: 'var(--gray-600)' },
]

// ─── Expiring Domains (next 30 days) ────────────────────────────────────

const expiringDomains = computed(() =>
  domainsStore.expiringSoon
    .slice()
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
    .slice(0, 5)
)

function daysLeft(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const now = new Date()
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function expiryClass(days: number): string {
  if (days <= 7) return 'danger'
  if (days <= 14) return 'warning'
  return 'info'
}

// ─── Recent Ledger Entries ──────────────────────────────────────────────

const recentEntries = computed(() =>
  ledgerStore.entries
    .slice()
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 5)
)

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

function formatType(type: string): string {
  return type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function typeClass(type: string): string {
  return type === 'sale' ? 'sale' : 'cost'
}

// ─── Follow-up Prospects ────────────────────────────────────────────────

const followUpProspects = computed(() => prospectsStore.needsFollowUp.slice(0, 3))

// ─── Portfolio Distribution ─────────────────────────────────────────────

const statusDistribution = computed(() => {
  const counts = domainsStore.countByStatus
  const total = domainsStore.count || 1
  return Object.entries(counts).map(([status, count]) => ({
    status: status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    count,
    pct: Math.round((count / total) * 100),
  }))
})

// ─── Tier badge ─────────────────────────────────────────────────────────

const tierBadge = computed(() => {
  const t = auth.userTier
  return {
    label: t.charAt(0).toUpperCase() + t.slice(1),
    class: t === 'enterprise' ? 'badge-enterprise' : t === 'premium' ? 'badge-premium' : 'badge-free',
  }
})

// ─── Data Loading ───────────────────────────────────────────────────────

onMounted(async () => {
  loading.value = true
  const userId = auth.user?.id
  if (userId) {
    await Promise.all([
      domainsStore.fetchDomains(),
      ledgerStore.fetchEntries(),
      prospectsStore.fetchProspects(),
    ])
  }
  loading.value = false
})
</script>

<template>
  <div class="dashboard-home">
    <!-- Header -->
    <div class="dashboard-header">
      <div>
        <h1 class="dashboard-title">
          Welcome back<span v-if="auth.user?.email">, {{ auth.user.email.split('@')[0] }}</span>
        </h1>
        <p class="dashboard-subtitle">
          Here's an overview of your domain portfolio
          <span :class="['tier-badge', tierBadge.class]">{{ tierBadge.label }}</span>
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-grid">
      <div v-for="i in 4" :key="i" class="skeleton-card">
        <div class="skeleton-icon"></div>
        <div class="skeleton-line wide"></div>
        <div class="skeleton-line narrow"></div>
      </div>
    </div>

    <template v-else>
      <!-- Summary Cards -->
      <div class="summary-grid">
        <div v-for="card in summaryCards" :key="card.label" class="summary-card">
          <div class="card-icon" :style="{ background: card.bg, color: card.color }">
            <i :class="'bi ' + card.icon"></i>
          </div>
          <div class="card-body">
            <div class="card-value">{{ card.value }}</div>
            <div class="card-label">{{ card.label }}</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h2 class="section-title">Quick Actions</h2>
        <div class="actions-row">
          <router-link
            v-for="action in quickActions"
            :key="action.label"
            :to="action.route"
            class="action-chip"
            :style="{ '--chip-color': action.color }"
          >
            <i :class="'bi ' + action.icon"></i>
            <span>{{ action.label }}</span>
          </router-link>
        </div>
      </div>

      <!-- Two Column Layout -->
      <div class="two-col">
        <!-- Left: Expiring Domains + Portfolio Status -->
        <div class="col-left">
          <!-- Expiring Domains -->
          <div class="dashboard-card">
            <div class="card-header">
              <h3><i class="bi bi-clock-history"></i> Expiring Soon</h3>
              <router-link to="/domains" class="view-all">View all</router-link>
            </div>
            <div v-if="expiringDomains.length === 0" class="empty-state">
              <i class="bi bi-check-circle"></i>
              <p>No domains expiring in the next 30 days</p>
            </div>
            <div v-else class="expiring-list">
              <div
                v-for="domain in expiringDomains"
                :key="domain.id"
                class="expiring-row"
              >
                <div class="expiring-info">
                  <span class="expiring-name">{{ domain.domain_name }}</span>
                  <span class="expiring-registrar">{{ domain.registrar }}</span>
                </div>
                <span :class="['expiring-badge', expiryClass(daysLeft(domain.expiry_date))]">
                  {{ daysLeft(domain.expiry_date) }}d left
                </span>
              </div>
            </div>
          </div>

          <!-- Portfolio Distribution -->
          <div class="dashboard-card">
            <div class="card-header">
              <h3><i class="bi bi-pie-chart"></i> Portfolio Status</h3>
            </div>
            <div v-if="statusDistribution.length === 0" class="empty-state">
              <i class="bi bi-inbox"></i>
              <p>No domains yet</p>
            </div>
            <div v-else class="status-bars">
              <div v-for="s in statusDistribution" :key="s.status" class="status-row">
                <div class="status-label">
                  <span>{{ s.status }}</span>
                  <span class="status-count">{{ s.count }}</span>
                </div>
                <div class="status-bar-bg">
                  <div
                    class="status-bar-fill"
                    :class="'fill-' + s.status.toLowerCase().replace(' ', '-')"
                    :style="{ width: s.pct + '%' }"
                  ></div>
                </div>
                <span class="status-pct">{{ s.pct }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Recent Transactions + Follow-ups -->
        <div class="col-right">
          <!-- Recent Transactions -->
          <div class="dashboard-card">
            <div class="card-header">
              <h3><i class="bi bi-receipt"></i> Recent Transactions</h3>
              <router-link to="/ledger" class="view-all">View all</router-link>
            </div>
            <div v-if="recentEntries.length === 0" class="empty-state">
              <i class="bi bi-inbox"></i>
              <p>No transactions recorded yet</p>
            </div>
            <div v-else class="transaction-list">
              <div v-for="entry in recentEntries" :key="entry.id" class="transaction-row">
                <div class="tx-info">
                  <span :class="['tx-type-badge', typeClass(entry.transaction_type)]">
                    {{ formatType(entry.transaction_type) }}
                  </span>
                  <span class="tx-date">{{ entry.transaction_date }}</span>
                </div>
                <span :class="['tx-amount', typeClass(entry.transaction_type)]">
                  {{ entry.transaction_type === 'sale' ? '+' : '-' }}{{ formatCurrency(Number(entry.amount)) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Follow-up Prospects -->
          <div class="dashboard-card">
            <div class="card-header">
              <h3><i class="bi bi-chat-dots"></i> Needs Follow-up</h3>
              <router-link to="/prospects" class="view-all">View all</router-link>
            </div>
            <div v-if="followUpProspects.length === 0" class="empty-state">
              <i class="bi bi-check-circle"></i>
              <p>All prospects are up to date</p>
            </div>
            <div v-else class="followup-list">
              <div v-for="prospect in followUpProspects" :key="prospect.id" class="followup-row">
                <div class="followup-info">
                  <span class="followup-domain">{{ prospect.prospect_domain }}</span>
                  <span class="followup-company">{{ prospect.company_name || 'No company' }}</span>
                </div>
                <span class="followup-badge">Follow up</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── Header ──────────────────────────────────────────────────────── */
.dashboard-home {
  max-width: 1200px;
}

.dashboard-header {
  margin-bottom: 1.5rem;
}

.dashboard-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin-bottom: 0.25rem;
}

.dashboard-subtitle {
  font-size: 0.9375rem;
  color: var(--gray-600);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tier-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 1rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.badge-free {
  background: var(--gray-100);
  color: var(--gray-600);
}

.badge-premium {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
}

.badge-enterprise {
  background: rgba(245, 158, 11, 0.1);
  color: var(--accent);
}

/* ── Summary Cards ───────────────────────────────────────────────── */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: 0.75rem;
  padding: 1.125rem 1.25rem;
  transition: box-shadow 0.2s, transform 0.2s;
}

.summary-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.card-value {
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--dark);
  line-height: 1.2;
}

.card-label {
  font-size: 0.8125rem;
  color: var(--gray-500);
  font-weight: 500;
}

/* ── Quick Actions ───────────────────────────────────────────────── */
.quick-actions {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--gray-800);
}

.actions-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  border: 1.5px solid var(--gray-200);
  background: #fff;
  color: var(--gray-700);
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.action-chip:hover {
  border-color: var(--chip-color);
  color: var(--chip-color);
  background: color-mix(in srgb, var(--chip-color) 4%, white);
}

.action-chip i {
  font-size: 1rem;
  color: var(--chip-color);
}

/* ── Two Column Layout ───────────────────────────────────────────── */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.col-left,
.col-right {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Dashboard Card ──────────────────────────────────────────────── */
.dashboard-card {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: 0.75rem;
  padding: 1.25rem;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.card-header h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--gray-800);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-header h3 i {
  color: var(--primary);
  font-size: 1rem;
}

.view-all {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
  transition: color 0.2s;
}

.view-all:hover {
  color: var(--primary-dark);
}

/* ── Empty State ─────────────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 1.5rem 0;
  color: var(--gray-400);
}

.empty-state i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: block;
}

.empty-state p {
  font-size: 0.8125rem;
  margin: 0;
}

/* ── Expiring Domains ────────────────────────────────────────────── */
.expiring-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expiring-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--gray-50);
  transition: background 0.15s;
}

.expiring-row:hover {
  background: var(--gray-100);
}

.expiring-info {
  display: flex;
  flex-direction: column;
}

.expiring-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--dark);
}

.expiring-registrar {
  font-size: 0.75rem;
  color: var(--gray-500);
}

.expiring-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.2rem 0.625rem;
  border-radius: 1rem;
}

.expiring-badge.danger {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}

.expiring-badge.warning {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning);
}

.expiring-badge.info {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
}

/* ── Portfolio Status Bars ───────────────────────────────────────── */
.status-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.status-row {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 0.75rem;
  align-items: center;
}

.status-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--gray-700);
}

.status-count {
  color: var(--gray-400);
  font-weight: 400;
}

.status-bar-bg {
  height: 8px;
  background: var(--gray-100);
  border-radius: 4px;
  overflow: hidden;
}

.status-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.fill-active {
  background: var(--success);
}

.fill-expired {
  background: var(--danger);
}

.fill-sold {
  background: var(--primary);
}

.fill-parked {
  background: var(--warning);
}

.fill-pending-delete {
  background: var(--gray-400);
}

.status-pct {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--gray-500);
  text-align: right;
  min-width: 2.5rem;
}

/* ── Transactions ────────────────────────────────────────────────── */
.transaction-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.transaction-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--gray-50);
}

.transaction-row:hover {
  background: var(--gray-100);
}

.tx-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tx-type-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 0.375rem;
}

.tx-type-badge.sale {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.tx-type-badge.cost {
  background: rgba(99, 102, 241, 0.08);
  color: var(--primary);
}

.tx-date {
  font-size: 0.75rem;
  color: var(--gray-400);
}

.tx-amount {
  font-family: var(--font-display);
  font-size: 0.875rem;
  font-weight: 600;
}

.tx-amount.sale {
  color: var(--success);
}

.tx-amount.cost {
  color: var(--gray-800);
}

/* ── Follow-up Prospects ─────────────────────────────────────────── */
.followup-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.followup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--gray-50);
}

.followup-row:hover {
  background: var(--gray-100);
}

.followup-info {
  display: flex;
  flex-direction: column;
}

.followup-domain {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--dark);
}

.followup-company {
  font-size: 0.75rem;
  color: var(--gray-500);
}

.followup-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.2rem 0.625rem;
  border-radius: 1rem;
  background: rgba(245, 158, 11, 0.1);
  color: var(--accent);
}

/* ── Loading Skeletons ───────────────────────────────────────────── */
.loading-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.skeleton-card {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: 0.75rem;
  padding: 1.125rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-icon {
  width: 44px;
  height: 44px;
  border-radius: 0.625rem;
  background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-line {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-line.wide {
  width: 60%;
}

.skeleton-line.narrow {
  width: 40%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Responsive ──────────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .loading-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }
  .loading-grid {
    grid-template-columns: 1fr 1fr;
  }
  .two-col {
    grid-template-columns: 1fr;
  }
  .actions-row {
    gap: 0.5rem;
  }
  .action-chip {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }
}
</style>
