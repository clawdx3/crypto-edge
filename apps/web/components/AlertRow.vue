<script setup lang="ts">
interface Alert {
  id: string
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  status: 'active' | 'acknowledged' | 'resolved'
  createdAt: string
}

const props = defineProps<{
  alert: Alert
}>()

const severityConfig = computed(() => {
  switch (props.alert.severity) {
    case 'critical':
      return { color: 'error', icon: 'i-heroicons-exclamation-circle', bg: 'bg-red-50 dark:bg-red-950' }
    case 'warning':
      return { color: 'warning', icon: 'i-heroicons-exclamation-triangle', bg: 'bg-amber-50 dark:bg-amber-950' }
    case 'info':
    default:
      return { color: 'info', icon: 'i-heroicons-information-circle', bg: 'bg-blue-50 dark:bg-blue-950' }
  }
})

const statusColor = computed(() => {
  switch (props.alert.status) {
    case 'active': return 'error'
    case 'acknowledged': return 'warning'
    case 'resolved': return 'success'
    default: return 'neutral'
  }
})

const typeLabels: Record<string, string> = {
  risk_alert: 'Risk Alert',
  daily_brief: 'Daily Brief',
  catalyst_change: 'Catalyst Change',
  position_alert: 'Position Alert',
}

const formattedDate = computed(() => {
  return new Date(props.alert.createdAt).toLocaleString()
})
</script>

<template>
  <div
    :class="[
      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
      severityConfig.bg,
      'border-gray-200 dark:border-gray-800'
    ]"
  >
    <UIcon
      :name="severityConfig.icon"
      :class="['w-5 h-5 flex-shrink-0 mt-0.5', `text-${severityConfig.color}-500`]"
    />
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="font-medium text-gray-900 dark:text-gray-100">{{ alert.title }}</p>
          <p class="text-sm text-gray-500">{{ typeLabels[alert.type] || alert.type }}</p>
        </div>
        <UBadge :color="statusColor" variant="subtle" size="sm">{{ alert.status }}</UBadge>
      </div>
      <p class="text-xs text-gray-400 mt-1">{{ formattedDate }}</p>
    </div>
  </div>
</template>
