<script setup lang="ts">
const api = useApi()

const positions = ref<any[]>([])
const pending = ref(true)

const filters = ref({
  status: '',
  conviction: '',
})

const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const editingPosition = ref<any>(null)

const newPosition = ref({
  asset: '',
  status: 'open',
  entryPrice: null as number | null,
  conviction: 'medium',
  nextReview: '',
  riskScore: null as number | null,
})

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'review', label: 'Review' },
]

const convictionOptions = [
  { value: '', label: 'All' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const createConvictionOptions = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const columns = [
  { key: 'asset', label: 'Asset', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'entryPrice', label: 'Entry Price', sortable: true },
  { key: 'conviction', label: 'Conviction', sortable: true },
  { key: 'nextReview', label: 'Next Review', sortable: true },
  { key: 'riskScore', label: 'Risk Score', sortable: true },
  { key: 'actions', label: '', sortable: false },
]

const convictionColors: Record<string, string> = {
  high: 'success',
  medium: 'warning',
  low: 'error',
}

const statusColors: Record<string, string> = {
  open: 'success',
  closed: 'neutral',
  review: 'warning',
}

const formatPrice = (price: number | null) => {
  if (price === null) return 'N/A'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
}

const fetchPositions = async () => {
  pending.value = true
  try {
    const params: Record<string, any> = { ...filters.value }
    Object.keys(params).forEach(k => !params[k] && delete params[k])
    positions.value = await api.get<any[]>('/positions', params)
  } catch (e) {
    console.error('Failed to fetch positions:', e)
  } finally {
    pending.value = false
  }
}

const createPosition = async () => {
  try {
    await api.post('/positions', newPosition.value)
    isCreateModalOpen.value = false
    newPosition.value = { asset: '', status: 'open', entryPrice: null, conviction: 'medium', nextReview: '', riskScore: null }
    await fetchPositions()
  } catch (e) {
    console.error('Failed to create position:', e)
  }
}

const openEditModal = (position: any) => {
  editingPosition.value = { ...position }
  isEditModalOpen.value = true
}

const updatePosition = async () => {
  try {
    await api.patch(`/positions/${editingPosition.value.id}`, editingPosition.value)
    isEditModalOpen.value = false
    editingPosition.value = null
    await fetchPositions()
  } catch (e) {
    console.error('Failed to update position:', e)
  }
}

const archivePosition = async (id: string) => {
  try {
    await api.post(`/positions/${id}/archive`)
    await fetchPositions()
  } catch (e) {
    console.error('Failed to archive position:', e)
  }
}

const reviewPosition = async (id: string) => {
  try {
    await api.post(`/positions/${id}/review`)
    await fetchPositions()
  } catch (e) {
    console.error('Failed to review position:', e)
  }
}

watch(filters, () => fetchPositions(), { deep: true })

onMounted(fetchPositions)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Positions</h1>
      <UButton @click="isCreateModalOpen = true">Add Position</UButton>
    </div>

    <!-- Filters -->
    <UCard>
      <div class="flex flex-wrap gap-4">
        <UFormField label="Status">
          <USelect v-model="filters.status" :options="statusOptions" placeholder="All" class="w-40" />
        </UFormField>
        <UFormField label="Conviction">
          <USelect v-model="filters.conviction" :options="convictionOptions" placeholder="All" class="w-40" />
        </UFormField>
      </div>
    </UCard>

    <!-- Table -->
    <UCard>
      <div v-if="pending" class="space-y-3">
        <USkeleton v-for="i in 5" :key="i" class="h-16" />
      </div>
      <UTable v-else :columns="columns" :rows="positions" sort-mode="remote" class="w-full">
        <template #asset-data="{ row }">
          <span class="font-medium">{{ row.asset }}</span>
        </template>
        <template #status-data="{ row }">
          <UBadge :color="statusColors[row.status] || 'neutral'" variant="subtle" size="sm">
            {{ row.status }}
          </UBadge>
        </template>
        <template #entryPrice-data="{ row }">
          {{ formatPrice(row.entryPrice) }}
        </template>
        <template #conviction-data="{ row }">
          <UBadge :color="convictionColors[row.conviction] || 'neutral'" variant="subtle" size="sm">
            {{ row.conviction?.charAt(0).toUpperCase() + row.conviction?.slice(1) }}
          </UBadge>
        </template>
        <template #nextReview-data="{ row }">
          {{ row.nextReview ? new Date(row.nextReview).toLocaleDateString() : '—' }}
        </template>
        <template #riskScore-data="{ row }">
          <ScoreBar v-if="row.riskScore !== null" :score="row.riskScore" :show-value="true" />
          <span v-else class="text-gray-400">N/A</span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex gap-1">
            <UButton variant="ghost" size="sm" @click="openEditModal(row)">Edit</UButton>
            <UButton variant="ghost" size="sm" @click="reviewPosition(row.id)">Review</UButton>
            <UButton variant="ghost" size="sm" color="error" @click="archivePosition(row.id)">Close</UButton>
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Create Modal -->
    <UModal v-model:open="isCreateModalOpen" title="Add Position">
      <UCard>
        <UForm :state="newPosition" class="space-y-4">
          <UFormField label="Asset" required>
            <UInput v-model="newPosition.asset" class="w-full" />
          </UFormField>
          <UFormField label="Entry Price">
            <UInput v-model.number="newPosition.entryPrice" type="number" step="0.01" class="w-full" />
          </UFormField>
          <UFormField label="Conviction">
            <USelect v-model="newPosition.conviction" :options="createConvictionOptions" class="w-full" />
          </UFormField>
          <UFormField label="Next Review">
            <UInput v-model="newPosition.nextReview" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Risk Score">
            <UInput v-model.number="newPosition.riskScore" type="number" min="0" max="100" class="w-full" />
          </UFormField>
        </UForm>
      </UCard>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="isCreateModalOpen = false">Cancel</UButton>
          <UButton @click="createPosition">Create</UButton>
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="isEditModalOpen" title="Edit Position">
      <UCard>
        <UForm v-if="editingPosition" :state="editingPosition" class="space-y-4">
          <UFormField label="Asset">
            <UInput v-model="editingPosition.asset" class="w-full" />
          </UFormField>
          <UFormField label="Status">
            <USelect v-model="editingPosition.status" :options="statusOptions.filter(o => o.value)" class="w-full" />
          </UFormField>
          <UFormField label="Entry Price">
            <UInput v-model.number="editingPosition.entryPrice" type="number" step="0.01" class="w-full" />
          </UFormField>
          <UFormField label="Conviction">
            <USelect v-model="editingPosition.conviction" :options="createConvictionOptions" class="w-full" />
          </UFormField>
          <UFormField label="Next Review">
            <UInput v-model="editingPosition.nextReview" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Risk Score">
            <UInput v-model.number="editingPosition.riskScore" type="number" min="0" max="100" class="w-full" />
          </UFormField>
        </UForm>
      </UCard>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="isEditModalOpen = false">Cancel</UButton>
          <UButton @click="updatePosition">Save</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
