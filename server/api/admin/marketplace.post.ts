// server/api/admin/marketplace.post.ts
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { createError, defineEventHandler, H3Event, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'

// Interface NewMarketplaceModel (menggunakan provider_name)
interface NewMarketplaceModel {
    provider_name: string; // Menggunakan nama
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

// Interface DebugInfo, ApiSuccessResponse, ApiErrorResponse
interface DebugInfo { invoked: boolean; expectedAdminEmail?: string | null; serverUserEmail?: string | null; accessGranted?: boolean; errorMessage?: string; step?: string; receivedBody?: any; foundProviderId?: number | null;}
interface ApiSuccessResponse { success: boolean; message: string; newModelId: number; debug: DebugInfo; }
interface ApiErrorResponse { error: { statusCode: number; statusMessage: string; data?: any }; debug: DebugInfo; }


export default defineEventHandler(async (event: H3Event): Promise<ApiSuccessResponse | ApiErrorResponse> => {
    const debugInfo: DebugInfo = {
        invoked: true, expectedAdminEmail: null, serverUserEmail: null, accessGranted: false,
        errorMessage: undefined, step: 'Initializing Marketplace POST', receivedBody: null, foundProviderId: null,
    };

    try {
        debugInfo.step = 'Reading runtime config & body';
        const config = useRuntimeConfig(event);
        debugInfo.expectedAdminEmail = config.public.adminEmail || null;
        const body = await readBody(event) as NewMarketplaceModel;
        debugInfo.receivedBody = body;

        // --- Validasi Input Body ---
        debugInfo.step = 'Validating request body';
        const requiredFields: (keyof NewMarketplaceModel)[] = [
            'provider_name', 'provider_model_id', 'display_name', 'model_type',
            'provider_cost_per_million_input', 'provider_cost_per_million_output',
            'selling_price_per_million_input', 'selling_price_per_million_output'
        ];
        const missingFields = requiredFields.filter(field => body[field] === undefined || String(body[field]).trim() === '');
        if (missingFields.length > 0) {
            debugInfo.errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
             return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        if (typeof body.provider_name !== 'string' || typeof body.provider_model_id !== 'string' || typeof body.display_name !== 'string' || typeof body.model_type !== 'string') {
             debugInfo.errorMessage = `Invalid data types for required fields.`;
             return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
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

        // --- Validasi Config & User Admin ---
        if (!debugInfo.expectedAdminEmail) {
            debugInfo.errorMessage = 'Server configuration error: Admin email missing.';
            console.error('API Route Error:', debugInfo.errorMessage);
             return { error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        debugInfo.step = 'Validating current user';
        const currentUser = await serverSupabaseUser(event);
        debugInfo.serverUserEmail = currentUser?.email || null;
        if (!currentUser || currentUser.email !== debugInfo.expectedAdminEmail) {
            debugInfo.errorMessage = `Access Denied. User: ${debugInfo.serverUserEmail || 'unauthenticated'}`;
            console.warn('API Route:', debugInfo.errorMessage);
             return { error: createError({ statusCode: 403, statusMessage: 'Forbidden' }).toJSON(), debug: debugInfo };
        }
        debugInfo.accessGranted = true;
        // --- Akhir Validasi Admin ---

        debugInfo.step = 'Getting server Supabase client';
        const client = await serverSupabaseClient(event);
         if (!client) {
             debugInfo.errorMessage = 'Failed to initialize Supabase server client.';
             console.error('API Route Error:', debugInfo.errorMessage);
             return { error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }

        // Cari Provider ID berdasarkan nama
        debugInfo.step = `Looking up provider ID for name: "${body.provider_name}"`;
        const providerName = body.provider_name.trim();
        const { data: providerData, error: providerError } = await client
            .from('api_providers')
            .select('id')
            .ilike('name', providerName) // Case-insensitive match
            .maybeSingle();

        if (providerError) {
            debugInfo.errorMessage = `Error looking up provider: ${providerError.message}`;
            console.error('API Route Error:', debugInfo.errorMessage, providerError);
             return { error: createError({ statusCode: 500, statusMessage: 'Error checking provider.' }).toJSON(), debug: debugInfo };
        }
        if (!providerData) {
            debugInfo.errorMessage = `Provider with name "${providerName}" not found. Please ensure the provider exists and the name is correct.`;
             console.warn('API Route Warning:', debugInfo.errorMessage);
             // Return 400 Bad Request
             return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        const providerId = providerData.id;
        debugInfo.foundProviderId = providerId;
        debugInfo.step = `Found provider ID: ${providerId}`;

        debugInfo.step = 'Inserting new model into database';
        const modelToInsert = {
            provider_id: providerId, // Gunakan ID yang ditemukan
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

        const { data: newModelData, error: insertError } = await client
            .from('marketplace_models')
            .insert(modelToInsert)
            .select('id')
            .single();

        if (insertError || !newModelData) {
            debugInfo.step = 'Error: Failed inserting model';
            debugInfo.errorMessage = `Failed to insert new model: ${insertError?.message || 'No data returned after insert.'}`;
            console.error('API Route Error:', debugInfo.errorMessage, insertError);
            if (insertError?.code === '23505') { // Unique violation
                 debugInfo.errorMessage = `Gagal menambahkan model: ID Model Penyedia "${body.provider_model_id}" sudah ada untuk penyedia ini.`;
                 return { error: createError({ statusCode: 409, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo }; // 409 Conflict
            }
            return { error: createError({ statusCode: 500, statusMessage: 'Failed to save model data.' }).toJSON(), debug: debugInfo };
        }

        debugInfo.step = `Completed: Model added successfully with ID ${newModelData.id}.`;
        return { success: true, message: `Model "${modelToInsert.display_name}" berhasil ditambahkan.`, newModelId: newModelData.id, debug: debugInfo };

    } catch (error: any) {
         debugInfo.step = 'Error: Unhandled exception';
         debugInfo.errorMessage = error.message || 'Internal Server Error in API route.';
         console.error('API Route Unhandled Error:', error);
         const h3Error = createError({ statusCode: error.statusCode || 500, statusMessage: debugInfo.errorMessage, data: error.data });
         return { error: h3Error.toJSON(), debug: debugInfo };
    }
});