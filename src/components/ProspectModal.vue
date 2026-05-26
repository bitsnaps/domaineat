<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useDomainsStore } from '@/stores/domains'
import type { Prospect, ProspectCreate, OutreachStatus } from '@/types'

const props = defineProps<{
  prospect: Prospect | null
}>()

const emit = defineEmits<{
  save: [payload: ProspectCreate]
  close: []
}>()

const domains = useDomainsStore()

// Form state
const domainId = ref<number | null>(null)
const prospectDomain = ref('')
const companyName = ref('')
const contactEmail = ref('')
const outreachStatus = ref<OutreachStatus>('uncontacted')
const lastContactDate = ref('')

// Validation
const errors = ref<Record<string, string>>({})

const statusOptions: { value: OutreachStatus; label: string }[] = [
  { value: 'uncontacted', label: 'Uncontacted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'responded', label: 'Responded' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'closed', label: 'Closed' },
  { value: 'lost', label: 'Lost' },
]

// Populate form when editing
watch(
  () => props.prospect,
  (prospect) => {
    if (prospect) {
      domainId.value = prospect.domain_id
      prospectDomain.value = prospect.prospect_domain
      companyName.value = prospect.company_name || ''
      contactEmail.value = prospect.contact_email || ''
      outreachStatus.value = prospect.outreach_status
      lastContactDate.value = prospect.last_contact_date || ''
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

onMounted(() => {
	if (domains.domains.length === 0) domains.fetchDomains()
})

function resetForm() {
  domainId.value = null
  prospectDomain.value = ''
  companyName.value = ''
  contactEmail.value = ''
  outreachStatus.value = 'uncontacted'
  lastContactDate.value = ''
  errors.value = {}
}

function validate(): boolean {
  errors.value = {}
  if (!domainId.value) errors.value.domainId = 'Parent domain is required'
  if (!prospectDomain.value.trim()) errors.value.prospectDomain = 'Prospect domain is required'
  if (contactEmail.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.value)) {
    errors.value.contactEmail = 'Invalid email format'
  }
  return Object.keys(errors.value).length === 0
}

function submit() {
  if (!validate()) return
  emit('save', {
    domain_id: domainId.value!,
    prospect_domain: prospectDomain.value.trim(),
    company_name: companyName.value.trim() || null,
    contact_email: contactEmail.value.trim() || null,
    outreach_status: outreachStatus.value,
    last_contact_date: lastContactDate.value || null,
  })
}
</script>

<template>
 <div class="modal-overlay" @click.self="emit('close')">
  <div class="modal-dialog modal-dialog-centered">
   <div class="modal-content border-0 shadow">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-semibold">{{ prospect ? 'Edit Prospect' : 'Add Prospect' }}</h5>
          <button type="button" class="btn-close" @click="emit('close')"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="submit">
            <!-- Parent Domain -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Parent Domain</label>
              <select v-model="domainId" class="form-select" :class="{ 'is-invalid': errors.domainId }">
                <option :value="null" disabled>Select a parent domain…</option>
                <option v-for="d in domains.domains" :key="d.id" :value="d.id">{{ d.domain_name }}</option>
              </select>
              <div v-if="errors.domainId" class="invalid-feedback">{{ errors.domainId }}</div>
            </div>

            <!-- Prospect Domain -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Prospect Domain</label>
              <input
                v-model="prospectDomain"
                type="text"
                class="form-control"
                :class="{ 'is-invalid': errors.prospectDomain }"
                placeholder="e.g. example.net"
              />
              <div v-if="errors.prospectDomain" class="invalid-feedback">{{ errors.prospectDomain }}</div>
            </div>

            <!-- Company Name -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Company Name</label>
              <input v-model="companyName" type="text" class="form-control" placeholder="Optional" />
            </div>

            <!-- Contact Email -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Contact Email</label>
              <input
                v-model="contactEmail"
                type="email"
                class="form-control"
                :class="{ 'is-invalid': errors.contactEmail }"
                placeholder="contact@company.com"
              />
              <div v-if="errors.contactEmail" class="invalid-feedback">{{ errors.contactEmail }}</div>
            </div>

            <!-- Outreach Status -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Outreach Status</label>
              <select v-model="outreachStatus" class="form-select">
                <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <!-- Last Contact Date -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Last Contact Date</label>
              <input v-model="lastContactDate" type="date" class="form-control" />
            </div>
          </form>
        </div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-outline-secondary" @click="emit('close')">Cancel</button>
          <button class="btn btn-sm text-white" style="background: var(--indigo);" @click="submit">
            {{ prospect ? 'Save Changes' : 'Add Prospect' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
 position: fixed;
 inset: 0;
 background: rgba(0, 0, 0, 0.4);
 backdrop-filter: blur(4px);
 display: flex;
 align-items: center;
 justify-content: center;
 z-index: 1050;
}
.modal-dialog {
 width: 100%;
 max-width: 480px;
 margin: 1rem;
}
:root { --indigo: #6366f1; }
</style>
