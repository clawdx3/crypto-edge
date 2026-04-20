<script setup lang="ts">
interface Props {
  label: 'risk_on' | 'neutral' | 'risk_off'
  totalScore: number | null
}

const props = defineProps<Props>()

const config = computed(() => {
  switch (props.label) {
    case 'risk_on':
      return { color: 'success', bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-400' }
    case 'risk_off':
      return { color: 'error', bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-700 dark:text-red-400' }
    case 'neutral':
    default:
      return { color: 'warning', bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-700 dark:text-amber-400' }
  }
})

const labelText = computed(() => {
  switch (props.label) {
    case 'risk_on': return 'Risk On'
    case 'risk_off': return 'Risk Off'
    case 'neutral': return 'Neutral'
    default: return props.label
  }
})
</script>

<template>
  <UBadge
    :color="config.color"
    variant="subtle"
    class="font-medium"
  >
    {{ labelText }}
    <span v-if="totalScore !== null" class="ml-1 opacity-75">({{ totalScore }})</span>
  </UBadge>
</template>
