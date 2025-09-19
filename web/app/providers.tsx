'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutos (reducido)
            gcTime: 5 * 60 * 1000, // 5 minutos (reducido)
            retry: 1,
            refetchOnWindowFocus: false, // ✅ DESACTIVADO - evita refetch excesivo
            refetchOnMount: false, // ✅ DESACTIVADO - usa cache
            refetchOnReconnect: true, // Solo al reconectar
          },
          mutations: {
            retry: 0, // No reintentar mutaciones fallidas
            onError: (error) => {
              console.error('[Mutation Error]', error);
            },
            onSuccess: () => {
              console.log('[Mutation Success] Operation completed');
            }
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}