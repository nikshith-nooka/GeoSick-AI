/**
 * Dual-Tier Database Client for GeoSick AI
 * Combines Supabase Cloud PostgreSQL with Zero-Network Local SQL Engine.
 */
import { localDb } from './localSqlDb';
import { hybridDb } from './hybridDb';

export { localDb, hybridDb };

export const supabase = {
    auth: {
        signUp: async (params: any) => hybridDb.signUp(params),
        signInWithPassword: async ({ email, password }: any) => hybridDb.signIn(email, password),
        signOut: async () => hybridDb.signOut(),
        getSession: async () => ({ data: { session: hybridDb.getSession() ? { user: hybridDb.getSession() } : null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: (table: string) => ({
        select: (cols: string = '*') => ({
            order: (col: string, { ascending }: any = {}) => Promise.resolve({ data: hybridDb.getTickets(), error: null })
        }),
        insert: (rows: any[]) => Promise.resolve({ data: rows, error: null })
    })
};
