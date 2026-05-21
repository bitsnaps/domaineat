<script setup lang="ts">

defineProps({
  variant:{
    type: String
  }
})

</script>

<template>
  <button :class="`btn btn-${variant}`">
    <slot></slot>
  </button>
</template>
