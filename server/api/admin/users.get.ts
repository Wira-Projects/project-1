// server/api/admin/users.get.ts
import { serverSupabaseUser } from '#supabase/server'; // Tetap gunakan ini untuk cek user
import { createClient } from '@supabase/supabase-js'; // <-- Import createClient
import { createError, defineEventHandler, H3Event } from 'h3';
import { useRuntimeConfig } from '#imports';
import { createClient } from '@supabase/supabase-js';

// --- Tipe Interface (DetailedUser, DebugInfo, ApiResponse, ApiErrorResponse) tetap sama ---
interface DetailedUser {
    id: string;
    email?: string;
    created_at?: string;
    email_confirmed_at?: string | null;
    profile: {
        full_name?: string;
        current_organization_id?: number | null;
        organization?: {
            name?: string;
        } | null;
    } | null;
}
interface DebugInfo {
    invoked: boolean;
    expectedAdminEmail?: string | null;
    serviceKeyPresent?: boolean;
    serverUserEmail?: string | null;
    accessGranted?: boolean;
    errorMessage?: string;
    step?: string;
    receivedCookieHeader?: string | null;
}
interface ApiResponse {
    users: DetailedUser[];
    debug: DebugInfo;
}
interface ApiErrorResponse {
    error: {
      statusCode: number;
      statusMessage: string;
      data?: any;
    };
    debug: DebugInfo;
}
// --- Akhir Tipe Interface ---

export default defineEventHandler(async (event: H3Event): Promise<ApiResponse | ApiErrorResponse> => {
    const debugInfo: DebugInfo = {
        invoked: true,
        expectedAdminEmail: null,
        serviceKeyPresent: false,
        serverUserEmail: null,
        accessGranted: false,
        errorMessage: undefined,
        step: 'Initializing',
        receivedCookieHeader: null,
    };

    try {
        debugInfo.step = 'Reading request headers';
        debugInfo.receivedCookieHeader = event.node.req.headers['cookie'] || null;
        console.log('API Route: Received Cookie Header:', debugInfo.receivedCookieHeader);

        debugInfo.step = 'Reading runtime config';
        const config = useRuntimeConfig(event);
        debugInfo.expectedAdminEmail = config.public.adminEmail || null;
        // AMBIL SERVICE KEY DARI RUNTIME CONFIG SISI SERVER
        const serviceKey = config.supabaseServiceKey; // <-- Kunci penting di sini
        debugInfo.serviceKeyPresent = !!serviceKey;
        const supabaseUrl = config.public.supabase.url;

        if (!serviceKey || !supabaseUrl) {
            debugInfo.step = 'Error: Server configuration missing';
            let missing = [];
            if (!serviceKey) missing.push('Supabase Service key (supabaseServiceKey)');
            if (!supabaseUrl) missing.push('Supabase URL');
            debugInfo.errorMessage = `Server configuration error: ${missing.join(' and ')} missing in runtimeConfig.`;
            console.error('API Route Error:', debugInfo.errorMessage);
            return {
                error: createError({ statusCode: 500, statusMessage: 'Server configuration error.' }).toJSON(),
                debug: debugInfo
            };
        }
        if (!debugInfo.expectedAdminEmail) {
             debugInfo.step = 'Warning: Admin email missing';
             debugInfo.errorMessage = 'Server configuration error: Admin email missing in public runtimeConfig.';
             console.warn('API Route Warning:', debugInfo.errorMessage); // Tetap lanjutkan, tapi beri warning
        }


        debugInfo.step = 'Validating current user (admin check)';
        const currentUser = await serverSupabaseUser(event);
        debugInfo.serverUserEmail = currentUser?.email || null;

        // Pastikan currentUser ada DAN emailnya = adminEmail
        if (!currentUser || !debugInfo.expectedAdminEmail || currentUser.email !== debugInfo.expectedAdminEmail) {
            debugInfo.step = 'Error: Access denied';
            debugInfo.errorMessage = `Access Denied. User: ${debugInfo.serverUserEmail || 'unauthenticated'}, Expected Admin: ${debugInfo.expectedAdminEmail || 'Not Set'}`;
            console.warn('API Route:', debugInfo.errorMessage);
            return {
                error: createError({ statusCode: 403, statusMessage: 'Forbidden' }).toJSON(),
                debug: debugInfo
            };
        }
        debugInfo.accessGranted = true;

        debugInfo.step = 'Creating Supabase admin client explicitly';
        // BUAT ADMIN CLIENT DENGAN SERVICE KEY
        const adminClient = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        debugInfo.step = 'Fetching users list using explicit admin client';
        // GUNAKAN ADMIN CLIENT UNTUK MENGAMBIL SEMUA PENGGUNA
        const { data: userData, error: listError } = await adminClient.auth.admin.listUsers();

        if (listError) {
            debugInfo.step = 'Error: Failed fetching users list';
            debugInfo.errorMessage = `Failed to list users: ${listError.message}`;
            console.error('API Route Error:', debugInfo.errorMessage, listError);
            return {
                error: createError({ statusCode: listError.status || 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                debug: debugInfo
            };
        }
        if (!userData || !userData.users) {
            debugInfo.step = 'Completed: No users found';
            return { users: [], debug: debugInfo };
        }

        // --- Fetch Profiles & Organizations (Gunakan adminClient yang sama) ---
        const userIds = userData.users.map(u => u.id);
        if (userIds.length === 0) {
            debugInfo.step = 'Completed: User list empty, skipped profile fetch';
            return { users: [], debug: debugInfo };
        }

        debugInfo.step = 'Fetching profiles for listed users';
        const { data: profilesData, error: profileError } = await adminClient
            .from('profiles')
            .select('user_id, full_name, current_organization_id')
            .in('user_id', userIds);

        if (profileError) {
             // Log warning tapi jangan gagalkan seluruh proses jika profile error
             console.warn("API Route Warning: Error fetching profiles:", profileError.message);
             debugInfo.errorMessage = (debugInfo.errorMessage ? debugInfo.errorMessage + '; ' : '') + `Error fetching profiles: ${profileError.message}`;
        }

        const profiles = profilesData || []; // Pastikan profiles adalah array

        debugInfo.step = 'Fetching organizations based on profiles';
        const organizationIds = profiles
            .map(p => p.current_organization_id)
            .filter((id): id is number => id != null); // Filter null/undefined dan pastikan tipe number

        let organizationsMap: Map<number, { name?: string }> = new Map();
        if (organizationIds.length > 0) {
            const { data: organizationsData, error: orgError } = await adminClient
                .from('organizations')
                .select('id, name')
                .in('id', organizationIds);

            if (orgError) {
                 // Log warning tapi jangan gagalkan
                 console.warn("API Route Warning: Error fetching organizations:", orgError.message);
                 debugInfo.errorMessage = (debugInfo.errorMessage ? debugInfo.errorMessage + '; ' : '') + `Error fetching organizations: ${orgError.message}`;
            } else if (organizationsData) {
                organizationsMap = new Map(organizationsData.map(org => [org.id, { name: org.name }]));
            }
        } else {
             debugInfo.step = 'Skipped fetching organizations (no relevant IDs found)';
        }

        debugInfo.step = 'Combining user data with profiles and organizations';
        const detailedUsers: DetailedUser[] = userData.users.map(user => {
            const profile = profiles.find(p => p.user_id === user.id) || null;
            const organization = profile?.current_organization_id ? organizationsMap.get(profile.current_organization_id) || null : null;
            return {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
                email_confirmed_at: user.email_confirmed_at,
                profile: profile ? {
                    full_name: profile.full_name,
                    current_organization_id: profile.current_organization_id,
                    organization: organization
                } : null,
            };
        });

        debugInfo.step = `Completed: Successfully processed ${detailedUsers.length} users.`;
        // Hapus pesan error jika hanya ada warning sebelumnya
        if (debugInfo.errorMessage && !debugInfo.step.startsWith('Error')) {
            // Keep the warning message if any, otherwise set to undefined if no fatal error occurred.
        } else if (!debugInfo.step.startsWith('Error:')) {
             debugInfo.errorMessage = undefined;
        }

        return { users: detailedUsers, debug: debugInfo };

    } catch (error: any) {
        debugInfo.step = 'Error: Unhandled exception in API route';
        debugInfo.errorMessage = error.message || 'Internal Server Error.';
        console.error('API Route Unhandled Error:', error);
        return {
            error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
            debug: debugInfo
        };
    }
});