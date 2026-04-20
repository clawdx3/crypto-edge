<script setup lang="ts">
const api = useApi()

const wallets = ref<any[]>([])
const pending = ref(true)
const selectedWallet = ref<any>(null)
const walletEvents = ref<any[]>([])
const isDetailOpen = ref(false)

const filters = ref({
  chain: '',
  category: '',
})

const newWallet = ref({
  address: '',
  label: '',
  chain: '',
  category: '',
})

const isCreateModalOpen = ref(false)

const chainOptions = [
  { value: '', label: 'All' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'solana', label: 'Solana' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'polygon', label: 'Polygon' },
]

const categoryOptions = [
  { value: '', label: 'All' },
  { value: 'exchange', label: 'Exchange' },
  { value: 'defi', label: 'DeFi' },
  { value: 'nft', label: 'NFT' },
  { value: 'treasury', label: 'Treasury' },
  { value: 'personal', label: 'Personal' },
  { value: 'unknown', label: 'Unknown' },
]

const createCategoryOptions = [
  { value: 'exchange', label: 'Exchange' },
  { value: 'defi', label: 'DeFi' },
  { value: 'nft', label: 'NFT' },
  { value: 'treasury', label: 'Treasury' },
  { value: 'personal', label: 'Personal' },
  { value: 'unknown', label: 'Unknown' },
]

const chainColors: Record<string, string> = {
  ethereum: 'bg-blue-500',
  bitcoin: 'bg-orange-500',
  solana: 'bg-purple-500',
  arbitrum: 'bg-blue-400',
  optimism: 'bg-red-500',
  polygon: 'bg-purple-600',
}

const fetchWallets = async () => {
  pending.value = true
  try {
    const params: Record<string, any> = { ...filters.value }
    Object.keys(params).forEach(k => !params[k] && delete params[k])
    wallets.value = await api.get<any[]>('/wallets', params)
  } catch (e) {
    console.error('Failed to fetch wallets:', e)
  } finally {
    pending.value = false
  }
}

const createWallet = async () => {
  try {
    await api.post('/wallets', newWallet.value)
    isCreateModalOpen.value = false
    newWallet.value = { address: '', label: '', chain: '', category: '' }
    await fetchWallets()
  } catch (e) {
    console.error('Failed to create wallet:', e)
  }
}

const viewWalletDetail = async (wallet: any) => {
  selectedWallet.value = wallet
  walletEvents.value = []
  isDetailOpen.value = true
  try {
    walletEvents.value = await api.get<any[]>(`/wallets/${wallet.id}/events`)
  } catch (e) {
    console.error('Failed to fetch wallet events:', e)
  }
}

watch(filters, () => fetchWallets(), { deep: true })

onMounted(fetchWallets)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Wallets</h1>
      <UButton @click="isCreateModalOpen = true">Add Wallet</UButton>
    </div>

    <!-- Filters -->
    <UCard>
      <div class="flex flex-wrap gap-4">
        <UFormField label="Chain">
          <USelect v-model="filters.chain" :options="chainOptions" placeholder="All" class="w-40" />
        </UFormField>
        <UFormField label="Category">
          <USelect v-model="filters.category" :options="categoryOptions" placeholder="All" class="w-40" />
        </UFormField>
      </div>
    </UCard>

    <!-- Grid -->
    <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <USkeleton v-for="i in 6" :key="i" class="h-48" />
    </div>
    <div v-else-if="wallets.length === 0" class="text-center py-12 text-gray-500">
      No wallets found
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <WalletCard
        v-for="wallet in wallets"
        :key="wallet.id"
        :wallet="wallet"
        class="cursor-pointer"
        @click="viewWalletDetail(wallet)"
      />
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="isCreateModalOpen" title="Add Wallet">
      <UCard>
        <UForm :state="newWallet" class="space-y-4">
          <UFormField label="Address" required>
            <UInput v-model="newWallet.address" class="w-full" placeholder="0x..." />
          </UFormField>
          <UFormField label="Label">
            <UInput v-model="newWallet.label" class="w-full" />
          </UFormField>
          <UFormField label="Chain" required>
            <USelect v-model="newWallet.chain" :options="chainOptions.filter(o => o.value)" class="w-full" />
          </UFormField>
          <UFormField label="Category">
            <USelect v-model="newWallet.category" :options="createCategoryOptions" class="w-full" />
          </UFormField>
        </UForm>
      </UCard>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="isCreateModalOpen = false">Cancel</UButton>
          <UButton @click="createWallet">Create</UButton>
        </div>
      </template>
    </UModal>

    <!-- Detail Modal -->
    <UModal v-model:open="isDetailOpen" :title="selectedWallet?.label || selectedWallet?.address" size="lg">
      <UCard v-if="selectedWallet">
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div
              v-if="chainColors[selectedWallet.chain]"
              :class="[chainColors[selectedWallet.chain], 'w-4 h-4 rounded-full']"
            />
            <span class="font-mono text-sm">{{ selectedWallet.address }}</span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500">Chain</p>
              <p class="font-medium">{{ selectedWallet.chain }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Category</p>
              <p class="font-medium">{{ selectedWallet.category }}</p>
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-2">Health Score</p>
            <ScoreBar :score="selectedWallet.totalScore" :show-value="true" />
          </div>
        </div>

        <template #header>
          <h3 class="font-semibold">Transaction History</h3>
        </template>

        <div v-if="walletEvents.length === 0" class="text-center py-4 text-gray-500">
          No events found
        </div>
        <div v-else class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="event in walletEvents"
            :key="event.id"
            class="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800"
          >
            <div>
              <p class="text-sm font-medium">{{ event.type }}</p>
              <p class="text-xs text-gray-500">{{ new Date(event.timestamp).toLocaleString() }}</p>
            </div>
            <span v-if="event.value" class="text-sm">{{ event.value }}</span>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>
