import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Per-test QueryClient: no retries (fail fast) and no background behavior,
 * mirroring the app's invalidation-driven defaults.
 */
export function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  })
}

/**
 * Wrapper for render/renderHook so components using useQuery/useQueryClient
 * mount outside the app shells. Pass a client to assert on its cache.
 */
export function createQueryWrapper(client: QueryClient = makeTestQueryClient()) {
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}
