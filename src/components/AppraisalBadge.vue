<script setup lang="ts">
import type { AppraisalGrade } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
	grade: AppraisalGrade
	range?: { low: number; high: number }
	size?: 'sm' | 'md' | 'lg'
}>()

const size = computed(() => props.size || 'sm')

const gradeClass = computed(() => {
	const map: Record<string, string> = {
		'A+': 'grade-aplus',
		'A': 'grade-a',
		'B': 'grade-b',
		'C': 'grade-c',
		'D': 'grade-d',
		'F': 'grade-f',
	}
	return map[props.grade] || 'grade-f'
})

const sizeClass = computed(() => `badge-${size.value}`)

function formatPrice(n: number): string {
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
	return `$${n}`
}

const rangeText = computed(() => {
	if (!props.range) return ''
	return `${formatPrice(props.range.low)} – ${formatPrice(props.range.high)}`
})
</script>

<template>
	<span
		class="badge appraisal-badge"
		:class="[gradeClass, sizeClass]"
		:title="rangeText ? `${grade} · ${rangeText}` : grade"
	>
		{{ grade }}
	</span>
</template>

<style scoped>
.appraisal-badge {
	font-weight: 700;
	letter-spacing: 0.02em;
	border-radius: 4px;
}
.badge-sm { font-size: 0.7rem; padding: 0.15em 0.4em; }
.badge-md { font-size: 0.8rem; padding: 0.2em 0.5em; }
.badge-lg { font-size: 1rem; padding: 0.25em 0.6em; }

.grade-aplus { background: #10b981; color: #fff; }
.grade-a     { background: #22c55e; color: #fff; }
.grade-b     { background: #3b82f6; color: #fff; }
.grade-c     { background: #f59e0b; color: #fff; }
.grade-d     { background: #ef4444; color: #fff; }
.grade-f     { background: #6b7280; color: #fff; }
</style>
