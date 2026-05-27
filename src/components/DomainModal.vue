<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Domain, DomainStatus } from '@/types'

const props = defineProps<{
  domain: Domain | null
}>()

const emit = defineEmits<{
  save: [payload: any]
  close: []
}>()

const form = ref({
  domain_name: '',
  registrar: '',
  acquisition_date: '',
  expiry_date: '',
  acquisition_cost: 0,
  renewal_cost: 0,
  nameservers: '',
  status: 'active' as DomainStatus,
})

// Populate form when editing
watch(
  () => props.domain,
  (d) => {
    if (d) {
      form.value = {
        domain_name: d.domain_name,
        registrar: d.registrar,
        acquisition_date: d.acquisition_date,
        expiry_date: d.expiry_date,
        acquisition_cost: Number(d.acquisition_cost),
        renewal_cost: Number(d.renewal_cost),
        nameservers: d.nameservers || '',
        status: d.status,
      }
    } else {
      form.value = {
        domain_name: '',
        registrar: '',
        acquisition_date: new Date().toISOString().slice(0, 10),
        expiry_date: '',
        acquisition_cost: 0,
        renewal_cost: 0,
        nameservers: '',
        status: 'active',
      }
    }
  },
  { immediate: true }
)

const statuses: DomainStatus[] = ['active', 'expired', 'sold', 'pending_delete', 'parked']

function submit() {
  if (!form.value.domain_name || !form.value.registrar || !form.value.expiry_date) return
  emit('save', {
    ...form.value,
    nameservers: form.value.nameservers || null,
  })
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-dialog modal-dialog-centered">
 <div class="modal-content">
 <div class="modal-header">
 <h5 class="modal-title">
 {{ domain ? 'Edit Domain' : 'Add Domain' }}
 </h5>
          <button type="button" class="btn-close" @click="emit('close')"></button>
        </div>

        <div class="modal-body">
          <form @submit.prevent="submit">
            <!-- Domain name -->
            <div class="mb-3">
              <label class="form-label small fw-medium">Domain Name *</label>
              <input type="text" class="form-control" v-model="form.domain_name"
                placeholder="e.g. example.com" required :disabled="!!domain" />
            </div>

            <!-- Registrar -->
            <div class="mb-3">
              <label class="form-label small fw-medium">Registrar *</label>
              <input type="text" class="form-control" v-model="form.registrar"
                placeholder="e.g. Cloudflare, GoDaddy, Porkbun" required />
            </div>

            <div class="row g-3 mb-3">
              <!-- Acquisition date -->
              <div class="col-6">
                <label class="form-label small fw-medium">Acquired</label>
                <input type="date" class="form-control" v-model="form.acquisition_date" />
              </div>
              <!-- Expiry date -->
              <div class="col-6">
                <label class="form-label small fw-medium">Expiry Date *</label>
                <input type="date" class="form-control" v-model="form.expiry_date" required />
              </div>
            </div>

            <div class="row g-3 mb-3">
              <!-- Acquisition cost -->
              <div class="col-6">
                <label class="form-label small fw-medium">Purchase Price ($)</label>
                <input type="number" class="form-control" v-model.number="form.acquisition_cost"
                  min="0" step="0.01" />
              </div>
              <!-- Renewal cost -->
              <div class="col-6">
                <label class="form-label small fw-medium">Renewal Cost ($/yr)</label>
                <input type="number" class="form-control" v-model.number="form.renewal_cost"
                  min="0" step="0.01" />
              </div>
            </div>

            <!-- Nameservers -->
            <div class="mb-3">
              <label class="form-label small fw-medium">Nameservers</label>
              <input type="text" class="form-control" v-model="form.nameservers"
                placeholder="ns1.example.com, ns2.example.com" />
              <div class="form-text">Comma-separated</div>
            </div>

            <!-- Status -->
            <div class="mb-3">
              <label class="form-label small fw-medium">Status</label>
              <select class="form-select" v-model="form.status">
                <option v-for="s in statuses" :key="s" :value="s">{{ s.replace('_', ' ') }}</option>
              </select>
            </div>

 <!-- Actions -->
 <div class="d-flex justify-content-end gap-2 pt-2">
 <button type="button" class="btn btn-outline-secondary" @click="emit('close')">Cancel</button>
 <button type="submit" class="btn btn-primary">
 {{ domain ? 'Save Changes' : 'Add Domain' }}
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 </div>
</template>

<style scoped>
/* All modal styles are now global in style.css */
</style>
