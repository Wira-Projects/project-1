// server/api/admin/users.get.ts
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';
import { createError, defineEventHandler, H3Event, readValidatedBody, getQuery } from 'h3'; // Import h3 utilities if needed later

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
  // Gunakan useRuntimeConfig dalam konteks event handler
  const config = useRuntimeConfig(event);
  const adminEmail = config.public.adminEmail;
  const serviceKey = config.supabaseServiceKey;

  if (!serviceKey) {
    console.error('Server configuration error: Service key missing.');
    throw createError({ statusCode: 500, statusMessage: 'Server configuration error.' });
  }

  // Dapatkan pengguna saat ini & validasi status admin
  const currentUser = await serverSupabaseUser(event);
  if (!currentUser || currentUser.email !== adminEmail) {
    console.warn(`Admin access denied for user: ${currentUser?.email || 'unauthenticated'}`);
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  // Buat admin client
  const adminClient = await serverSupabaseClient(event, { supabaseKey: serviceKey });
  if (!adminClient) {
    console.error('Failed to create Supabase admin client.');
    throw createError({ statusCode: 500, statusMessage: 'Failed to create Supabase admin client.' });
  }

  try {
    // Fetch users
    // Anda bisa menambahkan opsi pagination di sini jika diperlukan, misal:
    // const { page = 1, perPage = 50 } = getQuery(event);
    // const { data: userData, error: listError } = await adminClient.auth.admin.listUsers({ page: +page, perPage: +perPage });
    const { data: userData, error: listError } = await adminClient.auth.admin.listUsers({});

    if (listError) {
      console.error('Failed to list users:', listError.message);
      throw createError({ statusCode: 500, statusMessage: `Failed to list users: ${listError.message}` });
    }
    if (!userData || !userData.users) return [];

    // Fetch profiles & organizations
    const userIds = userData.users.map(u => u.id);
    if (userIds.length === 0) return [];

    const { data: profiles, error: profileError } = await adminClient
        .from('profiles').select('user_id, full_name, current_organization_id').in('user_id', userIds);
    // Log error tapi jangan throw agar sebagian data tetap bisa ditampilkan jika profil gagal
    if (profileError) console.error("API Error fetching profiles:", profileError.message);

    const organizationIds = profiles?.map(p => p.current_organization_id).filter(id => id != null) as number[] || [];
    let organizationsMap: Map<number, { name?: string }> = new Map();
    if (organizationIds.length > 0) {
        const { data: organizations, error: orgError } = await adminClient
            .from('organizations').select('id, name').in('id', organizationIds);
        // Log error tapi jangan throw
        if (orgError) console.error("API Error fetching organizations:", orgError.message);
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

    return detailedUsers;

  } catch (error: any) {
    console.error('Error in /api/admin/users:', error);
    // Jika sudah H3Error, lempar lagi, jika tidak buat H3Error baru
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching users.' });
  }
});