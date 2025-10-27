// server/api/admin/marketplace.get.ts
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { createError, defineEventHandler, H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'

// --- Interface (ApiProvider, MarketplaceModel, DebugInfo, ApiErrorResponse tetap sama) ---
interface ApiProvider {
    id: number;
    name: string;
}

interface MarketplaceModel {
    id: number;
    provider_id: number;
    provider_model_id: string;
    display_name: string;
    model_type: string;
    context_window: number | null;
    provider_cost_per_million_input: string;
    provider_cost_per_million_output: string;
    selling_price_per_million_input: string;
    selling_price_per_million_output: string;
    is_available: boolean;
    api_providers: Pick<ApiProvider, 'id' | 'name'> | null; // Cukup ID dan Nama provider
}

interface DebugInfo {
    invoked: boolean;
    expectedAdminEmail?: string | null;
    serverUserEmail?: string | null;
    accessGranted?: boolean;
    errorMessage?: string;
    step?: string;
}

// ✅ Perbarui ApiResponse untuk menyertakan providers
interface ApiResponse {
    models: MarketplaceModel[];
    providers: ApiProvider[]; // <-- Tambahkan ini
    debug: DebugInfo;
}

interface ApiErrorResponse {
    error: {
      statusCode: number;
      statusMessage: string;
      data?: any;
    };
    debug: DebugInfo;
}


export default defineEventHandler(async (event: H3Event): Promise<ApiResponse | ApiErrorResponse> => {
    const debugInfo: DebugInfo = {
        invoked: true,
        expectedAdminEmail: null,
        serverUserEmail: null,
        accessGranted: false,
        errorMessage: undefined,
        step: 'Initializing Marketplace GET',
    };

    try {
        // --- Validasi Config & User (Sama seperti sebelumnya) ---
        debugInfo.step = 'Reading runtime config';
        const config = useRuntimeConfig(event);
        debugInfo.expectedAdminEmail = config.public.adminEmail || null;
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
        // --- Akhir Validasi ---

        debugInfo.step = 'Getting server Supabase client';
        const client = await serverSupabaseClient(event);
        if (!client) {
            debugInfo.errorMessage = 'Failed to initialize Supabase server client.';
             console.error('API Route Error:', debugInfo.errorMessage);
             return { error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }

        // ✅ Jalankan fetch models dan providers secara paralel
        debugInfo.step = 'Fetching marketplace models and providers';
        const [modelsResult, providersResult] = await Promise.all([
            client
                .from('marketplace_models')
                .select(`
                    *,
                    api_providers ( id, name )
                `)
                .order('provider_id', { ascending: true })
                .order('display_name', { ascending: true }),
            client
                .from('api_providers')
                .select('id, name') // Ambil hanya ID dan nama
                .eq('is_active', true) // Hanya provider aktif
                .order('name', { ascending: true })
        ]);

        // Handle error fetch models
        if (modelsResult.error) {
            debugInfo.step = 'Error: Failed fetching models';
            debugInfo.errorMessage = `Failed to fetch marketplace models: ${modelsResult.error.message}`;
            console.error('API Route Error:', debugInfo.errorMessage, modelsResult.error);
            return {
                error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                debug: debugInfo
            };
        }

        // Handle error fetch providers
        if (providersResult.error) {
             debugInfo.step = 'Error: Failed fetching providers';
             debugInfo.errorMessage = `Failed to fetch API providers: ${providersResult.error.message}`;
             console.error('API Route Error:', debugInfo.errorMessage, providersResult.error);
             return {
                 error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                 debug: debugInfo
             };
        }


        debugInfo.step = `Completed: Fetched ${modelsResult.data?.length || 0} models and ${providersResult.data?.length || 0} providers.`;
        console.log(`API Route: Successfully fetched ${modelsResult.data?.length || 0} models and ${providersResult.data?.length || 0} providers.`);

        return {
            models: modelsResult.data || [],
            providers: providersResult.data || [], // <-- Sertakan providers di response
            debug: debugInfo
        };

    } catch (error: any) {
        // --- Error Handling (Sama seperti sebelumnya) ---
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