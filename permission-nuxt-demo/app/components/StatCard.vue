<script setup lang="ts">
defineProps<{ label: string, value: string | number, icon: string, color?: string, tint?: string }>()
</script>

<template>
  <div class="stat-card" :style="{ '--stat-color': color || '#246bfd', '--stat-tint': tint || '#edf4ff' }">
    <div class="stat-icon"><UIcon :name="icon" size="17" /></div>
    <div class="stat-value">{{ value }}</div>
    <div class="stat-label">{{ label }}</div>
  </div>
</template>
