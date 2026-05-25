<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLogin = ref(true) // toggle between login and register
const localError = ref<string | null>(null)

// Clear error when switching modes
watch(isLogin, () => {
	localError.value = null
	confirmPassword.value = ''
})

async function handleSubmit() {
	localError.value = null

	// Client-side validation for register
	if (!isLogin.value) {
		if (password.value !== confirmPassword.value) {
			localError.value = 'Passwords do not match'
			return
		}
	}

	try {
		if (isLogin.value) {
			await auth.login(email.value, password.value)
		} else {
			await auth.register(email.value, password.value, confirmPassword.value)
		}
		const redirect = (router.currentRoute.value.query.redirect as string) || '/'
		router.push(redirect)
	} catch (err: any) {
		localError.value = err.message
	}
}
</script>

<template>
	<div class="login-view d-flex align-items-center justify-content-center min-vh-100" style="background: #f8f9fa;">
		<div class="card border-0 shadow" style="width: 400px; max-width: 90vw;">
			<div class="card-body p-4">
				<h4 class="fw-semibold text-center mb-1" style="color: #6366f1;">DomainEat</h4>
				<p class="text-muted text-center small mb-4">
					{{ isLogin ? 'Sign in to your account' : 'Create a new account' }}
				</p>

				<!-- Error alert -->
				<div v-if="localError || auth.error" class="alert alert-danger small py-2 mb-3">
					{{ localError || auth.error }}
				</div>

				<form @submit.prevent="handleSubmit">
					<div class="mb-3">
						<label class="form-label small fw-semibold">Email</label>
						<input
							v-model="email"
							type="email"
							class="form-control"
							placeholder="you@example.com"
							required
							autofocus
						/>
					</div>
					<div class="mb-3">
						<label class="form-label small fw-semibold">Password</label>
						<input
							v-model="password"
							type="password"
							class="form-control"
							placeholder="Min 8 characters"
							required
							minlength="8"
						/>
					</div>
					<div v-if="!isLogin" class="mb-3">
						<label class="form-label small fw-semibold">Confirm Password</label>
						<input
							v-model="confirmPassword"
							type="password"
							class="form-control"
							placeholder="Re-enter your password"
							required
							minlength="8"
						/>
					</div>
					<button
						type="submit"
						class="btn w-100 text-white mb-3"
						style="background: #6366f1;"
						:disabled="auth.loading"
					>
						<span v-if="auth.loading" class="spinner-border spinner-border-sm me-1"></span>
						{{ isLogin ? 'Sign In' : 'Create Account' }}
					</button>
				</form>

				<div class="text-center">
					<button class="btn btn-link btn-sm text-muted" @click="isLogin = !isLogin">
						{{ isLogin ? "Don't have an account? Register" : 'Already have an account? Sign in' }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
