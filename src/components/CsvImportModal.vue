<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{
  import: [domains: any[]]
  close: []
}>()

interface CsvRow {
  domain_name: string
  registrar: string
  acquisition_date: string
  expiry_date: string
  acquisition_cost: number
  renewal_cost: number
  nameservers: string
  status: string
  _errors: string[]
  _valid: boolean
}

const step = ref<'upload' | 'preview' | 'done'>('upload')
const rawText = ref('')
const fileName = ref('')
const rows = ref<CsvRow[]>([])

// Expected CSV headers
const HEADERS = ['domain_name', 'registrar', 'acquisition_date', 'expiry_date', 'acquisition_cost', 'renewal_cost', 'nameservers', 'status']
const REQUIRED = ['domain_name', 'registrar', 'expiry_date']

const validRows = computed(() => rows.value.filter((r) => r._valid))
const invalidRows = computed(() => rows.value.filter((r) => !r._valid))

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    rawText.value = reader.result as string
  }
  reader.readAsText(file)
}

function parseCsv() {
  const lines = rawText.value.trim().split(/\r?\n/)
  if (lines.length < 2) return

  // Parse header
  const headerLine = (lines[0] ?? '').toLowerCase().trim()
  const headers = headerLine.split(',').map((h) => h.trim())

  // Validate headers
  const missingRequired = REQUIRED.filter((r) => !headers.includes(r))
  if (missingRequired.length) {
    rows.value = [{
      domain_name: '', registrar: '', acquisition_date: '', expiry_date: '',
      acquisition_cost: 0, renewal_cost: 0, nameservers: '', status: 'active',
      _errors: [`Missing required columns: ${missingRequired.join(', ')}`],
      _valid: false,
    }]
    step.value = 'preview'
    return
  }

  // Parse data rows
  rows.value = lines.slice(1).filter((l) => l.trim()).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: CsvRow = {
      domain_name: '',
      registrar: '',
      acquisition_date: '',
      expiry_date: '',
      acquisition_cost: 0,
      renewal_cost: 0,
      nameservers: '',
      status: 'active',
      _errors: [],
      _valid: true,
    }

    headers.forEach((h, i) => {
      const val = values[i] || ''
      if (h in row && h !== '_errors' && h !== '_valid') {
        ;(row as any)[h] = h === 'acquisition_cost' || h === 'renewal_cost'
          ? parseFloat(val) || 0
          : val
      }
    })

    // Validate
    if (!row.domain_name) row._errors.push('domain_name is required')
    if (!row.registrar) row._errors.push('registrar is required')
    if (!row.expiry_date) row._errors.push('expiry_date is required')
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.expiry_date)) row._errors.push('expiry_date must be YYYY-MM-DD')
    if (row.acquisition_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.acquisition_date))
      row._errors.push('acquisition_date must be YYYY-MM-DD')
    if (!/\.\w+$/.test(row.domain_name)) row._errors.push('domain_name must have a TLD')

    row._valid = row._errors.length === 0
    return row
  })

  step.value = 'preview'
}

async function doImport() {
 const domains = validRows.value.map((r) => ({
 domain_name: r.domain_name,
    registrar: r.registrar,
    acquisition_date: r.acquisition_date || new Date().toISOString().slice(0, 10),
    expiry_date: r.expiry_date,
    acquisition_cost: r.acquisition_cost,
    renewal_cost: r.renewal_cost,
    nameservers: r.nameservers || null,
    status: r.status || 'active',
  }))

  emit('import', domains)
  step.value = 'done'
}

function downloadTemplate() {
  const csv = HEADERS.join(',') + '\nexample.com,Cloudflare,2024-01-15,2025-01-15,12.00,12.00,ns1.cloudflare.com,active\n'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'domaineat-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="modal-backdrop show" @click.self="emit('close')">
    <div class="modal d-block" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content" style="border-radius: 0.875rem; border: none; box-shadow: 0 25px 60px rgba(0,0,0,0.15);">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title" style="font-family: var(--font-display); font-weight: 600;">
              Import Domains from CSV
            </h5>
            <button type="button" class="btn-close" @click="emit('close')"></button>
          </div>

          <div class="modal-body">
            <!-- Step 1: Upload -->
            <div v-if="step === 'upload'">
              <p class="text-muted small mb-3">
                Upload a CSV file with domain data. Required columns: <code>domain_name</code>, <code>registrar</code>, <code>expiry_date</code>.
              </p>

              <div class="mb-3">
                <label class="form-label small fw-medium">CSV File</label>
                <input type="file" class="form-control" accept=".csv" @change="onFileChange" />
              </div>

              <div class="mb-3" v-if="rawText">
                <label class="form-label small fw-medium">Preview (raw)</label>
                <pre class="form-control small bg-light" style="max-height: 200px; overflow: auto; font-size: 0.75rem;">{{ rawText.slice(0, 1000) }}</pre>
              </div>

              <div class="d-flex justify-content-between">
                <button class="btn btn-outline-secondary btn-sm" @click="downloadTemplate">
                  <i class="bi bi-download me-1"></i>Download Template
                </button>
                <button class="btn btn-primary btn-sm" :disabled="!rawText" @click="parseCsv">
                  <i class="bi bi-arrow-right me-1"></i>Parse & Preview
                </button>
              </div>
            </div>

            <!-- Step 2: Preview -->
            <div v-if="step === 'preview'">
              <div class="d-flex justify-content-between mb-3">
                <div>
                  <span class="badge bg-success-subtle text-success me-2">{{ validRows.length }} valid</span>
                  <span class="badge bg-danger-subtle text-danger" v-if="invalidRows.length">{{ invalidRows.length }} with errors</span>
                </div>
                <button class="btn btn-outline-secondary btn-sm" @click="step = 'upload'">
                  <i class="bi bi-arrow-left me-1"></i>Back
                </button>
              </div>

              <div class="table-responsive" style="max-height: 350px; overflow: auto;">
                <table class="table table-sm table-hover mb-0">
                  <thead class="table-light sticky-top">
                    <tr>
                      <th style="width:30px;"></th>
                      <th>Domain</th>
                      <th>Registrar</th>
                      <th>Expiry</th>
                      <th>Cost</th>
                      <th>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in rows" :key="i" :class="{ 'table-danger': !row._valid }">
                      <td>
                        <i class="bi" :class="row._valid ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'"></i>
                      </td>
                      <td class="small">{{ row.domain_name }}</td>
                      <td class="small">{{ row.registrar }}</td>
                      <td class="small">{{ row.expiry_date }}</td>
                      <td class="small">${{ row.renewal_cost }}</td>
                      <td class="small text-danger">{{ row._errors.join('; ') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="d-flex justify-content-end gap-2 mt-3">
                <button class="btn btn-outline-secondary btn-sm" @click="emit('close')">Cancel</button>
                <button class="btn btn-primary btn-sm" :disabled="!validRows.length" @click="doImport">
                  <i class="bi bi-upload me-1"></i>Import {{ validRows.length }} Domains
                </button>
              </div>
            </div>

            <!-- Step 3: Done -->
            <div v-if="step === 'done'" class="text-center py-4">
              <i class="bi bi-check-circle fs-1 text-success"></i>
              <p class="mt-2 fw-medium">Import complete!</p>
              <p class="text-muted small">{{ validRows.length }} domains imported successfully.</p>
              <button class="btn btn-primary btn-sm" @click="emit('close')">Done</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
}

.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
}

.btn-primary:hover {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
}
</style>
