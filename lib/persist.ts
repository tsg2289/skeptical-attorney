import localforage from 'localforage';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { queryClient } from './queryClient';

export function enableQueryPersistence() {
  persistQueryClient({
    queryClient,
    persister: {
      persistClient: async (client) => {
        await localforage.setItem('rq-cache', client);
      },
      restoreClient: async () => {
        const result = await localforage.getItem<PersistedClient>('rq-cache');
        return result || undefined;
      },
      removeClient: async () => {
        await localforage.removeItem('rq-cache');
      },
    },
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
}

