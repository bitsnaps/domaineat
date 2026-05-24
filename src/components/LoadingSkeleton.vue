<script setup lang="ts">
withDefaults(defineProps<{
  width?: string
  height?: string
  lines?: number
}>(), {
  width: '100%',
  height: '16px',
  lines: 3,
})
</script>

<template>
  <div class="loading-skeleton">
    <div
      v-for="i in lines"
      :key="i"
      class="skeleton-line"
      :style="{
        width: i === lines ? '60%' : width,
        height: height,
      }"
    ></div>
  </div>
</template>

<style scoped>
.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.skeleton-line {
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--gray-200) 25%,
    var(--gray-100) 50%,
    var(--gray-200) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
