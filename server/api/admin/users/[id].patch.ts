// server/api/admin/users/[id].patch.ts
import { serverSupabaseUser } from '#supabase/server';
// *** Pastikan impor ini ada ***
import { createClient } from '@supabase/supabase-js';
import { createError, defineEventHandler, H3Event, readBody } from 'h3';
import { useRuntimeConfig } from '#imports';

// Interface untuk data yang diterima di body
interface UpdateProfilePayload {
  full_name?: string | null;
  // Tambahkan field lain dari 'profiles' yang bisa diupdate admin di sini
}

// Interface sederhana untuk respons sukses
interface SuccessResponse {
  success: boolean;
  message: string;
}

export default defineEventHandler(async (event: H3Event): Promise<SuccessResponse | any> => {
    // Ekstrak ID pengguna dari parameter URL
    const userIdToUpdate = event.context.params?.id;

    // Pastikan User ID ada
    if (!userIdToUpdate) {
        console.error('API Patch Error: Missing User ID in request path.');
        throw createError({ statusCode: 400, statusMessage: 'User ID is required in the URL path.' });
    }

    try {
        // Baca konfigurasi runtime
        const config = useRuntimeConfig(event);
        const adminEmail = config.public.adminEmail;
        const serviceKey = config.supabaseServiceKey; // Kunci hanya sisi server
        const supabaseUrl = config.public.supabase.url; // URL Supabase publik

        // Validasi konfigurasi server esensial
        if (!serviceKey || !supabaseUrl || !adminEmail) {
             console.error('API Patch Error: Server configuration missing (Service Key, URL, or Admin Email)');
             throw createError({ statusCode: 500, statusMessage: 'Server configuration error. Check environment variables.' });
        }

        // Validasi bahwa pengguna yang membuat permintaan adalah admin yang ditunjuk
        const currentUser = await serverSupabaseUser(event);
        if (!currentUser || currentUser.email !== adminEmail) {
            console.warn(`API Patch Warning: Access Denied for user ${currentUser?.email || 'unauthenticated'}. Expected admin: ${adminEmail}`);
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required.' });
        }

        // Baca payload (data untuk diupdate) dari body permintaan
        const body = await readBody<UpdateProfilePayload>(event);

        // Validasi payload
        if (!body || Object.keys(body).length === 0 || body.full_name === undefined) {
            throw createError({ statusCode: 400, statusMessage: 'No valid data provided for update (full_name is required).' });
        }
        if (typeof body.full_name !== 'string' && body.full_name !== null) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid data type for full_name. Must be a string or null.' });
        }

        // *** Buat Klien Admin Supabase menggunakan Service Key ***
        const adminClient = createClient(supabaseUrl, serviceKey, {
             auth: {
                autoRefreshToken: false,
                persistSession: false
             }
        });

        console.log(`API Patch: Admin ${currentUser.email} attempting to update profile for user ${userIdToUpdate} with data:`, body);

        // Siapkan objek data khusus untuk operasi update Supabase
        const dataToUpdate: Partial<UpdateProfilePayload> = {};
        dataToUpdate.full_name = body.full_name?.trim() || null; // Trim spasi & set null jika kosong

        // *** Lakukan update pada tabel 'profiles' di skema 'public' ***
        const { error: updateError } = await adminClient
            .from('profiles') // Asumsi tabel 'profiles' ada di skema 'public'
            .update(dataToUpdate)
            .eq('user_id', userIdToUpdate); // Target baris profil yang cocok dengan ID pengguna

        // Periksa error selama operasi update database
        if (updateError) {
            console.error(`API Patch Error: Failed to update profile for user ${userIdToUpdate}:`, updateError);
            throw createError({ statusCode: 500, statusMessage: `Failed to update profile: ${updateError.message}` });
        }

        // Jika berhasil
        console.log(`API Patch: Successfully updated profile for user ${userIdToUpdate}`);
        return { success: true, message: `User profile ${userIdToUpdate} updated successfully.` };

    } catch (error: any) {
        // Tangani error yang dilempar oleh createError atau exception tak terduga
        console.error('API Patch Unhandled Error:', error);
        if (error.statusCode) { throw error; } // Lempar kembali jika sudah H3Error
        throw createError({ statusCode: 500, statusMessage: error.message || 'Internal Server Error occurred during profile update.' });
    }
});