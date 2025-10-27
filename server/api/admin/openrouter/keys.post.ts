// server/api/admin/openrouter/keys.post.ts
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { createError, defineEventHandler, H3Event, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { $fetch } from 'ofetch' // Use ofetch for making external API calls

// Interface for the expected request body
interface NewOpenRouterKeyBody {
    name: string;
    limit?: number | null; // Optional credit limit in USD cents
}

// Interface for successful OpenRouter API response (simplified)
interface OpenRouterKey {
    hash: string;
    label: string;
    name: string;
    limit: number | null;
    created_at: string;
    // Add other fields if needed
}

// Interfaces for our API response
interface DebugInfo {
    invoked: boolean;
    step?: string;
    adminUser?: string | null;
    requestBody?: any;
    openRouterUrl?: string;
    openRouterResponseStatus?: number;
    errorMessage?: string;
    providerIdUsed?: number | string; // To track which provider's key was used
}

interface ApiSuccessResponse {
    success: true;
    message: string;
    newKeyData: OpenRouterKey; // Return the created key info
    debug: DebugInfo;
}

interface ApiErrorResponse {
    error: { statusCode: number; statusMessage: string; data?: any };
    debug: DebugInfo;
}

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1/keys';
// Define a constant or fetch dynamically if you have multiple providers
const OPENROUTER_PROVIDER_ID = 1; // << Adjust this based on your api_providers table ID for OpenRouter

export default defineEventHandler(async (event: H3Event): Promise<ApiSuccessResponse | ApiErrorResponse> => {
    const debugInfo: DebugInfo = {
        invoked: true,
        step: 'Initializing OpenRouter Key POST',
        adminUser: null,
        requestBody: null,
        openRouterUrl: OPENROUTER_API_BASE,
        providerIdUsed: OPENROUTER_PROVIDER_ID,
    };

    try {
        // 1. --- Read Config and Validate Admin User ---
        debugInfo.step = 'Validating admin user';
        const config = useRuntimeConfig(event);
        const adminEmail = config.public.adminEmail;
        if (!adminEmail) { /* ... error handling ... */
             debugInfo.errorMessage = 'Admin email configuration missing.';
             return { error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }
        const currentUser = await serverSupabaseUser(event);
        debugInfo.adminUser = currentUser?.email || 'N/A';
        if (!currentUser || currentUser.email !== adminEmail) { /* ... error handling ... */
            debugInfo.errorMessage = 'Forbidden access.';
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
        if (body.limit !== undefined && body.limit !== null && typeof body.limit !== 'number') {
            debugInfo.errorMessage = 'Limit must be a number (USD cents) or null/undefined.';
            return { error: createError({ statusCode: 400, statusMessage: debugInfo.errorMessage }).toJSON(), debug: debugInfo };
        }

        // 3. --- Get OpenRouter Provisioning Key (Securely) ---
        //    **IMPORTANT:** This assumes 'api_key_encrypted' for the OpenRouter provider IS the Provisioning Key.
        //    Adjust the logic if you store it differently (e.g., in runtimeConfig or another table).
        //    Decryption logic is needed here if it's actually encrypted. For now, we assume it's stored plain in env or config for simplicity.
        debugInfo.step = 'Retrieving OpenRouter Provisioning Key';
        const provisioningApiKey = config.openrouterProvisioningKey; // Fetch from runtimeConfig (server-side only)

        // OR Fetch from DB (requires decryption if stored encrypted):
        /*
        const client = await serverSupabaseClient(event);
        if (!client) { throw createError({ statusCode: 500, statusMessage: 'Failed to get Supabase client' }); }
        const { data: providerData, error: providerError } = await client
            .from('api_providers')
            .select('api_key_encrypted') // Assuming this holds the provisioning key
            .eq('id', OPENROUTER_PROVIDER_ID)
            .maybeSingle();

        if (providerError || !providerData?.api_key_encrypted) {
            debugInfo.errorMessage = `OpenRouter provisioning key not found or error fetching provider: ${providerError?.message || 'Not Found'}`;
            console.error('API Error:', debugInfo.errorMessage);
            return { error: createError({ statusCode: 500, statusMessage: 'Server configuration error.' }).toJSON(), debug: debugInfo };
        }
        // !!! Add decryption logic here if needed !!!
        const provisioningApiKey = providerData.api_key_encrypted; // Replace with decrypted key
        */

        if (!provisioningApiKey) {
            debugInfo.errorMessage = 'OpenRouter Provisioning API Key is not configured on the server.';
             console.error('API Error:', debugInfo.errorMessage);
             return { error: createError({ statusCode: 500, statusMessage: 'Server configuration error.' }).toJSON(), debug: debugInfo };
        }


        // 4. --- Call OpenRouter API to Create Key ---
        debugInfo.step = 'Calling OpenRouter API to create key';
        const requestPayload: { name: string; limit?: number | null } = {
            name: body.name.trim(),
        };
        if (body.limit !== undefined) {
            requestPayload.limit = body.limit;
        }

        try {
            const openRouterResponse = await $fetch<{ data: OpenRouterKey }>(OPENROUTER_API_BASE, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${provisioningApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: requestPayload,
            });

             debugInfo.openRouterResponseStatus = 200; // Assume success if no error thrown by $fetch

            // Ensure response has the expected structure
            if (!openRouterResponse || !openRouterResponse.data || !openRouterResponse.data.hash) {
                throw new Error('Invalid response structure received from OpenRouter.');
            }

            debugInfo.step = 'Key created successfully on OpenRouter';
            return {
                success: true,
                message: `OpenRouter key "${openRouterResponse.data.name}" created successfully.`,
                newKeyData: openRouterResponse.data, // Return key details
                debug: debugInfo,
            };

        } catch (orError: any) {
            debugInfo.step = 'Error calling OpenRouter API';
            debugInfo.openRouterResponseStatus = orError.response?.status || 500;
            debugInfo.errorMessage = `OpenRouter API error (${debugInfo.openRouterResponseStatus}): ${orError.data?.error?.message || orError.message}`;
            console.error('OpenRouter API Error:', orError.data || orError);
            return {
                error: createError({
                    statusCode: debugInfo.openRouterResponseStatus === 401 ? 401 : 502, // 401 Unauthorized, 502 Bad Gateway otherwise
                    statusMessage: `Failed to create key on OpenRouter: ${orError.data?.error?.message || 'Communication error'}`,
                    data: orError.data // Forward OpenRouter error details if available
                }).toJSON(),
                debug: debugInfo
            };
        }

    } catch (error: any) {
        // --- General Error Handling (Same as before) ---
        debugInfo.step = 'Error: Unhandled exception';
        debugInfo.errorMessage = error.message || 'Internal Server Error';
        console.error('API Route Unhandled Error:', error);
        return {
             error: createError({ statusCode: 500, statusMessage: debugInfo.errorMessage }).toJSON(),
             debug: debugInfo
         };
    }
});