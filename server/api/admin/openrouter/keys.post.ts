// server/api/admin/openrouter/keys.post.ts
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { createError, defineEventHandler, H3Event, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { $fetch } from 'ofetch'

// Interface NewOpenRouterKeyBody
interface NewOpenRouterKeyBody {
    name: string;
    limit?: number | null;
}

// Interface OpenRouterKey (simplified)
interface OpenRouterKey {
    hash: string; label: string; name: string; limit: number | null; created_at: string;
}

// Interface DebugInfo, ApiSuccessResponse, ApiErrorResponse
interface DebugInfo { invoked: boolean; step?: string; adminUser?: string | null; requestBody?: any; openRouterUrl?: string; openRouterResponseStatus?: number; errorMessage?: string; providerIdUsed?: number | string; }
interface ApiSuccessResponse { success: true; message: string; newKeyData: OpenRouterKey; debug: DebugInfo; }
interface ApiErrorResponse { error: { statusCode: number; statusMessage: string; data?: any }; debug: DebugInfo; }

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1/keys';
const OPENROUTER_PROVIDER_ID = 1; // Sesuaikan jika ID OpenRouter di DB berbeda

export default defineEventHandler(async (event: H3Event): Promise<ApiSuccessResponse | ApiErrorResponse> => {
    const debugInfo: DebugInfo = {
        invoked: true, step: 'Initializing OpenRouter Key POST', adminUser: null, requestBody: null,
        openRouterUrl: OPENROUTER_API_BASE, providerIdUsed: OPENROUTER_PROVIDER_ID,
    };

    try {
        // 1. --- Validate Admin User ---
        debugInfo.step = 'Validating admin user';
        const config = useRuntimeConfig(event);
        const adminEmail = config.public.adminEmail;
        if (!adminEmail) {
             debugInfo.errorMessage = 'Admin email configuration missing.';
             console.error('API Error:', debugInfo.errorMessage);
             return { error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        const currentUser = await serverSupabaseUser(event);
        debugInfo.adminUser = currentUser?.email || 'N/A';
        if (!currentUser || currentUser.email !== adminEmail) {
            debugInfo.errorMessage = 'Forbidden access.';
             console.warn('API Warning:', debugInfo.errorMessage);
             return { error: createError({ statusCode: 403, statusMessage: 'Forbidden' }).toJSON(), debug: debugInfo };
        }

        // 2. --- Read and Validate Request Body ---
        debugInfo.step = 'Reading request body';
        const body = await readBody(event) as NewOpenRouterKeyBody;
        debugInfo.requestBody = body;
        if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
            debugInfo.errorMessage = 'Key name is required.';
            return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        if (body.limit !== undefined && body.limit !== null && (typeof body.limit !== 'number' || body.limit < 0)) {
            debugInfo.errorMessage = 'Limit must be a non-negative number (USD cents) or null/undefined.';
            return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }

        // 3. --- Get OpenRouter Provisioning Key (from runtimeConfig) ---
        debugInfo.step = 'Retrieving OpenRouter Provisioning Key from server config';
        const provisioningApiKey = config.openrouterProvisioningKey;
        if (!provisioningApiKey) {
            debugInfo.errorMessage = 'OpenRouter Provisioning API Key is not configured on the server (runtimeConfig.openrouterProvisioningKey).';
             console.error('API Error:', debugInfo.errorMessage);
             return { error: createError({ statusCode: 500, statusMessage: 'Server configuration error.' }).toJSON(), debug: debugInfo };
        }

        // 4. --- Call OpenRouter API to Create Key ---
        debugInfo.step = 'Calling OpenRouter API to create key';
        const requestPayload: { name: string; limit?: number | null } = {
            name: body.name.trim(),
        };
        // Hanya kirim limit jika nilainya valid (bukan null/undefined dan >= 0)
        if (body.limit !== undefined && body.limit !== null && body.limit >= 0) {
            requestPayload.limit = body.limit;
        }

        try {
            const openRouterResponse = await $fetch<{ data: OpenRouterKey }>(OPENROUTER_API_BASE, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${provisioningApiKey}`, 'Content-Type': 'application/json' },
                body: requestPayload,
            });

             debugInfo.openRouterResponseStatus = 200; // $fetch throws on non-2xx

            if (!openRouterResponse?.data?.hash) {
                throw new Error('Invalid response structure received from OpenRouter.');
            }

            debugInfo.step = 'Key created successfully on OpenRouter';
            return {
                success: true,
                message: `OpenRouter key "${openRouterResponse.data.name}" created successfully.`,
                newKeyData: openRouterResponse.data,
                debug: debugInfo,
            };

        } catch (orError: any) {
            debugInfo.step = 'Error calling OpenRouter API';
            const status = orError.response?.status || orError.statusCode || 500;
            const message = orError.data?.error?.message || orError.statusMessage || orError.message || 'Unknown OpenRouter API error';
            debugInfo.openRouterResponseStatus = status;
            debugInfo.errorMessage = `OpenRouter API error (${status}): ${message}`;
            console.error('OpenRouter API Error Details:', orError.data || orError);

            let userFriendlyMessage = 'Failed to create key on OpenRouter.';
            if (status === 401) userFriendlyMessage = 'Gagal membuat key: Kunci Provisioning API OpenRouter tidak valid atau tidak diatur.';
            else if (status === 400) userFriendlyMessage = `Gagal membuat key: Permintaan tidak valid (${message}).`;
            else userFriendlyMessage = `Gagal membuat key: Terjadi masalah komunikasi dengan OpenRouter (${status}).`;

            return {
                error: createError({ statusCode: status === 401 ? 401 : 502, statusMessage: userFriendlyMessage, data: orError.data }).toJSON(),
                debug: debugInfo
            };
        }

    } catch (error: any) {
        debugInfo.step = 'Error: Unhandled exception';
        debugInfo.errorMessage = error.message || 'Internal Server Error';
        console.error('API Route Unhandled Error:', error);
        return {
             error: createError({ statusCode: 500, statusMessage: 'Internal Server Error' }).toJSON(),
             debug: debugInfo
         };
    }
});