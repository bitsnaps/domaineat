<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'
import type { Prospect, Domain, AiDraftResponse } from '@/types'

const auth = useAuthStore()

const props = defineProps<{
	prospect: Prospect
	domain: Domain
}>()

const emit = defineEmits<{
	close: []
	saved: [draft: string]
}>()

// State
const generating = ref(false)
const draft = ref('')
const error = ref<string | null>(null)
const copied = ref(false)
const provider = ref('')
const model = ref('')

const hasDraft = computed(() => draft.value.trim().length > 0)

async function generateDraft() {
	generating.value = true
	error.value = null
	draft.value = ''

	try {
		const res = await api.post('/ai/draft-outreach', {
			// user_id removed — server extracts from JWT
			domain_name: props.domain.domain_name,
			prospect_domain: props.prospect.prospect_domain,
			company_name: props.prospect.company_name,
			contact_email: props.prospect.contact_email,
		})

		const data = res.data as AiDraftResponse
		draft.value = data.draft
		provider.value = data.provider
		model.value = data.model
	} catch (err: any) {
		error.value = err.response?.data?.error || err.message
	} finally {
		generating.value = false
	}
}

async function copyDraft() {
	try {
		await navigator.clipboard.writeText(draft.value)
		copied.value = true
		setTimeout(() => { copied.value = false }, 2000)
	} catch {
		// Fallback: select text
		const textarea = document.querySelector('.draft-textarea') as HTMLTextAreaElement
		if (textarea) { textarea.select(); document.execCommand('copy') }
		copied.value = true
		setTimeout(() => { copied.value = false }, 2000)
	}
}

function saveAndClose() {
	emit('saved', draft.value)
	emit('close')
}
</script>

<template>
	<div class="modal-backdrop" @click.self="emit('close')">
		<div class="modal-dialog modal-dialog-centered modal-lg">
			<div class="modal-content border-0 shadow">
				<div class="modal-header border-0 pb-0">
					<h5 class="modal-title fw-semibold">
						Outreach Draft \u2014 {{ prospect.prospect_domain }}
					</h5>
					<button type="button" class="btn-close" @click="emit('close')"></button>
				</div>
				<div class="modal-body">
					<!-- Context info -->
					<div class="d-flex gap-3 mb-3 text-muted small">
						<span>\ud83d\udc64 {{ prospect.company_name || 'Unknown company' }}</span>
						<span>\ud83d\udce7 {{ prospect.contact_email || 'No email' }}</span>
						<span>\ud83c\udfe0 Your domain: {{ domain.domain_name }}</span>
					</div>

					<!-- Generate button -->
					<div v-if="!hasDraft && !generating && !error" class="text-center py-4">
						<p class="text-muted mb-3">Generate an AI outreach email for this prospect.</p>
						<button class="btn text-white" style="background: #6366f1;" @click="generateDraft">
							\u2728 Generate Draft
						</button>
					</div>

					<!-- Loading -->
					<div v-if="generating" class="text-center py-4">
						<div class="spinner-border text-primary spinner-border-sm me-2"></div>
						<span class="text-muted">Generating outreach draft\u2026</span>
					</div>

					<!-- Error -->
					<div v-if="error" class="alert alert-danger small py-2">
						{{ error }}
						<button class="btn btn-sm btn-link p-0 ms-2" @click="generateDraft">Retry</button>
					</div>

					<!-- Draft textarea -->
					<div v-if="hasDraft">
						<div class="d-flex justify-content-between align-items-center mb-2">
							<span class="small text-muted">Generated via {{ provider }} / {{ model }}</span>
							<div class="d-flex gap-2">
								<button class="btn btn-sm btn-outline-secondary" @click="copyDraft">
									{{ copied ? '\u2713 Copied' : '\ud83d\udccb Copy' }}
								</button>
								<button class="btn btn-sm btn-outline-secondary" @click="generateDraft" :disabled="generating">
									\ud83d\udd04 Regenerate
								</button>
							</div>
						</div>
						<textarea
							v-model="draft"
							class="form-control draft-textarea"
							rows="10"
							style="font-size: 0.9rem; line-height: 1.6;"
						></textarea>
					</div>
				</div>
				<div class="modal-footer border-0 pt-0">
					<button class="btn btn-sm btn-outline-secondary" @click="emit('close')">Cancel</button>
					<button v-if="hasDraft" class="btn btn-sm text-white" style="background: #6366f1;" @click="saveAndClose">
						Save Draft
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.4);
	backdrop-filter: blur(4px);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1050;
}
</style>
