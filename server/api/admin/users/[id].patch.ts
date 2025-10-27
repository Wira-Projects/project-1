// server/api/admin/users/[id].patch.ts
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';
import { createError, defineEventHandler, H3Event, readBody } from 'h3';
import { useRuntimeConfig } from '#imports';

// Interface untuk data yang diterima di body
interface UpdateProfilePayload {
  full_name?: string | null;
  // Tambahkan field lain dari 'profiles' yang boleh diupdate admin di sini
  // current_organization_id?: number | null; // Contoh jika ingin update organisasi
}

// Interface sederhana untuk respons sukses
interface SuccessResponse {
  success: boolean;
  message: string;
}

export default defineEventHandler(async (event: H3Event): Promise<SuccessResponse | any> => {
    const userIdToUpdate = event.context.params?.id;

    if (!userIdToUpdate) {
        throw createError({ statusCode: 400, statusMessage: 'User ID is required' });
    }

    try {
        const config = useRuntimeConfig(event);
        const adminEmail = config.public.adminEmail;
        // Perhatikan: Tidak perlu Service Key di sini jika hanya update tabel 'profiles'
        // dan RLS sudah diatur dengan benar. Tapi jika RLS tidak memungkinkan admin update,
        // maka kita perlu pakai Admin Client seperti di GET/DELETE.
        // Untuk konsistensi & kepastian, kita gunakan Admin Client saja.
        const serviceKey = config.supabaseServiceKey;
        const supabaseUrl = config.public.supabase.url;

        // Validasi Service Key & URL & Admin Email (Harus ada)
        if (!serviceKey || !supabaseUrl || !adminEmail) {
             console.error('API Patch Error: Server configuration missing (Service Key, URL, or Admin Email)');
             throw createError({ statusCode: 500, statusMessage: 'Server configuration error.' });
        }


        // Validasi Admin User
        const currentUser = await serverSupabaseUser(event);
        if (!currentUser || currentUser.email !== adminEmail) {
            console.warn(`API Patch Warning: Access Denied for user ${currentUser?.email || 'unauthenticated'}`);
            throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
        }

        // Baca body payload
        const body = await readBody<UpdateProfilePayload>(event);

        // Validasi minimal payload (harus ada sesuatu untuk diupdate)
        if (!body || Object.keys(body).length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'No data provided for update.' });
        }
        // Validasi tipe data (contoh untuk full_name)
        if (body.full_name !== undefined && typeof body.full_name !== 'string' && body.full_name !== null) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid data type for full_name.' });
        }


        // Buat Admin Client (karena kita akan update tabel `profiles`)
        const adminClient = createClient(supabaseUrl, serviceKey, {
             auth: { autoRefreshToken: false, persistSession: false }
        });


        console.log(`API Patch: Attempting to update profile for user ${userIdToUpdate} by admin ${currentUser.email}`, body);

        // Siapkan data untuk diupdate
        const dataToUpdate: UpdateProfilePayload = {};
        if (body.full_name !== undefined) {
             // Pastikan null jika string kosong, sesuai kebutuhan DB
             dataToUpdate.full_name = body.full_name === '' ? null : body.full_name;
        }
        // Tambahkan field lain di sini jika ada

        // Update data di tabel 'profiles'
        const { error: updateError } = await adminClient
            .from('profiles')
            .update(dataToUpdate)
            .eq('user_id', userIdToUpdate); // Filter berdasarkan user_id

        if (updateError) {
            console.error(`API Patch Error: Failed to update profile for user ${userIdToUpdate}:`, updateError.message);
            // Cek jika error karena tidak ada profile (misal, upsert jika perlu, tapi update biasa lebih aman)
             if (updateError.code === 'PGRST116') { // Error code bisa berbeda tergantung config Supabase
                throw createError({ statusCode: 404, statusMessage: `Profile not found for user ${userIdToUpdate}. Cannot update.` });
            }
            throw createError({ statusCode: 500, statusMessage: `Failed to update profile: ${updateError.message}` });
        }

        console.log(`API Patch: Successfully updated profile for user ${userIdToUpdate}`);
        return { success: true, message: `User profile ${userIdToUpdate} updated successfully.` };

    } catch (error: any) {
        console.error('API Patch Unhandled Error:', error);
        if (error.statusCode) {
            throw error;
        }
        throw createError({ statusCode: 500, statusMessage: error.message || 'Internal Server Error' });
    }
});