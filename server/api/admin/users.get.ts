// server/api/admin/users.get.ts
import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { createError, defineEventHandler, H3Event } from 'h3';
import { useRuntimeConfig } from '#imports';

// --- Tipe Interface (Disederhanakan) ---
interface DetailedUser {
    id: string; // Dari auth.users
    email?: string; // Dari auth.users
    created_at?: string; // Dari auth.users
    email_confirmed_at?: string | null; // Dari auth.users
    profile: { // Dari public.profiles
        full_name?: string | null; // Nama dari profiles
        // Hapus current_organization_id dan organization
    } | null; // Profile bisa jadi null
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
        debugInfo.step = 'Reading runtime config';
        const config = useRuntimeConfig(event);
        debugInfo.expectedAdminEmail = config.public.adminEmail || null;
        const serviceKey = config.supabaseServiceKey;
        debugInfo.serviceKeyPresent = !!serviceKey;
        const supabaseUrl = config.public.supabase.url;

        // Validasi konfigurasi server
        if (!serviceKey || !supabaseUrl || !debugInfo.expectedAdminEmail) {
            debugInfo.step = 'Error: Server configuration missing';
            let missing = [];
            if (!serviceKey) missing.push('Supabase Service key (supabaseServiceKey)');
            if (!supabaseUrl) missing.push('Supabase URL');
            if (!debugInfo.expectedAdminEmail) missing.push('Admin Email (public.adminEmail)');
            debugInfo.errorMessage = `Server configuration error: ${missing.join(', ')} missing.`;
            console.error('API Route Error:', debugInfo.errorMessage);
            return { error: createError({ statusCode: 500, statusMessage: 'Server configuration error.' }).toJSON(), debug: debugInfo };
        }

        // Validasi pengguna saat ini adalah admin
        debugInfo.step = 'Validating current user (admin check)';
        const currentUser = await serverSupabaseUser(event);
        debugInfo.serverUserEmail = currentUser?.email || null;
        if (!currentUser || currentUser.email !== debugInfo.expectedAdminEmail) {
            debugInfo.step = 'Error: Access denied';
            debugInfo.errorMessage = `Access Denied. User: ${debugInfo.serverUserEmail || 'unauthenticated'}`;
            console.warn('API Route:', debugInfo.errorMessage);
            return { error: createError({ statusCode: 403, statusMessage: 'Forbidden' }).toJSON(), debug: debugInfo };
        }
        debugInfo.accessGranted = true;

        // Buat Supabase client dengan service key
        debugInfo.step = 'Creating Supabase admin client';
        const adminClient = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Ambil semua pengguna dari auth.users
        debugInfo.step = 'Fetching users list from auth.users';
        const { data: authUsersData, error: listError } = await adminClient.auth.admin.listUsers();

        if (listError) {
             debugInfo.step = 'Error: Failed fetching users list';
             debugInfo.errorMessage = `Failed to list users: ${listError.message}`;
             console.error('API Route Error:', debugInfo.errorMessage, listError);
             return { error: createError({ statusCode: listError.status || 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        if (!authUsersData || !authUsersData.users || authUsersData.users.length === 0) {
             debugInfo.step = 'Completed: No users found in auth.users';
             return { users: [], debug: debugInfo };
        }

        const authUsers = authUsersData.users;
        const userIds = authUsers.map(u => u.id);

        // 2. Ambil profil terkait dari public.profiles (hanya full_name)
        debugInfo.step = `Fetching profiles for ${userIds.length} users from public.profiles`;
        const { data: profilesData, error: profileError } = await adminClient
            .from('profiles')
            .select('user_id, full_name') // <-- Hanya ambil user_id dan full_name
            .in('user_id', userIds);

        if (profileError) {
             // Log warning, tapi tidak fatal
             debugInfo.errorMessage = `Warning: Error fetching profiles: ${profileError.message}`;
             console.warn('API Route Warning:', debugInfo.errorMessage, profileError);
        }
        const profilesMap = new Map((profilesData || []).map(p => [p.user_id, p]));

        // HAPUS BAGIAN FETCH ORGANISASI KARENA TIDAK DIPERLUKAN/TIDAK ADA KOLOMNYA

        // 3. Gabungkan data auth.users dengan public.profiles
        debugInfo.step = 'Combining user data with profiles';
        const detailedUsers: DetailedUser[] = authUsers.map(authUser => {
            const profile = profilesMap.get(authUser.id) || null;

            return {
                id: authUser.id,
                email: authUser.email,
                created_at: authUser.created_at,
                email_confirmed_at: authUser.email_confirmed_at,
                profile: profile ? {
                    full_name: profile.full_name,
                    // Hapus referensi ke organization
                } : null,
            };
        });

        debugInfo.step = `Completed: Successfully processed ${detailedUsers.length} users.`;
        // Hapus pesan error jika hanya ada warning
        if (debugInfo.errorMessage?.startsWith('Warning')) {
             // Keep the warning
        } else if (!debugInfo.step.startsWith('Error:')) {
             debugInfo.errorMessage = undefined;
        }

        return { users: detailedUsers, debug: debugInfo };

    } catch (error: any) {
        debugInfo.step = 'Error: Unhandled exception in API route';
        debugInfo.errorMessage = error.message || 'Internal Server Error.';
        console.error('API Route Unhandled Error:', error);
        const h3Error = createError({ statusCode: error.statusCode || 500, statusMessage: debugInfo.errorMessage, data: error.data });
        return { error: h3Error.toJSON(), debug: debugInfo };
    }
});