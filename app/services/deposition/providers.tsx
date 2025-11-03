'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import React, { useEffect } from 'react';
import { enableQueryPersistence } from '@/lib/persist';

const Providers = React.memo(function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => { 
    enableQueryPersistence(); 
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
});

export default Providers;

