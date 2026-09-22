import { QueryClient, isServer } from '@tanstack/react-query'

/**
 * Client-side query cache (issue #4). Freshness is driven exclusively by
 * invalidation (mutations, cross-tab broadcasts, /api/sync version checks),
 * so cached data never goes stale on its own and navigation always renders
 * from cache without refetching.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  // On the server every render gets a fresh client so state can never leak
  // across requests. In the browser a singleton keeps the cache alive across
  // shell remounts (landing <-> app navigation).
  if (isServer) return makeQueryClient()
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}
