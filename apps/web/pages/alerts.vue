<script setup lang="ts">
const api = useApi()

const alerts = ref<any[]>([])
const pending = ref(true)

const filters = ref({
  status: '',
  type: '',
})

const fetchAlerts = async () => {
  pending.value = true
  try {
    const params: Record<string, any> = { ...filters.value }
    if (!params.status) delete params.status
    if (!params.type) delete params.type
    alerts.value = await api.get<any[]>('/alerts', params)
  } catch (e) {
    console.error('Failed to fetch alerts:', e)
  } finally {
    pending.value = false
  }
}

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
]

const typeOptions = [
  { value: '', label: 'All' },
  { value: 'risk_alert', label: 'Risk Alert' },
  { value: 'daily_brief', label: 'Daily Brief' },
  { value: 'catalyst_change', label: 'Catalyst Change' },
  { value: 'position_alert', label: 'Position Alert' },
]

const columns = [
  { key: 'type', label: 'Type' },
  { key: 'severity', label: 'Severity' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created' },
]

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'error'
    case 'warning': return 'warning'
    case 'info': return 'info'
    default: return 'neutral'
  }
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical': return 'i-heroicons-exclamation-circle'
    case 'warning': return 'i-heroicons-exclamation-triangle'
    case 'info': return 'i-heroicons-information-circle'
    default: return 'i-heroicons-bell'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'error'
    case 'acknowledged': return 'warning'
    case 'resolved': return 'success'
    default: return 'neutral'
  }
}

const typeLabels: Record<string, string> = {
  risk_alert: 'Risk Alert',
  daily_brief: 'Daily Brief',
  catalyst_change: 'Catalyst Change',
  position_alert: 'Position Alert',
}

const testDailyBrief = async () => {
  try {
    await api.post('/alerts/test-daily-brief')
  } catch (e) {
    console.error('Failed to send daily brief test:', e)
  }
}

const testRiskAlert = async () => {
  try {
    await api.post('/alerts/test-risk-alert')
  } catch (e) {
    console.error('Failed to send risk alert test:', e)
  }
}

watch(filters, () => fetchAlerts(), { deep: true })

onMounted(fetchAlerts)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Alerts</h1>
      <div class="flex gap-2">
        <UButton variant="outline" size="sm" @click="testDailyBrief">
          Test Daily Brief
        </UButton>
        <UButton variant="outline" size="sm" @click="testRiskAlert">
          Test Risk Alert
        </UButton>
      </div>
    </div>

    <!-- Filters -->
    <UCard>
      <div class="flex flex-wrap gap-4">
        <UFormField label="Status">
          <USelect
            v-model="filters.status"
            :options="statusOptions"
            placeholder="All"
            class="w-40"
          />
        </UFormField>
        <UFormField label="Type">
          <USelect
            v-model="filters.type"
            :options="typeOptions"
            placeholder="All"
            class="w-40"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Table -->
    <UCard>
      <div v-if="pending" class="space-y-3">
        <USkeleton v-for="i in 5" :key="i" class="h-16" />
      </div>
      <UTable
        v-else
        :columns="columns"
        :rows="alerts"
        sort-mode="manual"
        class="w-full"
      >
        <template #type-data="{ row }">
          <span class="text-gray-600 dark:text-gray-400">
            {{ typeLabels[row.type] || row.type }}
          </span>
        </template>
        <template #severity-data="{ row }">
          <div class="flex items-center gap-2">
            <UIcon
              :name="getSeverityIcon(row.severity)"
              :class="`w-4 h-4 text-${getSeverityColor(row.severity)}-500`"
            />
            <UBadge :color="getSeverityColor(row.severity)" variant="subtle" size="sm">
              {{ row.severity }}
            </UBadge>
          </div>
        </template>
        <template #title-data="{ row }">
          <span class="font-medium">{{ row.title }}</span>
        </template>
        <template #status-data="{ row }">
          <UBadge :color="getStatusColor(row.status)" variant="subtle" size="sm">
            {{ row.status }}
          </UBadge>
        </template>
        <template #createdAt-data="{ row }">
          {{ new Date(row.createdAt).toLocaleString() }}
        </template>
      </UTable>
    </UCard>
  </div>
</template>
