// server/api/admin/marketplace.get.ts
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { createError, defineEventHandler, H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'

// Tipe data berdasarkan skema DB (Rancangan DB Cortex Deploy.pdf) 
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
    provider_cost_per_million_input: string; // Tipe DECIMAL di DB sering dibaca sebagai string
    provider_cost_per_million_output: string;
    selling_price_per_million_input: string;
    selling_price_per_million_output: string;
    is_available: boolean;
    api_providers: ApiProvider | null; // Untuk menyimpan hasil join
}

// Tipe DebugInfo dan ApiErrorResponse bisa disalin dari users.get.ts atau dibuat ulang
interface DebugInfo {
    invoked: boolean;
    expectedAdminEmail?: string | null;
    serverUserEmail?: string | null;
    accessGranted?: boolean;
    errorMessage?: string;
    step?: string;
}

interface ApiResponse {
    models: MarketplaceModel[];
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
        debugInfo.step = 'Reading runtime config';
        const config = useRuntimeConfig(event);
        debugInfo.expectedAdminEmail = config.public.adminEmail || null;

        // Cek admin email
        if (!debugInfo.expectedAdminEmail) {
            debugInfo.step = 'Error: Admin email missing';
            debugInfo.errorMessage = 'Server configuration error: Admin email missing.';
            console.error('API Route Error:', debugInfo.errorMessage);
            return {
                error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                debug: debugInfo
            };
        }

        debugInfo.step = 'Validating current user';
        const currentUser = await serverSupabaseUser(event);
        debugInfo.serverUserEmail = currentUser?.email || null;

        // Validasi user admin
        if (!currentUser || currentUser.email !== debugInfo.expectedAdminEmail) {
            debugInfo.step = 'Error: Access denied';
            debugInfo.errorMessage = `Access Denied. User: ${debugInfo.serverUserEmail || 'unauthenticated'}`;
            console.warn('API Route:', debugInfo.errorMessage);
            return {
                error: createError({ statusCode: 403, statusMessage: 'Forbidden' }).toJSON(),
                debug: debugInfo
            };
        }
        debugInfo.accessGranted = true;

        // Gunakan client server Supabase (yang menggunakan service_key secara internal)
        debugInfo.step = 'Getting server Supabase client';
        const client = await serverSupabaseClient(event);

        if (!client) {
             debugInfo.step = 'Error: Failed to get Supabase client';
             debugInfo.errorMessage = 'Failed to initialize Supabase server client.';
             console.error('API Route Error:', debugInfo.errorMessage);
             return {
                 error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                 debug: debugInfo
             };
        }

        debugInfo.step = 'Fetching marketplace models with provider name';
        // Ambil data model dan join dengan nama provider
        const { data: models, error: fetchError } = await client
            .from('marketplace_models')
            .select(`
                *,
                api_providers ( id, name )
            `)
            .order('provider_id', { ascending: true })
            .order('display_name', { ascending: true });


        if (fetchError) {
            debugInfo.step = 'Error: Failed fetching models';
            debugInfo.errorMessage = `Failed to fetch marketplace models: ${fetchError.message}`;
            console.error('API Route Error:', debugInfo.errorMessage, fetchError);
            return {
                error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
                debug: debugInfo
            };
        }

        debugInfo.step = `Completed: Successfully fetched ${models?.length || 0} models.`;
        console.log(`API Route: Successfully fetched ${models?.length || 0} marketplace models.`);

        return {
            models: models || [],
            debug: debugInfo
        };

    } catch (error: any) {
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