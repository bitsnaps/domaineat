<script setup lang="ts">
import type { ExtensionCheckResult } from '@/types'

defineProps<{
	result: ExtensionCheckResult
}>()

defineEmits<{
	click: []
}>()
</script>

<template>
	<div
		class="card lookup-card h-100"
		:class="{ 'card-available': result.available, 'card-taken': !result.available }"
		role="button"
		tabindex="0"
		@click="$emit('click')"
		@keydown.enter="$emit('click')"
	>
		<div class="card-body d-flex flex-column p-3">
			<!-- Domain name — always fully visible -->
			<h6 class="card-title mb-1 text-break" style="word-break: break-all;">
				{{ result.domain }}
			</h6>

			<!-- Status badge -->
			<span
				class="badge align-self-start mb-2"
				:class="result.available ? 'bg-success' : 'bg-secondary'"
			>
				{{ result.available ? 'Available' : 'Taken' }}
			</span>

			<!-- Details -->
			<div v-if="!result.available" class="small text-muted mt-auto">
				<div v-if="result.registrar" class="text-truncate" :title="result.registrar">
					<i class="bi bi-building me-1"></i>{{ result.registrar }}
				</div>
				<div v-if="result.expiryDate">
					<i class="bi bi-calendar me-1"></i>Exp: {{ result.expiryDate }}
				</div>
			</div>
			<div v-else class="small text-success mt-auto">
				<i class="bi bi-check-circle me-1"></i>Available for registration
			</div>
		</div>
	</div>
</template>

<style scoped>
.lookup-card {
	transition: transform 0.15s, box-shadow 0.15s;
	cursor: pointer;
}
.lookup-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.card-available {
	border-left: 3px solid var(--bs-success, #198754);
}
.card-taken {
	border-left: 3px solid var(--bs-secondary, #6c757d);
}
</style>
