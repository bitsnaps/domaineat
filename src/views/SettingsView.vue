<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'
import type { User, AiStatus, LlmProvider } from '@/types'

const auth = useAuthStore()
const router = useRouter()

// User state
const user = ref<User | null>(null)
const aiStatus = ref<AiStatus | null>(null)
const loading = ref(false)
const saving = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

// Form state
const llmProvider = ref<LlmProvider | ''>('')
const llmModel = ref('')
const llmApiKey = ref('')

const providerOptions: { value: LlmProvider; label: string }[] = [
	{ value: 'openai', label: 'OpenAI' },
	{ value: 'anthropic', label: 'Anthropic' },
	{ value: 'groq', label: 'Groq' },
	{ value: 'openrouter', label: 'OpenRouter' },
]

const defaultModels: Record<string, string> = {
	openai: 'gpt-4o-mini',
	anthropic: 'claude-3-haiku-20240307',
	groq: 'llama-3.1-8b-instant',
	openrouter: 'openai/gpt-4o-mini',
}

const tierLabel = computed(() => {
	const t = user.value?.tier || 'free'
	return t.charAt(0).toUpperCase() + t.slice(1)
})

onMounted(async () => {
	loading.value = true
	try {
		const userId = auth.user?.id
		if (!userId) return
		const [userRes, statusRes] = await Promise.all([
			api.get(`/users/${userId}`),
			api.get(`/users/${userId}/ai-status`),
		])
		user.value = userRes.data
		aiStatus.value = statusRes.data

		// Pre-fill form
		if (user.value) {
			llmProvider.value = user.value.llm_provider || ''
			llmModel.value = user.value.llm_model || ''
		}
	} catch (err: any) {
		message.value = { type: 'error', text: err.response?.data?.error || err.message }
	} finally {
		loading.value = false
	}
})

async function saveAiSettings() {
	saving.value = true
	message.value = null
	try {
		const userId = auth.user?.id
		if (!userId) return

		const payload: Record<string, any> = {
			llm_provider: llmProvider.value || null,
			llm_model: llmModel.value || null,
		}
		// Only send API key if user typed a new one (not the masked version)
		if (llmApiKey.value && !llmApiKey.value.startsWith('\u2022\u2022\u2022\u2022')) {
			payload.llm_api_key_encrypted = llmApiKey.value
		}

		const res = await api.patch(`/users/${userId}/ai-settings`, payload)
		user.value = res.data
		llmApiKey.value = ''
		message.value = { type: 'success', text: 'AI settings saved!' }

		// Refresh AI status
		const statusRes = await api.get(`/users/${userId}/ai-status`)
		aiStatus.value = statusRes.data
	} catch (err: any) {
		message.value = { type: 'error', text: err.response?.data?.error || err.message }
	} finally {
		saving.value = false
	}
}

function onProviderChange() {
	if (!llmModel.value && llmProvider.value) {
		llmModel.value = defaultModels[llmProvider.value] || ''
	}
}

function handleLogout() {
	auth.logout()
	router.push('/login')
}
</script>

<template>
	<div class="settings-view">
		<h5 class="fw-semibold mb-4">Settings</h5>

		<div v-if="loading" class="text-center py-5 text-muted">Loading…</div>

		<template v-else>
			<!-- User Profile Card -->
			<div class="card border-0 shadow-sm mb-4">
				<div class="card-body">
					<h6 class="fw-semibold mb-3">Profile</h6>
					<div class="row">
						<div class="col-sm-4 text-muted small">Email</div>
						<div class="col-sm-8 small fw-medium">{{ user?.email || '\u2014' }}</div>
					</div>
					<div class="row mt-2">
						<div class="col-sm-4 text-muted small">Tier</div>
						<div class="col-sm-8">
							<span class="badge rounded-pill" :class="user?.tier === 'free' ? 'bg-secondary' : 'bg-primary'">
								{{ tierLabel }}
							</span>
						</div>
					</div>
					<div class="mt-3">
						<button class="btn btn-sm btn-outline-secondary" @click="handleLogout">Sign Out</button>
					</div>
				</div>
			</div>

			<!-- AI Configuration Card -->
			<div class="card border-0 shadow-sm mb-4">
				<div class="card-body">
					<h6 class="fw-semibold mb-3">AI Configuration</h6>
					<p class="text-muted small mb-3">
						Configure your LLM provider and API key to enable AI-powered outreach draft generation.
						Your API key is stored encrypted and only sent to the provider during generation.
					</p>

					<!-- Provider -->
					<div class="mb-3">
						<label class="form-label small fw-semibold">LLM Provider</label>
						<select v-model="llmProvider" class="form-select" @change="onProviderChange">
							<option value="">Select a provider…</option>
							<option v-for="opt in providerOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
						</select>
					</div>

					<!-- Model -->
					<div class="mb-3">
						<label class="form-label small fw-semibold">Model</label>
						<input v-model="llmModel" type="text" class="form-control" :placeholder="llmProvider ? defaultModels[llmProvider] : 'e.g. gpt-4o-mini'" />
						<div class="form-text small">Leave blank to use the default model for your provider.</div>
					</div>

					<!-- API Key -->
					<div class="mb-3">
						<label class="form-label small fw-semibold">API Key</label>
						<input v-model="llmApiKey" type="password" class="form-control" :placeholder="user?.llm_api_key_encrypted ? 'Key stored \u2014 enter new to replace' : 'sk-\u2026'" />
						<div v-if="user?.llm_api_key_encrypted" class="form-text small">
							Current key ends in: {{ user.llm_api_key_encrypted }}
						</div>
					</div>

					<!-- Save button -->
					<div class="d-flex align-items-center gap-2">
						<button class="btn btn-sm text-white" style="background: #6366f1;" :disabled="saving" @click="saveAiSettings">
							{{ saving ? 'Saving\u2026' : 'Save AI Settings' }}
						</button>
						<div v-if="message" :class="message.type === 'success' ? 'text-success' : 'text-danger'" class="small">
							{{ message.text }}
						</div>
					</div>
				</div>
			</div>

			<!-- AI Usage Card -->
			<div class="card border-0 shadow-sm mb-4">
				<div class="card-body">
					<h6 class="fw-semibold mb-3">AI Usage</h6>
					<div class="row g-3">
						<div class="col-sm-4">
							<div class="text-muted small fw-semibold text-uppercase mb-1">Today's Calls</div>
							<div class="h5 mb-0">{{ aiStatus?.daily_calls ?? 0 }}</div>
						</div>
						<div class="col-sm-4">
							<div class="text-muted small fw-semibold text-uppercase mb-1">Daily Limit</div>
							<div class="h5 mb-0">{{ aiStatus?.daily_limit === Infinity ? '\u221e' : aiStatus?.daily_limit ?? 5 }}</div>
						</div>
						<div class="col-sm-4">
							<div class="text-muted small fw-semibold text-uppercase mb-1">Status</div>
							<div class="h5 mb-0">
								<span v-if="aiStatus?.configured" class="text-success">\u2713 Configured</span>
								<span v-else class="text-muted">\u2717 Not configured</span>
							</div>
						</div>
					</div>

					<!-- Usage bar -->
					<div v-if="aiStatus && aiStatus.daily_limit !== Infinity" class="mt-3">
						<div class="progress" style="height: 8px;">
							<div
								class="progress-bar"
								:class="(aiStatus.daily_calls / aiStatus.daily_limit) > 0.8 ? 'bg-danger' : 'bg-primary'"
								:style="{ width: Math.min(100, (aiStatus.daily_calls / aiStatus.daily_limit) * 100) + '%' }"
							></div>
						</div>
						<div class="text-muted small mt-1">{{ aiStatus.daily_calls }} / {{ aiStatus.daily_limit }} calls used today</div>
					</div>
				</div>
			</div>

			<!-- Tier & Limits Card -->
			<div class="card border-0 shadow-sm mb-4">
				<div class="card-body">
					<h6 class="fw-semibold mb-3">Tier &amp; Limits</h6>
					<div class="row g-3">
						<div class="col-sm-4">
							<div class="text-muted small fw-semibold text-uppercase mb-1">Domains</div>
							<div class="h5 mb-0">{{ user?.tier === 'enterprise' ? '\u221e' : (user?.tier === 'premium' ? '1,000' : '10') }}</div>
						</div>
						<div class="col-sm-4">
							<div class="text-muted small fw-semibold text-uppercase mb-1">RDAP / day</div>
							<div class="h5 mb-0">{{ user?.tier === 'enterprise' ? '\u221e' : (user?.tier === 'premium' ? '100' : '5') }}</div>
						</div>
						<div class="col-sm-4">
							<div class="text-muted small fw-semibold text-uppercase mb-1">AI calls / day</div>
							<div class="h5 mb-0">{{ aiStatus?.daily_limit === Infinity ? '\u221e' : (aiStatus?.daily_limit ?? 5) }}</div>
						</div>
					</div>
					<!-- Upgrade CTA for free tier -->
					<div v-if="user?.tier === 'free'" class="mt-3 p-3 rounded" style="background: #eef2ff;">
						<div class="small fw-semibold" style="color: #6366f1;">Upgrade to Premium</div>
						<div class="text-muted small mb-2">Get 1,000 domains, 100 RDAP checks/day, and 100 AI calls/day.</div>
						<button class="btn btn-sm text-white" style="background: #6366f1;" disabled>Coming Soon</button>
					</div>
					<div v-else-if="user?.tier === 'premium'" class="mt-3 p-3 rounded" style="background: #fef3c7;">
						<div class="small fw-semibold" style="color: #b45309;">Upgrade to Enterprise</div>
						<div class="text-muted small mb-2">Unlimited domains, RDAP checks, and AI calls.</div>
						<button class="btn btn-sm text-white" style="background: #b45309;" disabled>Coming Soon</button>
					</div>
				</div>
			</div>

			<!-- Currency Settings Card -->
			<div class="card border-0 shadow-sm mb-4">
				<div class="card-body">
					<h6 class="fw-semibold mb-3">Currency</h6>
					<p class="text-muted small mb-0">
						Set your preferred display currency in the Ledger view. This setting is stored locally in your browser.
					</p>
				</div>
			</div>
		</template>
	</div>
</template>
