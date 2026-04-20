<script setup lang="ts">
const route = useRoute()
const isCollapsed = ref(false)

const navItems = [
  { label: 'Overview', to: '/', icon: 'i-heroicons-chart-bar' },
  { label: 'Catalysts', to: '/catalysts', icon: 'i-heroicons-sparkles' },
  { label: 'Wallets', to: '/wallets', icon: 'i-heroicons-wallet' },
  { label: 'Positions', to: '/positions', icon: 'i-heroicons-queue-list' },
  { label: 'Alerts', to: '/alerts', icon: 'i-heroicons-bell' },
]

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    ]"
  >
    <!-- Logo -->
    <div class="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
      <span v-if="!isCollapsed" class="text-xl font-bold text-primary-600">Edge</span>
      <button
        @click="toggleCollapse"
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <UIcon
          :name="isCollapsed ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-left'"
          class="w-5 h-5"
        />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4 space-y-1">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
          route.path === item.to
            ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        ]"
      >
        <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
        <span v-if="!isCollapsed">{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </aside>
</template>
