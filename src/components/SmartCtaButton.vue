<script setup lang="ts">
import type { SmartCta } from '@/lib/smart-ctas'

defineProps<{
	cta: SmartCta
}>()

defineEmits<{
	action: [key: string]
}>()
</script>

<template>
	<button
		class="btn btn-sm smart-cta"
		:class="`btn-${cta.variant}`"
		:title="cta.description"
		@click="$emit('action', cta.key)"
	>
		<i class="bi me-1" :class="cta.icon"></i>{{ cta.label }}
	</button>
</template>

<style scoped>
.smart-cta {
	font-weight: 600;
	font-size: 0.8125rem;
	letter-spacing: 0.01em;
}
</style>
