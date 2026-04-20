<script setup lang="ts">
interface Catalyst {
  id: string
  type: string
  title: string
  asset: string | null
  effectiveDate: string
  status: 'upcoming' | 'active' | 'expired' | 'cancelled'
  impact: 'high' | 'medium' | 'low'
  rankScore: number
}

const props = defineProps<{
  catalyst: Catalyst
}>()

const statusColor = computed(() => {
  switch (props.catalyst.status) {
    case 'active': return 'success'
    case 'upcoming': return 'info'
    case 'expired': return 'neutral'
    case 'cancelled': return 'error'
    default: return 'neutral'
  }
})

const impactColor = computed(() => {
  switch (props.catalyst.impact) {
    case 'high': return 'error'
    case 'medium': return 'warning'
    case 'low': return 'info'
    default: return 'neutral'
  }
})

const typeLabels: Record<string, string> = {
  halving: 'Halving',
  protocol_update: 'Protocol Update',
  macro: 'Macro',
  on_chain: 'On-Chain',
  regulatory: 'Regulatory',
}
</script>

<template>
  <UCard class="hover:shadow-md transition-shadow">
    <div class="space-y-3">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2">
          <UBadge :color="statusColor" variant="subtle" size="sm">
            {{ catalyst.status }}
          </UBadge>
          <UBadge :color="impactColor" variant="outline" size="sm">
            {{ impactColor === 'error' ? 'High' : impactColor === 'warning' ? 'Medium' : 'Low' }} Impact
          </UBadge>
        </div>
        <span class="text-xs text-gray-500">{{ typeLabels[catalyst.type] || catalyst.type }}</span>
      </div>

      <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ catalyst.title }}</h3>

      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center gap-4">
          <span v-if="catalyst.asset" class="text-gray-600 dark:text-gray-400">
            {{ catalyst.asset }}
          </span>
          <span class="text-gray-500">
            {{ new Date(catalyst.effectiveDate).toLocaleDateString() }}
          </span>
        </div>
        <ScoreBar :score="catalyst.rankScore" :show-value="true" />
      </div>
    </div>
  </UCard>
</template>
