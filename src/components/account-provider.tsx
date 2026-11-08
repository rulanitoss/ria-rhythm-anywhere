import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

const AccountContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });
export const useAccount = () => useContext(AccountContext);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    let revision = 0;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      revision++;
      setUser(session?.user ?? null);
      setLoading(false);
      if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) {
        void router.invalidate();
        if (event !== 'SIGNED_OUT') void queryClient.invalidateQueries();
      }
    });
    const initialRevision = revision;
    void supabase.auth.getUser().then(({ data: result }) => { if (active && revision === initialRevision) { setUser(result.user); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [queryClient, router]);
  return <AccountContext.Provider value={{ user, loading }}>{children}</AccountContext.Provider>;
}