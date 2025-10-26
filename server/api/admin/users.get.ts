// server/api/admin/users.get.ts
import { serverSupabaseUser } from '#supabase/server'; // Tetap gunakan ini untuk cek user
import { createClient } from '@supabase/supabase-js'; // <-- Import createClient
import { createError, defineEventHandler, H3Event } from 'h3';
import { useRuntimeConfig } from '#imports';

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
        const serviceKey = config.supabaseServiceKey;
        debugInfo.serviceKeyPresent = !!serviceKey;

        // --- Dapatkan Supabase URL dari public config ---
        const supabaseUrl = config.public.supabase.url; // <-- Tambahkan ini

        if (!serviceKey || !supabaseUrl) { // <-- Periksa supabaseUrl juga
            debugInfo.step = 'Error: Server configuration missing';
            let missing = [];
            if (!serviceKey) missing.push('Service key');
            if (!supabaseUrl) missing.push('Supabase URL');
            debugInfo.errorMessage = `Server configuration error: ${missing.join(' and ')} missing.`;
            console.error('API Route Error:', debugInfo.errorMessage);
            return {
                error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                debug: debugInfo
            };
        }
        if (!debugInfo.expectedAdminEmail) {
            debugInfo.step = 'Warning: Admin email missing';
            debugInfo.errorMessage = 'Server configuration error: Admin email missing in public runtimeConfig.';
            console.warn('API Route Warning:', debugInfo.errorMessage);
        }

        debugInfo.step = 'Validating current user';
        const currentUser = await serverSupabaseUser(event);
        debugInfo.serverUserEmail = currentUser?.email || null;

        if (!currentUser || currentUser.email !== debugInfo.expectedAdminEmail) {
            debugInfo.step = 'Error: Access denied';
            debugInfo.errorMessage = `Access Denied. User: ${debugInfo.serverUserEmail || 'unauthenticated'}, Expected Admin: ${debugInfo.expectedAdminEmail || 'Not Set'}`;
            console.warn('API Route:', debugInfo.errorMessage);
            return {
                error: createError({ statusCode: 403, statusMessage: 'Forbidden' }).toJSON(),
                debug: debugInfo
            };
        }
        debugInfo.accessGranted = true;

        // --- ✅ PERBAIKAN: Buat Admin Client secara eksplisit ---
        debugInfo.step = 'Creating Supabase admin client explicitly';
        const adminClient = createClient(supabaseUrl, serviceKey, {
            auth: {
                // Konfigurasi auth standar, sesuaikan jika perlu
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });
        // --------------------------------------------------------

        if (!adminClient) { // Seharusnya tidak terjadi, tapi jaga-jaga
            debugInfo.step = 'Error: Failed to create admin client';
            debugInfo.errorMessage = 'Failed to create Supabase admin client.';
            console.error('API Route Error:', debugInfo.errorMessage);
            return {
                error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                debug: debugInfo
            };
        }

        // --- ✅ PERBAIKAN: Gunakan adminClient yang baru dibuat ---
        debugInfo.step = 'Fetching users list using explicit admin client';
        const { data: userData, error: listError } = await adminClient.auth.admin.listUsers(); // Panggil listUsers di sini
        // ------------------------------------------------------

        if (listError) {
            debugInfo.step = 'Error: Failed fetching users list';
            // Tangkap detail error dari Supabase jika ada
            debugInfo.errorMessage = `Failed to list users: ${listError.message} (Code: ${listError.status || 'N/A'})`;
            console.error('API Route Error:', debugInfo.errorMessage, listError); // Log error lengkap
            return {
                // Gunakan status code dari error Supabase jika tersedia, default ke 500
                error: createError({ statusCode: listError.status || 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                debug: debugInfo
            };
        }
        if (!userData || !userData.users) {
            debugInfo.step = 'Completed: No users found';
            console.log('API Route: No users found or userData is null.');
            return { users: [], debug: debugInfo };
        }

        // --- Fetch Profiles & Organizations (Gunakan adminClient yang sama) ---
        const userIds = userData.users.map(u => u.id);
        if (userIds.length === 0) {
            debugInfo.step = 'Completed: User list empty, skipped profile fetch';
             console.log('API Route: User list is empty, skipping profile/org fetch.');
            return { users: [], debug: debugInfo };
        }

        debugInfo.step = 'Fetching profiles';
        let profiles: any[] | null = null;
        try {
            // Gunakan adminClient untuk query database juga
            const { data, error } = await adminClient
                .from('profiles').select('user_id, full_name, current_organization_id').in('user_id', userIds);
            if (error) throw error;
            profiles = data;
        } catch (profileError: any) {
            const profileErrorMessage = `Error fetching profiles: ${profileError.message}`;
            debugInfo.errorMessage = debugInfo.errorMessage ? `${debugInfo.errorMessage}; ${profileErrorMessage}` : profileErrorMessage;
            console.warn("API Route Warning:", profileErrorMessage);
             debugInfo.step = 'Warning: Error fetching profiles, continuing...';
        }

        debugInfo.step = 'Fetching organizations';
        let organizationsMap: Map<number, { name?: string }> = new Map();
        const organizationIds = profiles?.map(p => p.current_organization_id).filter(id => id != null) as number[] || [];
        if (organizationIds.length > 0) {
            try {
                 // Gunakan adminClient untuk query database juga
                const { data: organizations, error } = await adminClient
                    .from('organizations').select('id, name').in('id', organizationIds);
                if (error) throw error;
                if (organizations) {
                    organizationsMap = new Map(organizations.map(org => [org.id, { name: org.name }]));
                }
            } catch (orgError: any) {
                const orgErrorMessage = `Error fetching organizations: ${orgError.message}`;
                debugInfo.errorMessage = debugInfo.errorMessage ? `${debugInfo.errorMessage}; ${orgErrorMessage}` : orgErrorMessage;
                console.warn("API Route Warning:", orgErrorMessage);
                debugInfo.step = 'Warning: Error fetching organizations, continuing...';
            }
        } else {
             debugInfo.step = 'Skipped fetching organizations (no IDs found)';
        }

        debugInfo.step = 'Combining user data';
        const detailedUsers: DetailedUser[] = userData.users.map(user => {
            const profile = profiles?.find(p => p.user_id === user.id) || null;
            const organization = profile?.current_organization_id ? organizationsMap.get(profile.current_organization_id) || null : null;
            return {
                id: user.id, email: user.email, created_at: user.created_at, email_confirmed_at: user.email_confirmed_at,
                profile: profile ? { full_name: profile.full_name, current_organization_id: profile.current_organization_id, organization: organization } : null,
            };
        });

        debugInfo.step = `Completed: Successfully processed ${detailedUsers.length} users.`;
         console.log(`API Route: Successfully processed ${detailedUsers.length} users.`);

        // Hapus errorMessage jika hanya ada warning sebelumnya dan tidak ada error fatal
        if (!debugInfo.step.startsWith('Error')) {
           // Jika ada warning, errorMessage akan tetap ada, jika tidak ada, jadi undefined
        }

        return { users: detailedUsers, debug: debugInfo };

    } catch (error: any) {
        debugInfo.step = 'Error: Unhandled exception';
        debugInfo.errorMessage = error.message || 'Internal Server Error in API route.';
        console.error('API Route Unhandled Error:', error);
        const h3Error = createError({ statusCode: error.statusCode || 500, statusMessage: debugInfo.errorMessage, data: error.data });
        return {
            error: h3Error.toJSON(),
            debug: debugInfo
        };
    }
});