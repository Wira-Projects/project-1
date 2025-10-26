// server/api/admin/users.get.ts
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';
// ✅ PERBAIKAN: Impor useRuntimeConfig dari #imports, bukan h3 secara langsung
import { createError, defineEventHandler, H3Event } from 'h3';
import { useRuntimeConfig } from '#imports'; // <-- Impor yang benar

// Definisikan tipe DetailedUser di sini atau impor dari file terpisah
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

export default defineEventHandler(async (event: H3Event): Promise<DetailedUser[]> => {
  // Gunakan useRuntimeConfig yang diimpor dari #imports
  const config = useRuntimeConfig(event);
  const adminEmail = config.public.adminEmail; // Ambil dari public runtime config
  const serviceKey = config.supabaseServiceKey; // Ambil dari private runtime config (hanya server)

  // -- LOGGING UNTUK DEBUGGING --
  console.log('API Route: /api/admin/users.get.ts invoked.');
  console.log('API Route: Expected Admin Email:', adminEmail);
  // Hati-hati! Jangan log serviceKey di production
  // console.log('API Route: Service Key Present:', !!serviceKey);
  // --- AKHIR LOGGING ---

  if (!serviceKey) {
    console.error('API Route Error: Service key (supabaseServiceKey) is missing in server runtimeConfig.');
    throw createError({ statusCode: 500, statusMessage: 'Server configuration error: Service key missing.' });
  }
  if (!adminEmail) {
     console.error('API Route Error: Admin email (public.adminEmail) is missing in runtimeConfig.');
     // Anda mungkin ingin throw error di sini juga, atau biarkan pemeriksaan user gagal
     // throw createError({ statusCode: 500, statusMessage: 'Server configuration error: Admin email missing.' });
  }


  // Dapatkan pengguna saat ini & validasi status admin
  const currentUser = await serverSupabaseUser(event);
  // -- LOGGING UNTUK DEBUGGING --
  console.log('API Route: Current User Email from serverSupabaseUser:', currentUser?.email || 'null/undefined');
  // --- AKHIR LOGGING ---

  if (!currentUser || currentUser.email !== adminEmail) {
    console.warn(`API Route: Access Denied. User: ${currentUser?.email || 'unauthenticated'}, Expected Admin: ${adminEmail}`);
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  // -- LOGGING UNTUK DEBUGGING --
  console.log('API Route: Admin access granted.');
  // --- AKHIR LOGGING ---

  // Buat admin client
  const adminClient = await serverSupabaseClient(event, { supabaseKey: serviceKey });
  if (!adminClient) {
    console.error('API Route Error: Failed to create Supabase admin client.');
    throw createError({ statusCode: 500, statusMessage: 'Failed to create Supabase admin client.' });
  }

  try {
    // Fetch users
    const { data: userData, error: listError } = await adminClient.auth.admin.listUsers({});

    if (listError) {
      console.error('API Route Error: Failed to list users:', listError.message);
      throw createError({ statusCode: 500, statusMessage: `Failed to list users: ${listError.message}` });
    }
    if (!userData || !userData.users) {
        console.log('API Route: No users found or userData is null.');
        return [];
    }

    // Fetch profiles & organizations
    const userIds = userData.users.map(u => u.id);
    if (userIds.length === 0) {
        console.log('API Route: User list is empty, skipping profile/org fetch.');
        return [];
    }

    const { data: profiles, error: profileError } = await adminClient
        .from('profiles').select('user_id, full_name, current_organization_id').in('user_id', userIds);
    if (profileError) console.error("API Route Warning: Error fetching profiles:", profileError.message); // Log sebagai warning

    const organizationIds = profiles?.map(p => p.current_organization_id).filter(id => id != null) as number[] || [];
    let organizationsMap: Map<number, { name?: string }> = new Map();
    if (organizationIds.length > 0) {
        const { data: organizations, error: orgError } = await adminClient
            .from('organizations').select('id, name').in('id', organizationIds);
        if (orgError) console.error("API Route Warning: Error fetching organizations:", orgError.message); // Log sebagai warning
        else if (organizations) organizationsMap = new Map(organizations.map(org => [org.id, { name: org.name }]));
    }

    // Combine data
    const detailedUsers: DetailedUser[] = userData.users.map(user => {
        const profile = profiles?.find(p => p.user_id === user.id) || null;
        const organization = profile?.current_organization_id ? organizationsMap.get(profile.current_organization_id) || null : null;
        return {
            id: user.id, email: user.email, created_at: user.created_at, email_confirmed_at: user.email_confirmed_at,
            profile: profile ? { full_name: profile.full_name, current_organization_id: profile.current_organization_id, organization: organization } : null,
        };
    });

    console.log(`API Route: Successfully fetched ${detailedUsers.length} users.`); // Log jumlah hasil
    return detailedUsers;

  } catch (error: any) {
    console.error('API Route Error in /api/admin/users:', error);
    if (error.statusCode && error.statusMessage) throw error; // Re-throw H3Error
    throw createError({ statusCode: 500, statusMessage: error.message || 'Internal Server Error fetching users.' });
  }
});