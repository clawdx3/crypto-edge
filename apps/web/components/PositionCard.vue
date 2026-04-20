<script setup lang="ts">
interface Position {
  id: string
  asset: string
  status: 'open' | 'closed' | 'review'
  entryPrice: number | null
  conviction: 'low' | 'medium' | 'high'
  nextReview: string | null
  riskScore: number | null
  pnl?: number | null
}

const props = defineProps<{
  position: Position
}>()

const convictionColor = computed(() => {
  switch (props.position.conviction) {
    case 'high': return 'success'
    case 'medium': return 'warning'
    case 'low': return 'error'
    default: return 'neutral'
  }
})

const convictionLabel = computed(() => {
  return props.position.conviction.charAt(0).toUpperCase() + props.position.conviction.slice(1)
})

const statusColor = computed(() => {
  switch (props.position.status) {
    case 'open': return 'success'
    case 'closed': return 'neutral'
    case 'review': return 'warning'
    default: return 'neutral'
  }
})

const formattedEntry = computed(() => {
  if (props.position.entryPrice === null) return 'N/A'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(props.position.entryPrice)
})

const formattedPnl = computed(() => {
  if (props.position.pnl === null || props.position.pnl === undefined) return null
  const sign = props.position.pnl >= 0 ? '+' : ''
  return `${sign}${props.position.pnl.toFixed(2)}%`
})
</script>

<template>
  <UCard class="hover:shadow-md transition-shadow">
    <div class="space-y-3">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-gray-900 dark:text-gray-100">{{ position.asset }}</span>
          <UBadge :color="statusColor" variant="subtle" size="sm">{{ position.status }}</UBadge>
        </div>
        <div v-if="formattedPnl" :class="position.pnl >= 0 ? 'text-green-500' : 'text-red-500'" class="font-medium">
          {{ formattedPnl }}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p class="text-gray-500">Entry</p>
          <p class="font-medium">{{ formattedEntry }}</p>
        </div>
        <div>
          <p class="text-gray-500">Conviction</p>
          <UBadge :color="convictionColor" variant="subtle" size="sm">{{ convictionLabel }}</UBadge>
        </div>
      </div>

      <div v-if="position.riskScore !== null" class="pt-1">
        <ScoreBar :score="position.riskScore" label="Risk Score" />
      </div>

      <p v-if="position.nextReview" class="text-xs text-gray-500">
        Next review: {{ new Date(position.nextReview).toLocaleDateString() }}
      </p>
    </div>
  </UCard>
</template>
