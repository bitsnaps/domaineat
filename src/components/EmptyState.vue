<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  message?: string
  actionLabel?: string
}>(), {
  icon: 'bi-inbox',
  message: 'No data found',
  actionLabel: '',
})

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="empty-state-wrapper text-center py-5">
    <i :class="'bi ' + icon" class="fs-1 text-muted d-block mb-2"></i>
    <p class="text-muted mb-3">{{ message }}</p>
    <button
      v-if="actionLabel"
      class="btn btn-primary btn-sm"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.empty-state-wrapper i {
  opacity: 0.5;
}

.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
}

.btn-primary:hover {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
}
</style>
