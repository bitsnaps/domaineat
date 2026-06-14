<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'
import type { User, AiStatus, LlmProvider } from '@/types'

interface ProviderStatus {
	name: string
	configured: boolean
}

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
const preferredRegistrar = ref('')
const registrarMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const providerOptions: { value: LlmProvider; label: string }[] = [
	{ value: 'openai', label: 'OpenAI' },
	{ value: 'anthropic', label: 'Anthropic' },
	{ value: 'groq', label: 'Groq' },
	{ value: 'nvidia', label: 'NVIDIA' },
	{ value: 'openrouter', label: 'OpenRouter' },
]

const defaultModels: Record<string, string> = {
	openai: 'gpt-5.4-mini',
	anthropic: 'claude-haiku-4-5',
	groq: 'openai/gpt-oss-120b',
	nvidia: 'nvidia/nemotron-3-super-120b-a12b',
	openrouter: 'openrouter/free',
}

const tierLabel = computed(() => {
	const t = user.value?.tier || 'free'
	return t.charAt(0).toUpperCase() + t.slice(1)
})

// ─── Pricing Provider Status ──────────────────────────────────────────
const pricingProviders = ref<ProviderStatus[]>([])

onMounted(async () => {
	loading.value = true
	try {
		const userId = auth.user?.id
		if (!userId) return
		const [userRes, statusRes, providersRes] = await Promise.all([
			api.get(`/users/${userId}`),
			api.get(`/users/${userId}/ai-status`),
			api.get('/pricing/providers').catch(() => ({ data: [] })),
		])
		user.value = userRes.data
		aiStatus.value = statusRes.data
		pricingProviders.value = providersRes.data

		// Pre-fill form
		if (user.value) {
			llmProvider.value = user.value.llm_provider || ''
			llmModel.value = user.value.llm_model || ''
			preferredRegistrar.value = (user.value as any).preferred_registrar || ''
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

async function saveRegistrar() {
	saving.value = true
	registrarMessage.value = null
	try {
		const userId = auth.user?.id
		if (!userId) return
		const res = await api.patch(`/users/${userId}/ai-settings`, {
			preferred_registrar: preferredRegistrar.value || null,
		})
		user.value = res.data
		registrarMessage.value = { type: 'success', text: 'Registrar preferences saved!' }
	} catch (err: any) {
		registrarMessage.value = { type: 'error', text: err.response?.data?.error || err.message }
	} finally {
		saving.value = false
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
						<input v-model="llmModel" type="text" class="form-control" :placeholder="llmProvider ? defaultModels[llmProvider] : 'e.g. gpt-5.4-mini'" />
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
								<span v-if="aiStatus?.configured" class="text-success">✓ Configured</span>
								<span v-else class="text-muted">✗ Not configured</span>
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

			<!-- Domain Pricing Providers Card -->
			<div v-if="pricingProviders.length > 0" class="card border-0 shadow-sm mb-4">
				<div class="card-body">
					<h6 class="fw-semibold mb-3">
						<i class="bi bi-tag me-2" style="color: #6366f1;"></i>Domain Pricing Providers
					</h6>
					<p class="text-muted small mb-3">
						These providers supply domain registration pricing data. Configure API keys in your environment to enable each provider.
					</p>
					<div class="row g-3">
						<div v-for="p in pricingProviders" :key="p.name" class="col-sm-4">
							<div class="d-flex align-items-center gap-2 p-2 rounded bg-light">
								<i class="bi" :class="p.configured ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'"></i>
								<div>
									<div class="fw-semibold small">{{ p.name }}</div>
									<div class="text-muted" style="font-size: 0.7rem;">
										{{ p.configured ? 'Configured' : 'Not configured' }}
									</div>
								</div>
							</div>
						</div>
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

			<!-- Registrar Preferences Card -->
			<div class="card border-0 shadow-sm mb-4">
				<div class="card-body">
					<h6 class="fw-semibold mb-3">Registrar Preferences</h6>
					<p class="text-muted small mb-3">
						Set your preferred registrar URL for the "Register Now" button in the Wishlist.
						Use <code>{domain}</code> as a placeholder for the domain name.
					</p>
					<div class="mb-3">
						<label class="form-label small fw-semibold">Registrar URL</label>
						<input
							v-model="preferredRegistrar"
							type="text"
							class="form-control"
							placeholder="https://www.namecheap.com/domains/registration/results/?domain={domain}"
						/>
						<div class="form-text small">
							Leave blank to use Namecheap as default. Examples:<br />
							<code>https://www.namecheap.com/domains/registration/results/?domain={domain}</code><br />
							<code>https://www.godaddy.com/domainsearch/find?checkAvail=1&tmskey=&domainToCheck={domain}</code>
						</div>
					</div>
					<div class="d-flex align-items-center gap-2">
						<button class="btn btn-sm text-white" style="background: #6366f1;" :disabled="saving" @click="saveRegistrar">
							{{ saving ? 'Saving\u2026' : 'Save Registrar' }}
						</button>
						<div v-if="registrarMessage" :class="registrarMessage.type === 'success' ? 'text-success' : 'text-danger'" class="small">
							{{ registrarMessage.text }}
						</div>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>
