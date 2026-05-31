<script setup lang="ts">
import type { DecisionSignal } from '@/lib/decision-signals'

defineProps<{
	signals: DecisionSignal[]
}>()
</script>

<template>
	<span v-if="signals.length" class="decision-signals d-inline-flex flex-wrap gap-1">
		<span
			v-for="signal in signals"
			:key="signal.key"
			class="badge decision-signal"
			:class="`bg-${signal.variant}${signal.variant === 'warning' ? ' text-dark' : ''}`"
			:title="signal.label"
		>
			<i class="bi me-1" :class="signal.icon"></i>{{ signal.label }}
		</span>
	</span>
</template>

<style scoped>
.decision-signal {
	font-weight: 600;
	font-size: 0.7rem;
	letter-spacing: 0.02em;
	border-radius: 4px;
}
</style>
