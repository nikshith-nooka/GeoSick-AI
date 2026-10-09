/**
 * Real Supabase Client Initializer with Dynamic Environment Fallback
 * Safely initializes Supabase if environment variables are configured.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
    return Boolean(
        SUPABASE_URL && 
        SUPABASE_ANON_KEY && 
        SUPABASE_URL.startsWith('http') &&
        !SUPABASE_URL.includes('your-project-id')
    );
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
    if (!isSupabaseConfigured()) {
        return null;
    }
    if (!clientInstance) {
        try {
            clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });
        } catch (err) {
            console.warn('[GeoSick Supabase] Failed to initialize Supabase client:', err);
            clientInstance = null;
        }
    }
    return clientInstance;
};
