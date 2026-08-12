<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description: string
}>()
</script>

<template>
  <header class="page-header">
    <div>
      <div class="eyebrow"><UIcon name="i-lucide-command" size="13" />{{ eyebrow || 'Permission Center' }}</div>
      <h1 class="page-title">{{ title }}</h1>
      <p class="page-description">{{ description }}</p>
    </div>
    <div class="page-actions"><slot /></div>
  </header>
</template>
