// server/api/admin/users/[id].delete.ts
import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { createError, defineEventHandler, H3Event } from 'h3';
import { useRuntimeConfig } from '#imports';

// Interface sederhana untuk respons sukses
interface SuccessResponse {
  success: boolean;
  message: string;
}

export default defineEventHandler(async (event: H3Event): Promise<SuccessResponse | any> => {
    const userIdToDelete = event.context.params?.id;

    if (!userIdToDelete) {
        throw createError({ statusCode: 400, statusMessage: 'User ID is required' });
    }

    try {
        const config = useRuntimeConfig(event);
        const adminEmail = config.public.adminEmail;
        const serviceKey = config.supabaseServiceKey;
        const supabaseUrl = config.public.supabase.url;

        // Validasi Service Key & URL & Admin Email (Harus ada)
        if (!serviceKey || !supabaseUrl || !adminEmail) {
            console.error('API Delete Error: Server configuration missing (Service Key, URL, or Admin Email)');
            throw createError({ statusCode: 500, statusMessage: 'Server configuration error.' });
        }

        // Validasi Admin User
        const currentUser = await serverSupabaseUser(event);
        if (!currentUser || currentUser.email !== adminEmail) {
            console.warn(`API Delete Warning: Access Denied for user ${currentUser?.email || 'unauthenticated'}`);
            throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
        }

        // Buat Admin Client
        const adminClient = createClient(supabaseUrl, serviceKey, {
             auth: { autoRefreshToken: false, persistSession: false }
        });

        // Hapus pengguna menggunakan Admin API
        console.log(`API Delete: Attempting to delete user ${userIdToDelete} by admin ${currentUser.email}`);
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userIdToDelete);

        if (deleteError) {
            console.error(`API Delete Error: Failed to delete user ${userIdToDelete}:`, deleteError.message);
            // Sesuaikan status code berdasarkan error Supabase jika memungkinkan
            throw createError({ statusCode: deleteError.status || 500, statusMessage: `Failed to delete user: ${deleteError.message}` });
        }

        console.log(`API Delete: Successfully deleted user ${userIdToDelete}`);
        return { success: true, message: `User ${userIdToDelete} deleted successfully.` };

    } catch (error: any) {
        // Tangani error yang dilempar dari createError atau error tak terduga
        console.error('API Delete Unhandled Error:', error);
        // Jika error sudah berupa H3Error, lempar kembali
        if (error.statusCode) {
            throw error;
        }
        // Jika error biasa, buat H3Error baru
        throw createError({ statusCode: 500, statusMessage: error.message || 'Internal Server Error' });
    }
});