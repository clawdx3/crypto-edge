export const useApi = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.publicApiBase || ''

  const fetchJson = async <T>(path: string, options?: any): Promise<T> => {
    return $fetch<T>(`${baseUrl}/api${path}`, options)
  }

  return {
    get: <T>(path: string, params?: Record<string, any>) =>
      fetchJson<T>(path, { method: 'GET', params: { limit: 50, ...params } }),
    post: <T>(path: string, body?: any) => fetchJson<T>(path, { method: 'POST', body }),
    patch: <T>(path: string, body?: any) => fetchJson<T>(path, { method: 'PATCH', body }),
    delete: (path: string) => fetchJson(path, { method: 'DELETE' }),
  }
}
