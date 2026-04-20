<script setup lang="ts">
const api = useApi()

const catalysts = ref<any[]>([])
const pending = ref(true)

const filters = ref({
  status: '',
  type: '',
  asset: '',
})

const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const editingCatalyst = ref<any>(null)

const newCatalyst = ref({
  type: '',
  title: '',
  asset: '',
  effectiveDate: '',
  impact: 'medium',
})

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
]

const typeOptions = [
  { value: 'halving', label: 'Halving' },
  { value: 'protocol_update', label: 'Protocol Update' },
  { value: 'macro', label: 'Macro' },
  { value: 'on_chain', label: 'On-Chain' },
  { value: 'regulatory', label: 'Regulatory' },
]

const impactOptions = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const columns = [
  { key: 'type', label: 'Type', sortable: true },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'asset', label: 'Asset', sortable: true },
  { key: 'effectiveDate', label: 'Effective Date', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'impact', label: 'Impact', sortable: true },
  { key: 'rankScore', label: 'Rank', sortable: true },
  { key: 'actions', label: '', sortable: false },
]

const typeLabels: Record<string, string> = {
  halving: 'Halving',
  protocol_update: 'Protocol Update',
  macro: 'Macro',
  on_chain: 'On-Chain',
  regulatory: 'Regulatory',
}

const statusColors: Record<string, string> = {
  active: 'success',
  upcoming: 'info',
  expired: 'neutral',
  cancelled: 'error',
}

const impactColors: Record<string, string> = {
  high: 'error',
  medium: 'warning',
  low: 'info',
}

const fetchCatalysts = async () => {
  pending.value = true
  try {
    const params: Record<string, any> = { ...filters.value }
    Object.keys(params).forEach(k => !params[k] && delete params[k])
    catalysts.value = await api.get<any[]>('/catalysts', params)
    catalysts.value.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0))
  } catch (e) {
    console.error('Failed to fetch catalysts:', e)
  } finally {
    pending.value = false
  }
}

const createCatalyst = async () => {
  try {
    await api.post('/catalysts', newCatalyst.value)
    isCreateModalOpen.value = false
    newCatalyst.value = { type: '', title: '', asset: '', effectiveDate: '', impact: 'medium' }
    await fetchCatalysts()
  } catch (e) {
    console.error('Failed to create catalyst:', e)
  }
}

const openEditModal = (catalyst: any) => {
  editingCatalyst.value = { ...catalyst }
  isEditModalOpen.value = true
}

const updateCatalyst = async () => {
  try {
    await api.patch(`/catalysts/${editingCatalyst.value.id}`, editingCatalyst.value)
    isEditModalOpen.value = false
    editingCatalyst.value = null
    await fetchCatalysts()
  } catch (e) {
    console.error('Failed to update catalyst:', e)
  }
}

watch(filters, () => fetchCatalysts(), { deep: true })

onMounted(fetchCatalysts)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Catalysts</h1>
      <UButton @click="isCreateModalOpen = true">Add Catalyst</UButton>
    </div>

    <!-- Filters -->
    <UCard>
      <div class="flex flex-wrap gap-4">
        <UFormField label="Status">
          <USelect v-model="filters.status" :options="statusOptions" placeholder="All" class="w-40" />
        </UFormField>
        <UFormField label="Type">
          <USelect v-model="filters.type" :options="typeOptions" placeholder="All" class="w-40" />
        </UFormField>
        <UFormField label="Asset">
          <UInput v-model="filters.asset" placeholder="Search asset..." class="w-40" />
        </UFormField>
      </div>
    </UCard>

    <!-- Table -->
    <UCard>
      <div v-if="pending" class="space-y-3">
        <USkeleton v-for="i in 5" :key="i" class="h-16" />
      </div>
      <UTable v-else :columns="columns" :rows="catalysts" sort-mode="remote" class="w-full">
        <template #type-data="{ row }">
          <span class="text-gray-600 dark:text-gray-400">{{ typeLabels[row.type] || row.type }}</span>
        </template>
        <template #title-data="{ row }">
          <span class="font-medium">{{ row.title }}</span>
        </template>
        <template #asset-data="{ row }">
          <span>{{ row.asset || '—' }}</span>
        </template>
        <template #effectiveDate-data="{ row }">
          {{ new Date(row.effectiveDate).toLocaleDateString() }}
        </template>
        <template #status-data="{ row }">
          <UBadge :color="statusColors[row.status] || 'neutral'" variant="subtle" size="sm">
            {{ row.status }}
          </UBadge>
        </template>
        <template #impact-data="{ row }">
          <UBadge :color="impactColors[row.impact] || 'neutral'" variant="subtle" size="sm">
            {{ impactColors[row.impact] === 'error' ? 'High' : impactColors[row.impact] === 'warning' ? 'Medium' : 'Low' }}
          </UBadge>
        </template>
        <template #rankScore-data="{ row }">
          <ScoreBar :score="row.rankScore || 0" :show-value="true" />
        </template>
        <template #actions-data="{ row }">
          <UButton variant="ghost" size="sm" @click="openEditModal(row)">Edit</UButton>
        </template>
      </UTable>
    </UCard>

    <!-- Create Modal -->
    <UModal v-model:open="isCreateModalOpen" title="Add Catalyst">
      <UCard>
        <UForm :state="newCatalyst" class="space-y-4">
          <UFormField label="Type" required>
            <USelect v-model="newCatalyst.type" :options="typeOptions" class="w-full" />
          </UFormField>
          <UFormField label="Title" required>
            <UInput v-model="newCatalyst.title" class="w-full" />
          </UFormField>
          <UFormField label="Asset">
            <UInput v-model="newCatalyst.asset" class="w-full" />
          </UFormField>
          <UFormField label="Effective Date" required>
            <UInput v-model="newCatalyst.effectiveDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Impact">
            <USelect v-model="newCatalyst.impact" :options="impactOptions" class="w-full" />
          </UFormField>
        </UForm>
      </UCard>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="isCreateModalOpen = false">Cancel</UButton>
          <UButton @click="createCatalyst">Create</UButton>
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="isEditModalOpen" title="Edit Catalyst">
      <UCard>
        <UForm v-if="editingCatalyst" :state="editingCatalyst" class="space-y-4">
          <UFormField label="Type">
            <USelect v-model="editingCatalyst.type" :options="typeOptions" class="w-full" />
          </UFormField>
          <UFormField label="Title">
            <UInput v-model="editingCatalyst.title" class="w-full" />
          </UFormField>
          <UFormField label="Asset">
            <UInput v-model="editingCatalyst.asset" class="w-full" />
          </UFormField>
          <UFormField label="Effective Date">
            <UInput v-model="editingCatalyst.effectiveDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Impact">
            <USelect v-model="editingCatalyst.impact" :options="impactOptions" class="w-full" />
          </UFormField>
          <UFormField label="Status">
            <USelect v-model="editingCatalyst.status" :options="statusOptions" class="w-full" />
          </UFormField>
        </UForm>
      </UCard>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="isEditModalOpen = false">Cancel</UButton>
          <UButton @click="updateCatalyst">Save</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
