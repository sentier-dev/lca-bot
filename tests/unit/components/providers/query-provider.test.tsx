import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QueryProvider } from '@/components/providers/query-provider'
import { getQueryClient } from '@/lib/query-client'

afterEach(cleanup)

function ClientProbe() {
  const client = useQueryClient()
  return <span data-testid="probe">{client === getQueryClient() ? 'shared' : 'separate'}</span>
}

function QueryProbe() {
  const { data } = useQuery({
    queryKey: ['query-provider-test'],
    queryFn: async () => 'from cache',
  })
  return <span data-testid="query">{data ?? 'pending'}</span>
}

describe('QueryProvider', () => {
  it('renders its children', () => {
    render(
      <QueryProvider>
        <span data-testid="child">child</span>
      </QueryProvider>,
    )
    expect(screen.getByTestId('child')).toHaveTextContent('child')
  })

  it('supplies the shared browser query client', () => {
    render(
      <QueryProvider>
        <ClientProbe />
      </QueryProvider>,
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('shared')
  })

  it('lets a useQuery consumer below it resolve', async () => {
    render(
      <QueryProvider>
        <QueryProbe />
      </QueryProvider>,
    )
    expect(await screen.findByText('from cache')).toBeInTheDocument()
  })
})
