<script setup lang="ts">
interface Props {
  score: number
  label?: string
  showValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  showValue: true,
})

const colorClass = computed(() => {
  if (props.score <= 33) return 'text-red-500'
  if (props.score <= 66) return 'text-yellow-500'
  return 'text-green-500'
})

const progressValue = computed(() => props.score)
</script>

<template>
  <div class="space-y-1">
    <div v-if="label || showValue" class="flex justify-between text-sm">
      <span v-if="label" class="text-gray-600 dark:text-gray-400">{{ label }}</span>
      <span v-if="showValue" :class="colorClass" class="font-medium">{{ score }}</span>
    </div>
    <UProgress
      :value="progressValue"
      :max="100"
      :color="score <= 33 ? 'red' : score <= 66 ? 'yellow' : 'green'"
      size="sm"
    />
  </div>
</template>
