// server/api/admin/marketplace.post.ts
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { createError, defineEventHandler, H3Event, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'

// ✅ Ubah tipe data body: provider_name (string) bukan provider_id (number)
interface NewMarketplaceModel {
    provider_name: string; // <-- Diubah
    provider_model_id: string;
    display_name: string;
    model_type: string;
    context_window?: number | null;
    provider_cost_per_million_input: string | number;
    provider_cost_per_million_output: string | number;
    selling_price_per_million_input: string | number;
    selling_price_per_million_output: string | number;
    is_available?: boolean;
}

// --- Interface DebugInfo, ApiSuccessResponse, ApiErrorResponse (Sama) ---
interface DebugInfo { invoked: boolean; expectedAdminEmail?: string | null; serverUserEmail?: string | null; accessGranted?: boolean; errorMessage?: string; step?: string; receivedBody?: any; foundProviderId?: number | null;} // Tambah foundProviderId
interface ApiSuccessResponse { success: boolean; message: string; newModelId: number; debug: DebugInfo; }
interface ApiErrorResponse { error: { statusCode: number; statusMessage: string; data?: any }; debug: DebugInfo; }


export default defineEventHandler(async (event: H3Event): Promise<ApiSuccessResponse | ApiErrorResponse> => {
    const debugInfo: DebugInfo = {
        invoked: true,
        expectedAdminEmail: null,
        serverUserEmail: null,
        accessGranted: false,
        errorMessage: undefined,
        step: 'Initializing Marketplace POST',
        receivedBody: null,
        foundProviderId: null, // Init
    };

    try {
        debugInfo.step = 'Reading runtime config & body';
        const config = useRuntimeConfig(event);
        debugInfo.expectedAdminEmail = config.public.adminEmail || null;
        const body = await readBody(event) as NewMarketplaceModel;
        debugInfo.receivedBody = body;

        // --- Validasi Input Body ---
        debugInfo.step = 'Validating request body';
        // ✅ Sesuaikan requiredFields
        const requiredFields: (keyof NewMarketplaceModel)[] = [
            'provider_name', 'provider_model_id', 'display_name', 'model_type', // <-- Ganti provider_id ke provider_name
            'provider_cost_per_million_input', 'provider_cost_per_million_output',
            'selling_price_per_million_input', 'selling_price_per_million_output'
        ];
        const missingFields = requiredFields.filter(field => body[field] === undefined || String(body[field]).trim() === ''); // Cek string kosong juga
        if (missingFields.length > 0) { /* ... error handling ... */
             debugInfo.errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
             return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        // ✅ Sesuaikan validasi tipe dasar
        if (typeof body.provider_name !== 'string' || typeof body.provider_model_id !== 'string' || typeof body.display_name !== 'string' || typeof body.model_type !== 'string') {
             debugInfo.errorMessage = `Invalid data types for required fields.`;
             return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        // Validasi harga (sama)
        const priceFields: (keyof NewMarketplaceModel)[] = [ /* ... */ ];
        for (const field of priceFields) { if (isNaN(parseFloat(String(body[field])))) { /* ... error handling ... */ }}
        // --- Akhir Validasi Input ---

        // --- Validasi Config & User Admin (Sama) ---
        if (!debugInfo.expectedAdminEmail) { /* ... */ }
        debugInfo.step = 'Validating current user';
        const currentUser = await serverSupabaseUser(event);
        debugInfo.serverUserEmail = currentUser?.email || null;
        if (!currentUser || currentUser.email !== debugInfo.expectedAdminEmail) { /* ... */ }
        debugInfo.accessGranted = true;
        // --- Akhir Validasi Admin ---

        debugInfo.step = 'Getting server Supabase client';
        const client = await serverSupabaseClient(event);
         if (!client) { /* ... */ }

        // ✅ Cari Provider ID berdasarkan nama
        debugInfo.step = `Looking up provider ID for name: "${body.provider_name}"`;
        const providerName = body.provider_name.trim();
        const { data: providerData, error: providerError } = await client
            .from('api_providers')
            .select('id')
            .ilike('name', providerName) // Gunakan ilike untuk case-insensitive matching
            .maybeSingle(); // Ambil satu atau null

        if (providerError) {
            debugInfo.errorMessage = `Error looking up provider: ${providerError.message}`;
             return { error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        if (!providerData) {
            debugInfo.errorMessage = `Provider with name "${providerName}" not found.`;
             // Kembalikan 400 Bad Request agar frontend bisa menampilkan pesan spesifik
             return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        const providerId = providerData.id;
        debugInfo.foundProviderId = providerId; // Simpan ID yang ditemukan untuk debug
        debugInfo.step = `Found provider ID: ${providerId}`;
        // --- Akhir Pencarian Provider ID ---

        debugInfo.step = 'Inserting new model into database';

        // ✅ Gunakan providerId yang ditemukan saat insert
        const modelToInsert = {
            provider_id: providerId, // <-- Gunakan ID yang ditemukan
            provider_model_id: body.provider_model_id.trim(),
            display_name: body.display_name.trim(),
            model_type: body.model_type.trim(),
            context_window: body.context_window ?? null,
            provider_cost_per_million_input: String(body.provider_cost_per_million_input),
            provider_cost_per_million_output: String(body.provider_cost_per_million_output),
            selling_price_per_million_input: String(body.selling_price_per_million_input),
            selling_price_per_million_output: String(body.selling_price_per_million_output),
            is_available: body.is_available ?? false
        };

        // --- Insert Data & Error Handling (Sama seperti sebelumnya) ---
        const { data: newModelData, error: insertError } = await client
            .from('marketplace_models')
            .insert(modelToInsert)
            .select('id')
            .single();

        if (insertError || !newModelData) { /* ... Error handling insert ... */
            debugInfo.step = 'Error: Failed inserting model';
            debugInfo.errorMessage = `Failed to insert new model: ${insertError?.message || 'No data returned.'}`;
             if (insertError?.code === '23505') {
                 debugInfo.errorMessage = `Model ID "${body.provider_model_id}" sudah ada untuk penyedia ini.`;
                 return { error: createError({ statusCode: 409, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
             }
             return { error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }

        // --- Response Sukses (Sama seperti sebelumnya) ---
        debugInfo.step = `Completed: Model added successfully with ID ${newModelData.id}.`;
        return { success: true, message: `Model "${modelToInsert.display_name}" berhasil ditambahkan.`, newModelId: newModelData.id, debug: debugInfo };

    } catch (error: any) {
        // --- Error Handling (Sama seperti sebelumnya) ---
         debugInfo.step = 'Error: Unhandled exception';
         debugInfo.errorMessage = error.message || 'Internal Server Error';
         return { error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
    }
});