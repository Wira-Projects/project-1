// server/api/admin/marketplace/[id].patch.ts
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { createError, defineEventHandler, H3Event, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'

// Interface DebugInfo, ApiSuccessResponse, ApiErrorResponse
interface DebugInfo { invoked: boolean; expectedAdminEmail?: string | null; serverUserEmail?: string | null; accessGranted?: boolean; errorMessage?: string; step?: string; modelId?: number | string | null; newAvailability?: boolean | null;}
interface ApiSuccessResponse { success: boolean; message: string; debug: DebugInfo; }
interface ApiErrorResponse { error: { statusCode: number; statusMessage: string; data?: any }; debug: DebugInfo; }

export default defineEventHandler(async (event: H3Event): Promise<ApiSuccessResponse | ApiErrorResponse> => {
    const modelId = event.context.params?.id;
    const debugInfo: DebugInfo = {
        invoked: true, expectedAdminEmail: null, serverUserEmail: null, accessGranted: false,
        errorMessage: undefined, step: 'Initializing Marketplace PATCH', modelId: modelId, newAvailability: null,
    };

    if (!modelId) {
        debugInfo.step = 'Error: Missing model ID';
        debugInfo.errorMessage = 'Model ID is required in the URL path.';
        return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
    }

    try {
        debugInfo.step = 'Reading runtime config & body';
        const config = useRuntimeConfig(event);
        debugInfo.expectedAdminEmail = config.public.adminEmail || null;
        const body = await readBody(event);
        const isAvailable = body.is_available;

        if (typeof isAvailable !== 'boolean') {
             debugInfo.step = 'Error: Invalid body payload';
             debugInfo.errorMessage = 'Request body must contain an "is_available" boolean field.';
             return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        debugInfo.newAvailability = isAvailable;

        // --- Validasi Config & User Admin ---
        if (!debugInfo.expectedAdminEmail) {
             debugInfo.step = 'Error: Admin email missing';
             debugInfo.errorMessage = 'Server configuration error: Admin email missing.';
             return { error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        debugInfo.step = 'Validating current user';
        const currentUser = await serverSupabaseUser(event);
        debugInfo.serverUserEmail = currentUser?.email || null;
        if (!currentUser || currentUser.email !== debugInfo.expectedAdminEmail) {
             debugInfo.step = 'Error: Access denied';
             debugInfo.errorMessage = `Access Denied. User: ${debugInfo.serverUserEmail || 'unauthenticated'}`;
             return { error: createError({ statusCode: 403, statusMessage: 'Forbidden' }).toJSON(), debug: debugInfo };
        }
        debugInfo.accessGranted = true;
        // --- Akhir Validasi Admin ---

        debugInfo.step = 'Getting server Supabase client';
        const client = await serverSupabaseClient(event);
         if (!client) {
             debugInfo.step = 'Error: Failed to get Supabase client';
             debugInfo.errorMessage = 'Failed to initialize Supabase server client.';
             return { error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }

        debugInfo.step = `Updating model ${modelId} availability to ${isAvailable}`;
        const { error: updateError } = await client
            .from('marketplace_models')
            .update({ is_available: isAvailable })
            .eq('id', modelId);

        if (updateError) {
            debugInfo.step = 'Error: Failed updating model';
            debugInfo.errorMessage = `Failed to update model availability: ${updateError.message}`;
            console.error('API Route Error:', debugInfo.errorMessage, updateError);
            return { error: createError({ statusCode: 500, statusMessage: 'Failed to update model.' }).toJSON(), debug: debugInfo };
        }

        debugInfo.step = 'Completed: Model availability updated successfully.';
        return { success: true, message: `Model ${modelId} availability updated successfully.`, debug: debugInfo };

    } catch (error: any) {
        debugInfo.step = 'Error: Unhandled exception';
        debugInfo.errorMessage = error.message || 'Internal Server Error in API route.';
        console.error('API Route Unhandled Error:', error);
        const h3Error = createError({ statusCode: error.statusCode || 500, statusMessage: debugInfo.errorMessage, data: error.data });
        return { error: h3Error.toJSON(), debug: debugInfo };
    }
});