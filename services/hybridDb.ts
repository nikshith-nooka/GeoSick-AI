/**
 * Hybrid Database Orchestrator for GeoSick AI
 * 
 * Provides an intelligent dual-tier architecture:
 * 1. Online Tier: High-availability cloud persistence via Supabase PostgreSQL
 * 2. Offline / Edge Tier: Zero-network Local SQL Relational Engine (`localDb`)
 * 
 * Guarantees that users are NEVER locked out during network partitions or offline field scenarios.
 */

import { localDb } from './localSqlDb';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseRealClient';
import type { User, MunicipalTicket, ActivityLogItem } from '../types';

export class HybridDatabase {
    private isOnline(): boolean {
        return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }

    public getStatus(): { mode: 'cloud-supabase' | 'local-edge'; isOnline: boolean; cloudConfigured: boolean } {
        const cloudConfigured = isSupabaseConfigured();
        const online = this.isOnline();
        return {
            mode: cloudConfigured && online ? 'cloud-supabase' : 'local-edge',
            isOnline: online,
            cloudConfigured
        };
    }

    // --- Authentication ---

    public async signUp(params: {
        email?: string;
        password?: string;
        name?: string;
        phone?: string;
        date_of_birth?: string;
        place?: string;
        gender?: string;
    }): Promise<{ user: User | null; error: string | null }> {
        // Always write to local relational DB first to ensure offline-ready state
        const localResult = await localDb.signUp(params);
        if (localResult.error || !localResult.user) {
            return localResult;
        }

        // Try syncing to Supabase if configured & online
        const supabase = getSupabaseClient();
        if (supabase && this.isOnline() && params.email && params.password) {
            try {
                const { data, error } = await supabase.auth.signUp({
                    email: params.email,
                    password: params.password,
                    options: {
                        data: {
                            full_name: params.name,
                            phone: params.phone,
                            dob: params.date_of_birth,
                            place: params.place,
                            gender: params.gender
                        }
                    }
                });

                if (error) {
                    console.warn('[HybridDb] Cloud Supabase signup notice (offline account remains active):', error.message);
                } else if (data?.user) {
                    // Update cloud profiles table
                    await supabase.from('profiles').upsert({
                        id: localResult.user.id,
                        full_name: params.name,
                        email: params.email,
                        phone: params.phone,
                        dob: params.date_of_birth,
                        place: params.place,
                        gender: params.gender,
                        updated_at: new Date().toISOString()
                    }).catch(e => console.warn('[HybridDb] Could not upsert cloud profile:', e));
                }
            } catch (err) {
                console.warn('[HybridDb] Supabase network error, fallback to local user account:', err);
            }
        }

        return localResult;
    }

    public async signIn(identifier: string, password: string): Promise<{ user: User | null; error: string | null }> {
        const supabase = getSupabaseClient();
        
        // If online & Supabase configured, attempt cloud authentication
        if (supabase && this.isOnline() && identifier.includes('@')) {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: identifier,
                    password: password
                });

                if (!error && data?.user) {
                    // Fetch user profile from Supabase
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .single();

                    const cloudUser: User = {
                        id: data.user.id,
                        email: data.user.email || identifier,
                        name: profile?.full_name || data.user.user_metadata?.full_name || identifier.split('@')[0],
                        phone: profile?.phone || data.user.user_metadata?.phone || '',
                        date_of_birth: profile?.dob || data.user.user_metadata?.dob || '',
                        place: profile?.place || data.user.user_metadata?.place || '',
                        gender: profile?.gender || data.user.user_metadata?.gender || '',
                        isAdmin: profile?.is_admin || Boolean(data.user.email?.includes('admin')),
                        created_at: data.user.created_at
                    };

                    // Sync cloud profile to local DB for seamless offline persistence
                    localDb.updateProfile(cloudUser.id, cloudUser);
                    return { user: cloudUser, error: null };
                }
            } catch (cloudErr) {
                console.warn('[HybridDb] Cloud sign-in unavailable, routing to local database:', cloudErr);
            }
        }

        // Seamless local fallback
        return localDb.signIn(identifier, password);
    }

    public signOut(): boolean {
        const supabase = getSupabaseClient();
        if (supabase && this.isOnline()) {
            supabase.auth.signOut().catch(e => console.warn('[HybridDb] Supabase sign out warning:', e));
        }
        return localDb.signOut();
    }

    public getSession(): User | null {
        return localDb.getSession();
    }

    public getUserById(id: string): User | null {
        return localDb.getUserById(id);
    }

    public async updateProfile(userId: string, updatedDetails: Partial<User>): Promise<boolean> {
        const localSuccess = localDb.updateProfile(userId, updatedDetails);
        
        const supabase = getSupabaseClient();
        if (supabase && this.isOnline()) {
            try {
                await supabase.from('profiles').update({
                    full_name: updatedDetails.name,
                    place: updatedDetails.place,
                    gender: updatedDetails.gender,
                    updated_at: new Date().toISOString()
                }).eq('id', userId);
            } catch (err) {
                console.warn('[HybridDb] Failed to sync profile update to cloud:', err);
            }
        }

        return localSuccess;
    }

    // --- Municipal Tickets ---

    public async submitTicket(ticket: Omit<MunicipalTicket, 'id' | 'ticket_id' | 'created_at' | 'updated_at' | 'status'>): Promise<MunicipalTicket> {
        // Save locally first
        const localTicket = localDb.submitTicket(ticket);

        const supabase = getSupabaseClient();
        if (supabase && this.isOnline()) {
            try {
                await supabase.from('tickets').insert([{
                    id: localTicket.id,
                    ticket_id: localTicket.ticket_id,
                    user_phone: localTicket.user_phone,
                    category: localTicket.category,
                    title: localTicket.title,
                    description: localTicket.description,
                    latitude: localTicket.latitude,
                    longitude: localTicket.longitude,
                    locality: localTicket.locality,
                    status: localTicket.status,
                    severity: localTicket.severity,
                    source_image_url: localTicket.source_image_url,
                    created_at: localTicket.created_at
                }]);
            } catch (err) {
                console.warn('[HybridDb] Cloud ticket submission failed (stored in local database):', err);
            }
        }

        return localTicket;
    }

    public async getTickets(): Promise<MunicipalTicket[]> {
        const supabase = getSupabaseClient();
        if (supabase && this.isOnline()) {
            try {
                const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
                if (!error && data && data.length > 0) {
                    return data as MunicipalTicket[];
                }
            } catch (err) {
                console.warn('[HybridDb] Could not fetch cloud tickets, loading local tickets:', err);
            }
        }
        return localDb.getTickets();
    }

    public async updateTicketStatus(
        ticketId: string, 
        status: MunicipalTicket['status'], 
        resolutionNotes?: string,
        assignedTeam?: string
    ): Promise<boolean> {
        const localSuccess = localDb.updateTicketStatus(ticketId, status, resolutionNotes, assignedTeam);

        const supabase = getSupabaseClient();
        if (supabase && this.isOnline()) {
            try {
                await supabase.from('tickets').update({
                    status,
                    resolution_notes: resolutionNotes,
                    assigned_team: assignedTeam,
                    updated_at: new Date().toISOString()
                }).or(`ticket_id.eq.${ticketId},id.eq.${ticketId}`);
            } catch (err) {
                console.warn('[HybridDb] Could not sync ticket status update to cloud:', err);
            }
        }

        return localSuccess;
    }

    // --- Right to Erasure & Data Portability (DISHA / GDPR) ---

    public exportUserData(userId: string, userPhone?: string): any {
        const history = JSON.parse(localStorage.getItem('geosick_activity_history') || '[]');
        const userHistory = history.filter((item: any) => !userPhone || item.userPhone === userPhone);
        const waterLogs = JSON.parse(localStorage.getItem('geosick_water_logs') || '{}');
        const tickets = this.getTickets();
        const userTickets = Array.isArray(tickets) ? tickets.filter((t: any) => !userPhone || t.user_phone === userPhone) : [];
        const consentTimestamp = localStorage.getItem('geosick_informed_consent_timestamp') || 'Legacy Verified';
        const user = this.getUserById(userId);

        return {
            export_metadata: {
                app: "GeoSick AI Clinical & Surveillance System",
                version: "2.4-production",
                generated_at: new Date().toISOString(),
                standard: "DISHA & GDPR Data Portability",
                informed_consent_recorded: consentTimestamp
            },
            patient_profile: user,
            clinical_activity_history: userHistory,
            daily_water_records: waterLogs,
            civic_tickets: userTickets
        };
    }

    public recordConsent(userId: string, consentType: string = 'CLINICAL_DECISION_SUPPORT'): void {
        const timestamp = new Date().toISOString();
        localStorage.setItem('geosick_informed_consent_timestamp', timestamp);
        localStorage.setItem('geosick_onboarding_completed', 'true');
        
        const supabase = getSupabaseClient();
        if (supabase && this.isOnline()) {
            supabase.from('consent_records').insert([{
                user_id: userId,
                consent_type: consentType,
                consented_at: timestamp
            }]).catch(e => console.warn('[HybridDb] Consent record cloud sync note:', e));
        }
    }

    public purgeUserData(userId: string, userPhone?: string): boolean {
        const supabase = getSupabaseClient();
        if (supabase && this.isOnline()) {
            supabase.from('profiles').delete().eq('id', userId).catch(e => console.warn(e));
            supabase.from('activity_logs').delete().eq('user_id', userId).catch(e => console.warn(e));
            supabase.auth.signOut().catch(e => console.warn(e));
        }
        return localDb.purgeUserData(userId, userPhone);
    }
}

export const hybridDb = new HybridDatabase();
