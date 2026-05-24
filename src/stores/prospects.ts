import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToastStore } from '@/stores/toast'
import type {
  Prospect,
  ProspectCreate,
  ProspectUpdate,
  OutreachStatus,
  LeadScore,
  ApiError,
} from '@/types'

const API_BASE = '/api'

export const useProspectsStore = defineStore('prospects', () => {
  // ─── State ──────────────────────────────────────────────────────────────
  const prospects = ref<Prospect[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Filters
  const searchQuery = ref('')
  const filterStatus = ref<OutreachStatus | ''>('')
  const filterLeadScore = ref<LeadScore | ''>('')
  const filterDomainId = ref<number | null>(null)

  // ─── Actions ────────────────────────────────────────────────────────────

async function fetchProspects() {
 loading.value = true
 error.value = null
 try {
 const params = new URLSearchParams()
 if (filterDomainId.value) params.set('domain_id', String(filterDomainId.value))
 const res = await fetch(`${API_BASE}/prospects?${params}`)
 if (!res.ok) throw new Error(`HTTP ${res.status}`)
 prospects.value = await res.json()
 } catch (err: any) {
 error.value = err.message
 const toast = useToastStore()
 toast.error(`Failed to fetch prospects: ${err.message}`)
 } finally {
 loading.value = false
 }
 }

 async function createProspect(payload: ProspectCreate) {
 loading.value = true
 error.value = null
 try {
 const res = await fetch(`${API_BASE}/prospects`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 })
 if (!res.ok) {
 const data = (await res.json()) as ApiError
 throw new Error(data.error || `HTTP ${res.status}`)
 }
 const prospect = (await res.json()) as Prospect
 prospects.value.unshift(prospect)
 const toast = useToastStore()
 toast.success('Prospect added')
 return prospect
 } catch (err: any) {
 error.value = err.message
 const toast = useToastStore()
 toast.error(`Failed to add prospect: ${err.message}`)
 throw err
 } finally {
 loading.value = false
 }
 }

 async function updateProspect(id: number, payload: ProspectUpdate) {
 loading.value = true
 error.value = null
 try {
 const res = await fetch(`${API_BASE}/prospects/${id}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 })
 if (!res.ok) {
 const data = (await res.json()) as ApiError
 throw new Error(data.error || `HTTP ${res.status}`)
 }
 const updated = (await res.json()) as Prospect
 const idx = prospects.value.findIndex((p) => p.id === id)
 if (idx !== -1) prospects.value[idx] = updated
 const toast = useToastStore()
 toast.success('Prospect updated')
 return updated
 } catch (err: any) {
 error.value = err.message
 const toast = useToastStore()
 toast.error(`Failed to update prospect: ${err.message}`)
 throw err
 } finally {
 loading.value = false
 }
 }

 async function deleteProspect(id: number) {
 loading.value = true
 error.value = null
 try {
 const res = await fetch(`${API_BASE}/prospects/${id}`, { method: 'DELETE' })
 if (!res.ok) throw new Error(`HTTP ${res.status}`)
 prospects.value = prospects.value.filter((p) => p.id !== id)
 const toast = useToastStore()
 toast.success('Prospect deleted')
 } catch (err: any) {
 error.value = err.message
 const toast = useToastStore()
 toast.error(`Failed to delete prospect: ${err.message}`)
 throw err
 } finally {
 loading.value = false
    }
  }

  function clearFilters() {
    searchQuery.value = ''
    filterStatus.value = ''
    filterLeadScore.value = ''
    filterDomainId.value = null
  }

  // ─── Getters ────────────────────────────────────────────────────────────

  /** Lead scoring: hot = responded or negotiating, warm = contacted, cold = uncontacted */
  function leadScore(p: Prospect): LeadScore {
    if (['responded', 'negotiating'].includes(p.outreach_status)) return 'hot'
    if (p.outreach_status === 'contacted') return 'warm'
    return 'cold'
  }

  const filteredProspects = computed(() => {
    let result = prospects.value

    // Text search
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(
        (p) =>
          p.prospect_domain.toLowerCase().includes(q) ||
          (p.company_name && p.company_name.toLowerCase().includes(q)) ||
          (p.contact_email && p.contact_email.toLowerCase().includes(q))
      )
    }

    // Status filter
    if (filterStatus.value) {
      result = result.filter((p) => p.outreach_status === filterStatus.value)
    }

    // Lead score filter
    if (filterLeadScore.value) {
      result = result.filter((p) => leadScore(p) === filterLeadScore.value)
    }

    // Domain filter
    if (filterDomainId.value) {
      result = result.filter((p) => p.domain_id === filterDomainId.value)
    }

    return result
  })

  const countByStatus = computed(() => {
    const counts: Record<string, number> = {}
    for (const p of prospects.value) {
      counts[p.outreach_status] = (counts[p.outreach_status] || 0) + 1
    }
    return counts
  })

  const countByLeadScore = computed(() => {
    const counts: Record<LeadScore, number> = { hot: 0, warm: 0, cold: 0 }
    for (const p of prospects.value) {
      counts[leadScore(p)]++
    }
    return counts
  })

  const hotProspects = computed(() => prospects.value.filter((p) => leadScore(p) === 'hot'))

  /** Prospects that need follow-up: contacted but no response in 7+ days */
  const needsFollowUp = computed(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return prospects.value.filter((p) => {
      if (p.outreach_status !== 'contacted') return false
      if (!p.last_contact_date) return true // contacted but no date = stale
      return new Date(p.last_contact_date) < sevenDaysAgo
    })
  })

  return {
    prospects,
    loading,
    error,
    searchQuery,
    filterStatus,
    filterLeadScore,
    filterDomainId,
    fetchProspects,
    createProspect,
    updateProspect,
    deleteProspect,
    clearFilters,
    leadScore,
    filteredProspects,
    countByStatus,
    countByLeadScore,
    hotProspects,
    needsFollowUp,
  }
})
