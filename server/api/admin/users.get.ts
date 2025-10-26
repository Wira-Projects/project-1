// server/api/admin/users.get.ts
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';
import { createError, defineEventHandler, H3Event } from 'h3';
import { useRuntimeConfig } from '#imports';

// Tipe untuk data pengguna
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

// Tipe untuk informasi debug
interface DebugInfo {
    invoked: boolean;
    expectedAdminEmail?: string | null;
    serviceKeyPresent?: boolean;
    serverUserEmail?: string | null;
    accessGranted?: boolean;
    errorMessage?: string;
    step?: string; // Menunjukkan langkah terakhir yang berhasil atau gagal
    receivedCookieHeader?: string | null; // Tambahkan field untuk header cookie
}

// Tipe respons gabungan
interface ApiResponse {
    users: DetailedUser[];
    debug: DebugInfo;
}

// Tipe respons error gabungan
interface ApiErrorResponse {
    error: {
      statusCode: number;
      statusMessage: string;
      data?: any; // H3Error bisa punya data tambahan
    };
    debug: DebugInfo;
}

export default defineEventHandler(async (event: H3Event): Promise<ApiResponse | ApiErrorResponse> => {
    // Inisialisasi objek debug
    const debugInfo: DebugInfo = {
        invoked: true,
        expectedAdminEmail: null,
        serviceKeyPresent: false,
        serverUserEmail: null,
        accessGranted: false,
        errorMessage: undefined, // Inisialisasi errorMessage
        step: 'Initializing',
        receivedCookieHeader: null, // Inisialisasi header cookie
    };

    try {
        // --- TAMBAHAN DEBUG: Log header cookie ---
        debugInfo.step = 'Reading request headers';
        // Akses header 'cookie' dari request Node.js asli
        debugInfo.receivedCookieHeader = event.node.req.headers['cookie'] || null;
        console.log('API Route: Received Cookie Header:', debugInfo.receivedCookieHeader); // Log juga di server
        // --- AKHIR TAMBAHAN DEBUG ---

        debugInfo.step = 'Reading runtime config';
        const config = useRuntimeConfig(event);
        debugInfo.expectedAdminEmail = config.public.adminEmail || null;
        const serviceKey = config.supabaseServiceKey;
        debugInfo.serviceKeyPresent = !!serviceKey;

        // Validasi Service Key
        if (!serviceKey) {
            debugInfo.step = 'Error: Service key missing';
            debugInfo.errorMessage = 'Server configuration error: Service key missing.';
            console.error('API Route Error:', debugInfo.errorMessage);
            // Kembalikan objek error dengan debug info
            return {
                error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                debug: debugInfo
            };
        }
        if (!debugInfo.expectedAdminEmail) {
            debugInfo.step = 'Warning: Admin email missing';
            debugInfo.errorMessage = 'Server configuration error: Admin email missing in public runtimeConfig.';
            console.warn('API Route Warning:', debugInfo.errorMessage);
            // Lanjutkan, tapi catat di debug
        }

        // Validasi Pengguna Admin
        debugInfo.step = 'Validating current user';
        const currentUser = await serverSupabaseUser(event);
        debugInfo.serverUserEmail = currentUser?.email || null;

        if (!currentUser || currentUser.email !== debugInfo.expectedAdminEmail) {
            debugInfo.step = 'Error: Access denied';
            // Perbarui errorMessage dengan informasi yang relevan
            debugInfo.errorMessage = `Access Denied. User: ${debugInfo.serverUserEmail || 'unauthenticated'}, Expected Admin: ${debugInfo.expectedAdminEmail || 'Not Set'}`;
            console.warn('API Route:', debugInfo.errorMessage);
            // Kembalikan objek error dengan debug info
            return {
                error: createError({ statusCode: 403, statusMessage: 'Forbidden' }).toJSON(),
                debug: debugInfo
            };
        }
        debugInfo.accessGranted = true;

        // Buat Admin Client
        debugInfo.step = 'Creating Supabase admin client';
        const adminClient = await serverSupabaseClient(event, { supabaseKey: serviceKey });
        if (!adminClient) {
            debugInfo.step = 'Error: Failed to create admin client';
            debugInfo.errorMessage = 'Failed to create Supabase admin client.';
            console.error('API Route Error:', debugInfo.errorMessage);
            return {
                error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                debug: debugInfo
            };
        }

        // Fetch Users
        debugInfo.step = 'Fetching users list';
        const { data: userData, error: listError } = await adminClient.auth.admin.listUsers({});

        if (listError) {
            debugInfo.step = 'Error: Failed fetching users list';
            debugInfo.errorMessage = `Failed to list users: ${listError.message}`;
            console.error('API Route Error:', debugInfo.errorMessage);
            return {
                error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                debug: debugInfo
            };
        }
        if (!userData || !userData.users) {
            debugInfo.step = 'Completed: No users found';
            console.log('API Route: No users found or userData is null.'); // Tambah log
            return { users: [], debug: debugInfo };
        }

        // Fetch Profiles & Organizations (dengan penanganan error non-fatal)
        const userIds = userData.users.map(u => u.id);
        if (userIds.length === 0) {
            debugInfo.step = 'Completed: User list empty, skipped profile fetch';
             console.log('API Route: User list is empty, skipping profile/org fetch.'); // Tambah log
            return { users: [], debug: debugInfo };
        }

        debugInfo.step = 'Fetching profiles';
        let profiles: any[] | null = null;
        try {
            const { data, error } = await adminClient
                .from('profiles').select('user_id, full_name, current_organization_id').in('user_id', userIds);
            if (error) throw error;
            profiles = data;
        } catch (profileError: any) {
            // Catat error di debugInfo tapi jangan hentikan proses
            const profileErrorMessage = `Error fetching profiles: ${profileError.message}`;
            debugInfo.errorMessage = debugInfo.errorMessage ? `${debugInfo.errorMessage}; ${profileErrorMessage}` : profileErrorMessage;
            console.warn("API Route Warning:", profileErrorMessage);
             debugInfo.step = 'Warning: Error fetching profiles, continuing...'; // Update step
        }

        debugInfo.step = 'Fetching organizations';
        let organizationsMap: Map<number, { name?: string }> = new Map();
        const organizationIds = profiles?.map(p => p.current_organization_id).filter(id => id != null) as number[] || [];
        if (organizationIds.length > 0) {
            try {
                const { data: organizations, error } = await adminClient
                    .from('organizations').select('id, name').in('id', organizationIds);
                if (error) throw error;
                if (organizations) {
                    organizationsMap = new Map(organizations.map(org => [org.id, { name: org.name }]));
                }
            } catch (orgError: any) {
                 // Catat error di debugInfo tapi jangan hentikan proses
                const orgErrorMessage = `Error fetching organizations: ${orgError.message}`;
                debugInfo.errorMessage = debugInfo.errorMessage ? `${debugInfo.errorMessage}; ${orgErrorMessage}` : orgErrorMessage;
                console.warn("API Route Warning:", orgErrorMessage);
                debugInfo.step = 'Warning: Error fetching organizations, continuing...'; // Update step
            }
        } else {
             debugInfo.step = 'Skipped fetching organizations (no IDs found)';
        }

        // Combine Data
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
         console.log(`API Route: Successfully processed ${detailedUsers.length} users.`); // Tambah log
        // Hapus errorMessage jika tidak ada error fatal
        if (debugInfo.step.startsWith('Completed') || debugInfo.step.startsWith('Warning')) {
            // Biarkan errorMessage jika ada warning sebelumnya
        }

        return { users: detailedUsers, debug: debugInfo };

    } catch (error: any) {
        // Tangkap error tak terduga
        debugInfo.step = 'Error: Unhandled exception';
        debugInfo.errorMessage = error.message || 'Internal Server Error in API route.';
        console.error('API Route Unhandled Error:', error);
        // Kembalikan objek error dengan debug info
        const h3Error = createError({ statusCode: error.statusCode || 500, statusMessage: debugInfo.errorMessage, data: error.data });
        return {
            error: h3Error.toJSON(),
            debug: debugInfo // Pastikan debugInfo dikembalikan di sini juga
        };
    }
});