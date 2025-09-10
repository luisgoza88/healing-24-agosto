'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Con refetchOnWindowFocus deshabilitado evitamos refetch innecesarios
            refetchOnWindowFocus: false,
            // Mantener datos en cache por 5 minutos
            staleTime: 5 * 60 * 1000,
            // Cache permanece por 10 minutos
            gcTime: 10 * 60 * 1000,
            // Reintentar solo 1 vez en caso de error
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}