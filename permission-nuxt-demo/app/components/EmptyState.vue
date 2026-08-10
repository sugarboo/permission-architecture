<script setup lang="ts">
defineProps<{ title: string, description: string, icon?: string }>()
</script>

<template>
  <div class="empty-state">
    <div>
      <div class="empty-icon"><UIcon :name="icon || 'i-lucide-inbox'" size="21" /></div>
      <b>{{ title }}</b>
      <p>{{ description }}</p>
      <div style="margin-top: 14px"><slot /></div>
    </div>
  </div>
</template>
