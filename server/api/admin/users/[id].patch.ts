// server/api/admin/users/[id].patch.ts
import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js'; // Pastikan import ini ada
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
        console.error('API Patch/Upsert Error: Missing User ID in request path.');
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
             console.error('API Patch/Upsert Error: Server configuration missing (Service Key, URL, or Admin Email)');
             throw createError({ statusCode: 500, statusMessage: 'Server configuration error. Check environment variables.' });
        }

        // Validasi bahwa pengguna yang membuat permintaan adalah admin yang ditunjuk
        const currentUser = await serverSupabaseUser(event);
        if (!currentUser || currentUser.email !== adminEmail) {
            console.warn(`API Patch/Upsert Warning: Access Denied for user ${currentUser?.email || 'unauthenticated'}. Expected admin: ${adminEmail}`);
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required.' });
        }

        // Baca payload (data untuk diupdate) dari body permintaan
        const body = await readBody<UpdateProfilePayload>(event);

        // Validasi payload: pastikan ada data dan tipenya benar
        if (!body || typeof body.full_name === 'undefined') { // Cek apakah full_name ada di body
             throw createError({ statusCode: 400, statusMessage: 'Request body must contain a "full_name" field (can be null).' });
        }
        // Validasi tipe dasar untuk full_name
        if (typeof body.full_name !== 'string' && body.full_name !== null) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid data type for full_name. Must be a string or null.' });
        }

        // *** Buat Klien Admin Supabase menggunakan Service Key ***
        // Klien ini mengabaikan aturan RLS.
        const adminClient = createClient(supabaseUrl, serviceKey, {
             auth: {
                autoRefreshToken: false, // Tidak perlu refresh token untuk service key
                persistSession: false    // Jangan simpan sesi di server
             }
        });

        // Siapkan data untuk upsert, pastikan user_id disertakan
        const dataToUpsert = {
            user_id: userIdToUpdate, // Penting untuk insert jika baris belum ada
            full_name: body.full_name?.trim() || null, // Trim spasi & set null jika kosong
            // Tambahkan field profil lain jika perlu diupdate/insert di sini
            // Misalnya: avatar_url: body.avatar_url || null,
        };

        console.log(`API Upsert: Admin ${currentUser.email} attempting to upsert profile for user ${userIdToUpdate} with data:`, dataToUpsert);

        // *** Lakukan upsert pada tabel 'profiles' di skema 'public' ***
        const { error: upsertError } = await adminClient
            .from('profiles') // Asumsi tabel 'profiles' ada di skema 'public'
            .upsert(dataToUpsert, {
                onConflict: 'user_id', // Tentukan kolom yang menyebabkan konflik (primary key/unique)
                // ignoreDuplicates: false // Defaultnya false, artinya akan update jika konflik
            });

        // Periksa error selama operasi database upsert
        if (upsertError) {
            console.error(`API Upsert Error: Failed to upsert profile for user ${userIdToUpdate}:`, upsertError);
            // Berikan pesan error yang lebih spesifik jika terkait cache skema
            if (upsertError.message.includes("schema cache")) {
                 throw createError({ statusCode: 500, statusMessage: `Failed to save profile: Could not find the table 'public.profiles' in the schema cache. Ensure the table exists and try reloading the schema in Supabase SQL Editor (NOTIFY pgrst, 'reload schema').` });
            }
            // Error generik untuk masalah database lainnya
            throw createError({ statusCode: 500, statusMessage: `Failed to save profile: ${upsertError.message}` });
        }

        // Jika berhasil
        console.log(`API Upsert: Successfully saved profile for user ${userIdToUpdate}`);
        return { success: true, message: `User profile ${userIdToUpdate} saved successfully.` };

    } catch (error: any) {
        // Tangani error yang dilempar oleh createError atau exception tak terduga
        console.error('API Upsert Unhandled Error:', error);
        // Jika sudah berupa H3 error (seperti dari createError), lempar kembali
        if (error.statusCode) {
            throw error;
        }
        // Jika tidak, bungkus dalam error 500 generik
        throw createError({ statusCode: 500, statusMessage: error.message || 'Internal Server Error occurred during profile save.' });
    }
});