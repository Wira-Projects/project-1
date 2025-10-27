// server/api/admin/marketplace.post.ts
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { createError, defineEventHandler, H3Event, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'

// Tipe data model baru yang diharapkan dari body request
interface NewMarketplaceModel {
    provider_id: number;
    provider_model_id: string;
    display_name: string;
    model_type: string;
    context_window?: number | null; // Opsional
    provider_cost_per_million_input: string | number; // Bisa string atau number dari input
    provider_cost_per_million_output: string | number;
    selling_price_per_million_input: string | number;
    selling_price_per_million_output: string | number;
    is_available?: boolean; // Opsional, default ke false atau true
}

// Tipe DebugInfo, ApiSuccessResponse, ApiErrorResponse (bisa disalin dari PATCH)
interface DebugInfo {
    invoked: boolean;
    expectedAdminEmail?: string | null;
    serverUserEmail?: string | null;
    accessGranted?: boolean;
    errorMessage?: string;
    step?: string;
    receivedBody?: any;
}

interface ApiSuccessResponse {
    success: boolean;
    message: string;
    newModelId: number; // Kembalikan ID model baru
    debug: DebugInfo;
}
interface ApiErrorResponse { /* ... Sama seperti GET/PATCH ... */
    error: { statusCode: number; statusMessage: string; data?: any };
    debug: DebugInfo;
}

export default defineEventHandler(async (event: H3Event): Promise<ApiSuccessResponse | ApiErrorResponse> => {
    const debugInfo: DebugInfo = {
        invoked: true,
        expectedAdminEmail: null,
        serverUserEmail: null,
        accessGranted: false,
        errorMessage: undefined,
        step: 'Initializing Marketplace POST',
        receivedBody: null,
    };

    try {
        debugInfo.step = 'Reading runtime config & body';
        const config = useRuntimeConfig(event);
        debugInfo.expectedAdminEmail = config.public.adminEmail || null;
        const body = await readBody(event) as NewMarketplaceModel;
        debugInfo.receivedBody = body; // Simpan body untuk debug

        // --- Validasi Input Body ---
        debugInfo.step = 'Validating request body';
        const requiredFields: (keyof NewMarketplaceModel)[] = [
            'provider_id', 'provider_model_id', 'display_name', 'model_type',
            'provider_cost_per_million_input', 'provider_cost_per_million_output',
            'selling_price_per_million_input', 'selling_price_per_million_output'
        ];
        const missingFields = requiredFields.filter(field => body[field] === undefined || body[field] === '');
        if (missingFields.length > 0) {
            debugInfo.errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
             return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        // Validasi tipe dasar (bisa ditambahkan validasi lebih ketat)
        if (typeof body.provider_id !== 'number' || typeof body.provider_model_id !== 'string' || typeof body.display_name !== 'string' || typeof body.model_type !== 'string') {
             debugInfo.errorMessage = `Invalid data types for required fields.`;
             return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        // Pastikan harga adalah angka atau string angka yang valid
        const priceFields: (keyof NewMarketplaceModel)[] = [
            'provider_cost_per_million_input', 'provider_cost_per_million_output',
            'selling_price_per_million_input', 'selling_price_per_million_output'
        ];
        for (const field of priceFields) {
            if (isNaN(parseFloat(String(body[field])))) {
                 debugInfo.errorMessage = `Invalid number format for price field: ${field}`;
                 return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
            }
        }
        // --- Akhir Validasi Input ---

        // --- Validasi Config & User Admin (Sama seperti GET/PATCH) ---
        if (!debugInfo.expectedAdminEmail) { /* ... error handling ... */
             debugInfo.errorMessage = 'Server configuration error: Admin email missing.';
             return { error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        debugInfo.step = 'Validating current user';
        const currentUser = await serverSupabaseUser(event);
        debugInfo.serverUserEmail = currentUser?.email || null;
        if (!currentUser || currentUser.email !== debugInfo.expectedAdminEmail) { /* ... error handling ... */
             debugInfo.errorMessage = `Access Denied. User: ${debugInfo.serverUserEmail || 'unauthenticated'}`;
             return { error: createError({ statusCode: 403, statusMessage: 'Forbidden' }).toJSON(), debug: debugInfo };
        }
        debugInfo.accessGranted = true;
        // --- Akhir Validasi Admin ---

        debugInfo.step = 'Getting server Supabase client';
        const client = await serverSupabaseClient(event);
         if (!client) { /* ... error handling ... */
             debugInfo.errorMessage = 'Failed to initialize Supabase server client.';
             return { error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }

        debugInfo.step = 'Inserting new model into database';

        // Siapkan data untuk insert (konversi harga ke tipe yang sesuai jika perlu, Supabase biasanya handle string->decimal)
        const modelToInsert = {
            provider_id: body.provider_id,
            provider_model_id: body.provider_model_id.trim(),
            display_name: body.display_name.trim(),
            model_type: body.model_type.trim(),
            context_window: body.context_window ?? null, // Default ke null jika tidak ada
            provider_cost_per_million_input: String(body.provider_cost_per_million_input), // Pastikan string
            provider_cost_per_million_output: String(body.provider_cost_per_million_output),
            selling_price_per_million_input: String(body.selling_price_per_million_input),
            selling_price_per_million_output: String(body.selling_price_per_million_output),
            is_available: body.is_available ?? false // Default ke false jika tidak ada
        };

        const { data: newModelData, error: insertError } = await client
            .from('marketplace_models')
            .insert(modelToInsert)
            .select('id') // Minta ID dari data yang baru diinsert
            .single(); // Kita hanya insert satu, jadi pakai single()

        if (insertError || !newModelData) {
            debugInfo.step = 'Error: Failed inserting model';
            debugInfo.errorMessage = `Failed to insert new model: ${insertError?.message || 'No data returned after insert.'}`;
            console.error('API Route Error:', debugInfo.errorMessage, insertError);
            // Cek spesifik untuk duplikat provider_model_id jika memungkinkan (tergantung constraint DB)
            if (insertError?.code === '23505') { // Kode error PostgreSQL untuk unique violation
                 debugInfo.errorMessage = `Gagal menambahkan model: ID Model Penyedia "${body.provider_model_id}" sudah ada.`;
                 return { error: createError({ statusCode: 409, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo }; // 409 Conflict
            }
            return {
                error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                debug: debugInfo
            };
        }

        debugInfo.step = `Completed: Model added successfully with ID ${newModelData.id}.`;
        return {
            success: true,
            message: `Model "${modelToInsert.display_name}" berhasil ditambahkan.`,
            newModelId: newModelData.id,
            debug: debugInfo
        };

    } catch (error: any) {
        // --- Error Handling (Sama seperti GET/PATCH) ---
         debugInfo.step = 'Error: Unhandled exception';
         debugInfo.errorMessage = error.message || 'Internal Server Error in API route.';
         console.error('API Route Unhandled Error:', error);
         const h3Error = createError({ statusCode: error.statusCode || 500, statusMessage: debugInfo.errorMessage, data: error.data });
         return {
            error: h3Error.toJSON(),
            debug: debugInfo
         };
    }
});