<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useDomainsStore } from '@/stores/domains'
import type { LedgerEntry, TransactionType, LedgerEntryCreate } from '@/types'

const props = defineProps<{
  entry: LedgerEntry | null
}>()

const emit = defineEmits<{
  save: [payload: LedgerEntryCreate]
  close: []
}>()

const domains = useDomainsStore()

// Form state
const domainId = ref<number | null>(null)
const transactionType = ref<TransactionType>('purchase')
const amount = ref('')
const transactionDate = ref('')
const notes = ref('')

// Validation
const errors = ref<Record<string, string>>({})

const typeOptions: { value: TransactionType; label: string }[] = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'sale', label: 'Sale' },
  { value: 'listing_fee', label: 'Listing Fee' },
  { value: 'other', label: 'Other' },
]

// Populate form when editing
watch(
  () => props.entry,
  (entry) => {
    if (entry) {
      domainId.value = entry.domain_id
      transactionType.value = entry.transaction_type
      amount.value = String(entry.amount)
      transactionDate.value = entry.transaction_date
      notes.value = entry.notes || ''
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
  transactionType.value = 'purchase'
  amount.value = ''
  transactionDate.value = new Date().toISOString().slice(0, 10)
  notes.value = ''
  errors.value = {}
}

function validate(): boolean {
  errors.value = {}
  if (!domainId.value) errors.value.domainId = 'Domain is required'
  if (!amount.value || Number(amount.value) <= 0) errors.value.amount = 'Amount must be > 0'
  if (!transactionDate.value) errors.value.transactionDate = 'Date is required'
  return Object.keys(errors.value).length === 0
}

function submit() {
  if (!validate()) return
  emit('save', {
    domain_id: domainId.value!,
    transaction_type: transactionType.value,
    amount: Number(amount.value),
    transaction_date: transactionDate.value,
    notes: notes.value || null,
  })
}
</script>

<template>
 <div class="modal-overlay" @click.self="emit('close')">
 <div class="modal-dialog modal-dialog-centered">
 <div class="modal-content">
 <div class="modal-header">
 <h5 class="modal-title">{{ entry ? 'Edit Entry' : 'Add Entry' }}</h5>
          <button type="button" class="btn-close" @click="emit('close')"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="submit">
            <!-- Domain -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Domain</label>
              <select v-model="domainId" class="form-select" :class="{ 'is-invalid': errors.domainId }">
                <option :value="null" disabled>Select a domain…</option>
                <option v-for="d in domains.domains" :key="d.id" :value="d.id">{{ d.domain_name }}</option>
              </select>
              <div v-if="errors.domainId" class="invalid-feedback">{{ errors.domainId }}</div>
            </div>

            <!-- Type -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Transaction Type</label>
              <select v-model="transactionType" class="form-select">
                <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <!-- Amount -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Amount ($)</label>
              <input
                v-model="amount"
                type="number"
                step="0.01"
                min="0.01"
                class="form-control"
                :class="{ 'is-invalid': errors.amount }"
                placeholder="0.00"
              />
              <div v-if="errors.amount" class="invalid-feedback">{{ errors.amount }}</div>
            </div>

            <!-- Date -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Transaction Date</label>
              <input
                v-model="transactionDate"
                type="date"
                class="form-control"
                :class="{ 'is-invalid': errors.transactionDate }"
              />
              <div v-if="errors.transactionDate" class="invalid-feedback">{{ errors.transactionDate }}</div>
            </div>

            <!-- Notes -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Notes</label>
              <textarea v-model="notes" class="form-control" rows="2" placeholder="Optional notes…"></textarea>
            </div>
          </form>
        </div>
 <div class="modal-footer">
 <button class="btn btn-outline-secondary" @click="emit('close')">Cancel</button>
 <button class="btn btn-primary" @click="submit">
 {{ entry ? 'Save Changes' : 'Add Entry' }}
 </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* All modal styles are now global in style.css */
</style>
