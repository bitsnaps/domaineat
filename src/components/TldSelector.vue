<script setup lang="ts">
const props = defineProps<{
	modelValue: string[]
	available: string[]
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string[]]
}>()

function toggle(tld: string) {
	const current = [...props.modelValue]
	const idx = current.indexOf(tld)
	if (idx >= 0) {
		current.splice(idx, 1)
	} else {
		current.push(tld)
	}
	emit('update:modelValue', current)
}

function selectAll() {
	emit('update:modelValue', [...props.available])
}

function selectNone() {
	emit('update:modelValue', [])
}
</script>

<template>
	<div class="tld-selector">
		<div class="d-flex justify-content-between align-items-center mb-2">
			<label class="form-label mb-0 fw-semibold">TLDs</label>
			<div class="btn-group btn-group-sm">
				<button class="btn btn-outline-primary btn-sm" @click="selectAll">All</button>
				<button class="btn btn-outline-secondary btn-sm" @click="selectNone">None</button>
			</div>
		</div>
		<div class="d-flex flex-wrap gap-2">
			<button
				v-for="tld in available"
				:key="tld"
				class="btn btn-sm"
				:class="modelValue.includes(tld) ? 'btn-primary' : 'btn-outline-secondary'"
				@click="toggle(tld)"
			>
				.{{ tld }}
			</button>
		</div>
	</div>
</template>

<style scoped>
.tld-selector .btn-sm {
	min-width: 52px;
}
</style>
