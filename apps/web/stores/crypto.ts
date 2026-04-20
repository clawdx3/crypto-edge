import { defineStore } from 'pinia'

interface RegimeState {
  label: 'risk_on' | 'neutral' | 'risk_off' | null
  totalScore: number | null
}

export const useCryptoStore = defineStore('crypto', {
  state: () => ({
    regime: null as RegimeState['label'],
    regimeScore: null as RegimeState['totalScore'],
    catalysts: [] as any[],
    wallets: [] as any[],
    positions: [] as any[],
    alerts: [] as any[],
  }),

  actions: {
    async fetchRegime() {
      const api = useApi()
      try {
        const data = await api.get<any>('/market-regime/current')
        this.regime = data.label
        this.regimeScore = data.totalScore
      } catch (e) {
        console.error('Failed to fetch regime:', e)
      }
    },

    async fetchCatalysts(params?: Record<string, any>) {
      const api = useApi()
      try {
        const data = await api.get<any[]>('/catalysts', params)
        this.catalysts = data
      } catch (e) {
        console.error('Failed to fetch catalysts:', e)
      }
    },

    async fetchWallets(params?: Record<string, any>) {
      const api = useApi()
      try {
        const data = await api.get<any[]>('/wallets', params)
        this.wallets = data
      } catch (e) {
        console.error('Failed to fetch wallets:', e)
      }
    },

    async fetchPositions(params?: Record<string, any>) {
      const api = useApi()
      try {
        const data = await api.get<any[]>('/positions', params)
        this.positions = data
      } catch (e) {
        console.error('Failed to fetch positions:', e)
      }
    },

    async fetchAlerts(params?: Record<string, any>) {
      const api = useApi()
      try {
        const data = await api.get<any[]>('/alerts', params)
        this.alerts = data
      } catch (e) {
        console.error('Failed to fetch alerts:', e)
      }
    },
  },
})
