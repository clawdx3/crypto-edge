<script setup lang="ts">
const api = useApi()

const regime = ref<{ label: 'risk_on' | 'neutral' | 'risk_off'; totalScore: number | null } | null>(null)
const catalysts = ref<any[]>([])
const wallets = ref<any[]>([])
const positions = ref<any[]>([])
const alerts = ref<any[]>([])

const pending = ref(true)

const fetchData = async () => {
  pending.value = true
  try {
    const [regimeData, catalystsData, walletsData, positionsData, alertsData] = await Promise.all([
      api.get<any>('/market-regime/current').catch(() => null),
      api.get<any[]>('/catalysts', { limit: 5 }).catch(() => []),
      api.get<any[]>('/wallets', { limit: 5 }).catch(() => []),
      api.get<any[]>('/positions', { status: 'open', limit: 5 }).catch(() => []),
      api.get<any[]>('/alerts', { limit: 5 }).catch(() => []),
    ])

    regime.value = regimeData
    catalysts.value = catalystsData || []
    wallets.value = walletsData || []
    positions.value = positionsData || []
    alerts.value = alertsData || []
  } catch (e) {
    console.error('Failed to fetch dashboard data:', e)
  } finally {
    pending.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Overview</h1>

    <!-- Market Regime -->
    <UCard>
      <div class="flex items-center gap-4">
        <div class="flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/50">
          <UIcon name="i-heroicons-chart-line" class="w-8 h-8 text-primary-600" />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Market Regime</h2>
          <div v-if="pending" class="mt-1">
            <USkeleton class="h-6 w-32" />
          </div>
          <RegimeBadge
            v-else-if="regime"
            :label="regime.label"
            :total-score="regime.totalScore"
          />
          <p v-else class="text-gray-500 mt-1">No regime data available</p>
        </div>
      </div>
    </UCard>

    <!-- Loading State -->
    <div v-if="pending" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <USkeleton v-for="i in 4" :key="i" class="h-48" />
    </div>

    <!-- Dashboard Sections -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Latest Catalysts -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Latest Catalysts</h3>
            <NuxtLink to="/catalysts" class="text-sm text-primary-600 hover:text-primary-500">
              View all
            </NuxtLink>
          </div>
        </template>
        <div v-if="catalysts.length === 0" class="text-center py-8 text-gray-500">
          No catalysts found
        </div>
        <div v-else class="space-y-3">
          <CatalystCard
            v-for="catalyst in catalysts"
            :key="catalyst.id"
            :catalyst="catalyst"
          />
        </div>
      </UCard>

      <!-- Top Wallets -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Top Wallets</h3>
            <NuxtLink to="/wallets" class="text-sm text-primary-600 hover:text-primary-500">
              View all
            </NuxtLink>
          </div>
        </template>
        <div v-if="wallets.length === 0" class="text-center py-8 text-gray-500">
          No wallets found
        </div>
        <div v-else class="space-y-3">
          <WalletCard
            v-for="wallet in wallets"
            :key="wallet.id"
            :wallet="wallet"
          />
        </div>
      </UCard>

      <!-- Open Positions -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Open Positions</h3>
            <NuxtLink to="/positions" class="text-sm text-primary-600 hover:text-primary-500">
              View all
            </NuxtLink>
          </div>
        </template>
        <div v-if="positions.length === 0" class="text-center py-8 text-gray-500">
          No open positions
        </div>
        <div v-else class="space-y-3">
          <PositionCard
            v-for="position in positions"
            :key="position.id"
            :position="position"
          />
        </div>
      </UCard>

      <!-- Recent Alerts -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Recent Alerts</h3>
            <NuxtLink to="/alerts" class="text-sm text-primary-600 hover:text-primary-500">
              View all
            </NuxtLink>
          </div>
        </template>
        <div v-if="alerts.length === 0" class="text-center py-8 text-gray-500">
          No alerts
        </div>
        <div v-else class="space-y-2">
          <AlertRow
            v-for="alert in alerts"
            :key="alert.id"
            :alert="alert"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
