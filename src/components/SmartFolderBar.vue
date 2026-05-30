<script setup lang="ts">
import type { SmartFolderKey } from '@/types'

defineProps<{
	activeFolder: SmartFolderKey
	counts: Record<string, number>
}>()

const emit = defineEmits<{
	(e: 'select', folder: SmartFolderKey): void
}>()

type Folder = { key: SmartFolderKey; label: string; icon: string; variant: string }

const folders: Folder[] = [
	{ key: 'all', label: 'All', icon: 'bi-grid-3x3-gap', variant: 'btn-outline-primary' },
	{ key: 'A+', label: 'A+', icon: 'bi-star-fill', variant: 'btn-outline-warning' },
	{ key: 'A', label: 'A', icon: 'bi-star', variant: 'btn-outline-success' },
	{ key: 'B', label: 'B', icon: 'bi-star-half', variant: 'btn-outline-info' },
	{ key: 'C', label: 'C', icon: 'bi-circle', variant: 'btn-outline-secondary' },
	{ key: 'D', label: 'D', icon: 'bi-circle-fill', variant: 'btn-outline-danger' },
	{ key: 'ungraded', label: 'Ungraded', icon: 'bi-question-circle', variant: 'btn-outline-dark' },
	{ key: 'expiring', label: 'Expiring', icon: 'bi-clock', variant: 'btn-outline-danger' },
	{ key: 'undervalued', label: 'Undervalued', icon: 'bi-cash-coin', variant: 'btn-outline-success' },
	{ key: 'outreach', label: 'Outreach', icon: 'bi-chat-dots', variant: 'btn-outline-info' },
	{ key: 'recent', label: 'Recent', icon: 'bi-calendar-plus', variant: 'btn-outline-primary' },
	{ key: 'agent', label: 'Agent', icon: 'bi-robot', variant: 'btn-outline-warning' },
]
</script>

<template>
	<div class="smart-folder-bar d-flex flex-wrap gap-2 mb-3">
		<button
			v-for="folder in folders"
			:key="folder.key"
			class="btn btn-sm d-flex align-items-center gap-1"
			:class="[
				activeFolder === folder.key ? folder.variant.replace('outline-', '') : folder.variant,
				activeFolder === folder.key ? 'text-white' : ''
			]"
			@click="emit('select', folder.key)"
		>
			<i class="bi" :class="folder.icon"></i>
			{{ folder.label }}
			<span v-if="counts[folder.key]" class="badge rounded-pill bg-light text-dark ms-1">
				{{ counts[folder.key] }}
			</span>
		</button>
	</div>
</template>

<style scoped>
.smart-folder-bar {
	font-size: 0.8125rem;
}
</style>
