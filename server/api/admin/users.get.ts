// server/api/admin/users.get.ts
import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js'; // <-- Pastikan ini diimpor
import { createError, defineEventHandler, H3Event } from 'h3';
import { useRuntimeConfig } from '#imports';

// --- Tipe Interface (DetailedUser, DebugInfo, ApiResponse, ApiErrorResponse) ---
interface DetailedUser {
    id: string; // Dari auth.users
    email?: string; // Dari auth.users
    created_at?: string; // Dari auth.users
    email_confirmed_at?: string | null; // Dari auth.users
    profile: { // Dari public.profiles
        full_name?: string | null; // Nama dari profiles
        // Tambahkan field lain dari profiles jika perlu
        current_organization_id?: number | null;
        organization?: { // Hasil join tambahan jika perlu
            name?: string;
        } | null;
    } | null; // Profile bisa jadi null jika belum dibuat
}
interface DebugInfo {
    invoked: boolean;
    expectedAdminEmail?: string | null;
    serviceKeyPresent?: boolean;
    serverUserEmail?: string | null;
    accessGranted?: boolean;
    errorMessage?: string;
    step?: string;
    receivedCookieHeader?: string | null; // Opsional: untuk debugging cookie
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
        const serviceKey = config.supabaseServiceKey; // Kunci service role
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

        // Buat Supabase client dengan service key (untuk bypass RLS)
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

        // 2. Ambil semua profil terkait dari public.profiles
        debugInfo.step = `Fetching profiles for ${userIds.length} users from public.profiles`;
        const { data: profilesData, error: profileError } = await adminClient
            .from('profiles')
            .select('user_id, full_name, current_organization_id') // Ambil kolom yang dibutuhkan
            .in('user_id', userIds);

        if (profileError) {
            // Log warning tapi jangan gagalkan request jika hanya profil yang gagal
            debugInfo.errorMessage = `Warning: Error fetching profiles: ${profileError.message}`;
            console.warn('API Route Warning:', debugInfo.errorMessage, profileError);
            // Tetap lanjutkan dengan profilesData = []
        }
        // Buat Map untuk lookup profil yang efisien: Map<user_id, profile_data>
        const profilesMap = new Map((profilesData || []).map(p => [p.user_id, p]));

        // (Opsional) Ambil data organisasi jika diperlukan (seperti kode sebelumnya)
        debugInfo.step = 'Fetching organizations (if needed)';
        const organizationIds = (profilesData || [])
            .map(p => p.current_organization_id)
            .filter((id): id is number => id != null);
        let organizationsMap: Map<number, { name?: string }> = new Map();
        if (organizationIds.length > 0) {
            const { data: orgsData, error: orgError } = await adminClient
                .from('organizations')
                .select('id, name')
                .in('id', organizationIds);
            if (orgError) {
                console.warn("API Route Warning: Error fetching organizations:", orgError.message);
                debugInfo.errorMessage = (debugInfo.errorMessage ? debugInfo.errorMessage + '; ' : '') + `Error fetching organizations: ${orgError.message}`;
            } else if (orgsData) {
                organizationsMap = new Map(orgsData.map(org => [org.id, { name: org.name }]));
            }
        }

        // 3. Gabungkan data auth.users dengan public.profiles (dan organization jika ada)
        debugInfo.step = 'Combining user data with profiles and organizations';
        const detailedUsers: DetailedUser[] = authUsers.map(authUser => {
            const profile = profilesMap.get(authUser.id) || null; // Cari profil berdasarkan user_id
            const organization = profile?.current_organization_id ? organizationsMap.get(profile.current_organization_id) || null : null;

            return {
                id: authUser.id,
                email: authUser.email,
                created_at: authUser.created_at,
                email_confirmed_at: authUser.email_confirmed_at,
                profile: profile ? { // Masukkan data profil jika ada
                    full_name: profile.full_name, // Ini nama dari tabel profiles
                    current_organization_id: profile.current_organization_id,
                    organization: organization
                } : null, // Jika tidak ada profil, set ke null
            };
        });

        debugInfo.step = `Completed: Successfully processed ${detailedUsers.length} users.`;
        // Hapus pesan error jika hanya ada warning
        if (debugInfo.errorMessage?.startsWith('Warning')) {
            // Keep the warning, but don't treat it as a fatal error unless step indicates otherwise
        } else if (!debugInfo.step.startsWith('Error:')) {
             debugInfo.errorMessage = undefined; // Clear error if successful
        }

        return { users: detailedUsers, debug: debugInfo };

    } catch (error: any) {
        debugInfo.step = 'Error: Unhandled exception in API route';
        debugInfo.errorMessage = error.message || 'Internal Server Error.';
        console.error('API Route Unhandled Error:', error);
        // Pastikan error yang dilempar adalah H3Error JSON
        const h3Error = createError({ statusCode: error.statusCode || 500, statusMessage: debugInfo.errorMessage, data: error.data });
        return { error: h3Error.toJSON(), debug: debugInfo };
    }
});