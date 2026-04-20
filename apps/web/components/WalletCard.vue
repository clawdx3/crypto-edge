<script setup lang="ts">
interface Wallet {
  id: string
  address: string
  label: string | null
  chain: string
  category: string
  totalScore: number
}

const props = defineProps<{
  wallet: Wallet
}>()

const truncatedAddress = computed(() => {
  if (!props.wallet.address) return ''
  if (props.wallet.address.length <= 16) return props.wallet.address
  return `${props.wallet.address.slice(0, 8)}...${props.wallet.address.slice(-6)}`
})

const chainColors: Record<string, string> = {
  ethereum: 'bg-blue-500',
  bitcoin: 'bg-orange-500',
  solana: 'bg-purple-500',
  arbitrum: 'bg-blue-400',
  optimism: 'bg-red-500',
  polygon: 'bg-purple-600',
}
</script>

<template>
  <UCard class="hover:shadow-md transition-shadow">
    <div class="space-y-3">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-2">
          <div
            v-if="chainColors[wallet.chain]"
            :class="[chainColors[wallet.chain], 'w-3 h-3 rounded-full']"
          />
          <UBadge variant="subtle" size="sm">{{ wallet.chain }}</UBadge>
        </div>
        <UBadge variant="outline" size="sm">{{ wallet.category }}</UBadge>
      </div>

      <div>
        <p class="font-mono text-sm text-gray-600 dark:text-gray-400">{{ truncatedAddress }}</p>
        <p v-if="wallet.label" class="font-medium text-gray-900 dark:text-gray-100">{{ wallet.label }}</p>
      </div>

      <div>
        <p class="text-xs text-gray-500 mb-1">Health Score</p>
        <ScoreBar :score="wallet.totalScore" :show-value="true" />
      </div>
    </div>
  </UCard>
</template>
