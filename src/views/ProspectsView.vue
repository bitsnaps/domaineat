<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useProspectsStore } from '@/stores/prospects'
import { useDomainsStore } from '@/stores/domains'
import ProspectModal from '@/components/ProspectModal.vue'
import OutreachDraftModal from '@/components/OutreachDraftModal.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import EmptyState from '@/components/EmptyState.vue'
import type { Prospect, OutreachStatus, LeadScore, Domain } from '@/types'

const store = useProspectsStore()
const domains = useDomainsStore()

// Modal state
const showModal = ref(false)
const editingProspect = ref<Prospect | null>(null)

// Outreach draft modal state
const showDraftModal = ref(false)
const draftProspect = ref<Prospect | null>(null)
const draftDomain = ref<Domain | null>(null)

function openDraft(prospect: Prospect) {
  draftProspect.value = prospect
  draftDomain.value = domains.domains.find(d => d.id === prospect.domain_id) || null
  showDraftModal.value = true
}
function closeDraftModal() {
  showDraftModal.value = false
  draftProspect.value = null
  draftDomain.value = null
}
async function handleDraftSaved(draft: string) {
  // Optionally store draft as a note on the prospect
  if (draftProspect.value && draft) {
    await store.updateProspect(draftProspect.value.id, {
      notes: (draftProspect.value.notes ? draftProspect.value.notes + '\n\n' : '') + `[AI Draft]:\n${draft}`,
    })
  }
}

// Pagination
const page = ref(1)
const perPage = 15

onMounted(async () => {
	if (domains.domains.length === 0) domains.fetchDomains()
})

// Paginated
const paginatedProspects = computed(() => {
  const start = (page.value - 1) * perPage
  return store.filteredProspects.slice(start, start + perPage)
})
const totalPages = computed(() => Math.ceil(store.filteredProspects.length / perPage))

// Format helpers
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function statusBadgeClass(status: OutreachStatus) {
  const map: Record<string, string> = {
    uncontacted: 'bg-secondary text-white',
    contacted: 'bg-info text-white',
    responded: 'bg-success text-white',
    negotiating: 'bg-warning text-dark',
    closed: 'bg-primary text-white',
    lost: 'bg-danger text-white',
  }
  return map[status] || 'bg-light text-dark'
}

function leadBadgeClass(score: LeadScore) {
  const map: Record<LeadScore, string> = {
    hot: 'bg-danger text-white',
    warm: 'bg-warning text-dark',
    cold: 'bg-secondary text-white',
  }
  return map[score]
}

function domainName(domainId: number) {
  const d = domains.domains.find((d) => d.id === domainId)
  return d ? d.domain_name : `#${domainId}`
}

// Modal handlers
function openAdd() {
  editingProspect.value = null
  showModal.value = true
}
function openEdit(prospect: Prospect) {
  editingProspect.value = prospect
  showModal.value = true
}
function closeModal() {
  showModal.value = false
  editingProspect.value = null
}
async function handleSave(payload: any) {
  if (editingProspect.value) {
    await store.updateProspect(editingProspect.value.id, payload)
  } else {
    await store.createProspect(payload)
  }
  closeModal()
}
async function handleDelete(prospect: Prospect) {
  if (confirm(`Delete prospect ${prospect.prospect_domain}?`)) {
    await store.deleteProspect(prospect.id)
  }
}

const statusOptions: OutreachStatus[] = ['uncontacted', 'contacted', 'responded', 'negotiating', 'closed', 'lost']
const scoreOptions: LeadScore[] = ['hot', 'warm', 'cold']
</script>

<template>
  <div class="prospects-view">
    <!-- Summary Cards -->
    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">Total Prospects</div>
            <div class="h4 mb-0">{{ store.prospects.length }}</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">🔥 Hot Leads</div>
            <div class="h4 mb-0 text-danger">{{ store.countByLeadScore.hot }}</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">🟡 Warm Leads</div>
            <div class="h4 mb-0 text-warning">{{ store.countByLeadScore.warm }}</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small fw-semibold text-uppercase mb-1">⏰ Needs Follow-up</div>
            <div class="h4 mb-0" :class="store.needsFollowUp.length > 0 ? 'text-warning' : 'text-muted'">
              {{ store.needsFollowUp.length }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Follow-up Alert -->
    <div v-if="store.needsFollowUp.length > 0" class="card border-0 shadow-sm mb-4" style="border-left: 4px solid #f59e0b !important;">
      <div class="card-body py-3">
        <div class="d-flex align-items-center mb-2">
          <span class="text-warning me-2">⏰</span>
          <span class="fw-semibold small">{{ store.needsFollowUp.length }} prospect(s) need follow-up (contacted 7+ days ago)</span>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <span v-for="p in store.needsFollowUp.slice(0, 5)" :key="p.id" class="badge bg-light text-dark rounded-pill">
            {{ p.prospect_domain }} — last: {{ formatDate(p.last_contact_date) }}
          </span>
          <span v-if="store.needsFollowUp.length > 5" class="badge bg-light text-muted rounded-pill">
            +{{ store.needsFollowUp.length - 5 }} more
          </span>
        </div>
      </div>
    </div>

    <!-- Filters + Actions -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body py-3">
        <div class="row g-2 align-items-center">
          <div class="col-auto">
            <input
              v-model="store.searchQuery"
              type="text"
              class="form-control form-control-sm"
              placeholder="Search domain, company, email…"
              style="width: 200px"
            />
          </div>
          <div class="col-auto">
            <select v-model="store.filterStatus" class="form-select form-select-sm" style="width: 150px">
              <option value="">All Statuses</option>
              <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="col-auto">
            <select v-model="store.filterLeadScore" class="form-select form-select-sm" style="width: 130px">
              <option value="">All Scores</option>
              <option v-for="s in scoreOptions" :key="s" :value="s">{{ s }} 🔥</option>
            </select>
          </div>
          <div class="col-auto">
            <select v-model="store.filterDomainId" class="form-select form-select-sm" style="width: 180px">
              <option :value="null">All Domains</option>
              <option v-for="d in domains.domains" :key="d.id" :value="d.id">{{ d.domain_name }}</option>
            </select>
          </div>
          <div class="col-auto">
            <button class="btn btn-outline-secondary btn-sm" @click="store.clearFilters" v-if="store.searchQuery || store.filterStatus || store.filterLeadScore || store.filterDomainId">
              ✕ Clear
            </button>
          </div>
          <div class="col-auto ms-auto">
            <button class="btn btn-sm text-white" style="background: var(--indigo);" @click="openAdd">
              + Add Prospect
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Prospect Table -->
    <div class="card border-0 shadow-sm">
      <div class="card-body p-0">
 <div v-if="store.loading" class="p-4">
 <LoadingSkeleton :lines="6" height="18px" />
 </div>
 <EmptyState
 v-else-if="store.filteredProspects.length === 0"
 icon="bi-people"
 message="No prospects found."
 action-label="Add your first prospect"
 @action="openAdd"
 />
 <div v-else class="table-responsive">
          <table class="table table-sm table-hover mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>Domain</th>
                <th>Parent</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Lead</th>
                <th>Last Contact</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in paginatedProspects" :key="p.id">
                <td class="small fw-medium">{{ p.prospect_domain }}</td>
                <td class="small text-muted">{{ domainName(p.domain_id) }}</td>
                <td class="small">{{ p.company_name || '—' }}</td>
                <td class="small">
                  <span v-if="p.contact_email">{{ p.contact_email }}</span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="small">
                  <span class="badge rounded-pill" :class="statusBadgeClass(p.outreach_status)">
                    {{ p.outreach_status }}
                  </span>
                </td>
                <td class="small">
                  <span class="badge rounded-pill" :class="leadBadgeClass(store.leadScore(p))">
                    {{ store.leadScore(p) }}
                  </span>
                </td>
                <td class="small text-muted">{{ formatDate(p.last_contact_date) }}</td>
<td class="small text-end">
              <button class="btn btn-sm btn-link p-0 me-2" style="color: #6366f1;" @click="openDraft(p)" title="Generate AI Draft">✨</button>
              <button class="btn btn-sm btn-link text-muted p-0 me-2" @click="openEdit(p)" title="Edit">✎</button>
              <button class="btn btn-sm btn-link text-danger p-0" @click="handleDelete(p)" title="Delete">✕</button>
            </td>
              </tr>
            </tbody>
          </table>
 </div>

 <!-- Error -->
 <div class="alert alert-danger m-3" v-if="store.error">
 <i class="bi bi-exclamation-triangle me-1"></i>{{ store.error }}
 </div>

 <!-- Pagination -->
 <div v-if="totalPages > 1" class="d-flex justify-content-between align-items-center px-3 py-2 border-top">
 <span class="text-muted small">
 Showing {{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, store.filteredProspects.length) }} of {{ store.filteredProspects.length }}
          </span>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" :disabled="page === 1" @click="page--">←</button>
            <button class="btn btn-outline-secondary" :disabled="page === totalPages" @click="page++">→</button>
          </div>
        </div>
      </div>
    </div>

<!-- Prospect Modal -->
  <ProspectModal
    v-if="showModal"
    :prospect="editingProspect"
    @save="handleSave"
    @close="closeModal"
  />

  <!-- Outreach Draft Modal -->
  <OutreachDraftModal
    v-if="showDraftModal && draftProspect && draftDomain"
    :prospect="draftProspect"
    :domain="draftDomain"
    @saved="handleDraftSaved"
    @close="closeDraftModal"
  />
  </div>
</template>

<style scoped>
.prospects-view {
  --indigo: #6366f1;
}
</style>
