// server/api/admin/users/[id].patch.ts
import { serverSupabaseUser } from '#supabase/server';
// *** Ensure this import is present ***
import { createClient } from '@supabase/supabase-js';
import { createError, defineEventHandler, H3Event, readBody } from 'h3';
import { useRuntimeConfig } from '#imports';

// Interface for data received in the body
interface UpdateProfilePayload {
  full_name?: string | null;
  // Add other fields from 'profiles' that the admin can update here
  // current_organization_id?: number | null; // Example if updating organization
}

// Simple interface for success response
interface SuccessResponse {
  success: boolean;
  message: string;
}

export default defineEventHandler(async (event: H3Event): Promise<SuccessResponse | any> => {
    // Extract the user ID from the URL parameters
    const userIdToUpdate = event.context.params?.id;

    // Ensure User ID is present
    if (!userIdToUpdate) {
        console.error('API Patch Error: Missing User ID in request path.');
        throw createError({ statusCode: 400, statusMessage: 'User ID is required in the URL path.' });
    }

    try {
        // Read runtime configuration (server-side and public)
        const config = useRuntimeConfig(event);
        const adminEmail = config.public.adminEmail;
        const serviceKey = config.supabaseServiceKey; // Server-side only key
        const supabaseUrl = config.public.supabase.url; // Public Supabase URL

        // Validate essential server configuration
        if (!serviceKey || !supabaseUrl || !adminEmail) {
             console.error('API Patch Error: Server configuration missing (Service Key, URL, or Admin Email)');
             throw createError({ statusCode: 500, statusMessage: 'Server configuration error. Check environment variables.' });
        }

        // Validate that the user making the request is the designated admin
        const currentUser = await serverSupabaseUser(event);
        if (!currentUser || currentUser.email !== adminEmail) {
            console.warn(`API Patch Warning: Access Denied for user ${currentUser?.email || 'unauthenticated'}. Expected admin: ${adminEmail}`);
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required.' });
        }

        // Read the payload (data to update) from the request body
        const body = await readBody<UpdateProfilePayload>(event);

        // Validate the payload: ensure there's data and it's of the correct type
        if (!body || Object.keys(body).length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'No data provided for update in request body.' });
        }
        // Example basic type validation for full_name (expand as needed)
        if (body.full_name !== undefined && typeof body.full_name !== 'string' && body.full_name !== null) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid data type for full_name. Must be a string or null.' });
        }

        // *** Create the Supabase Admin Client using the Service Key ***
        // This client bypasses RLS rules.
        const adminClient = createClient(supabaseUrl, serviceKey, {
             auth: {
                autoRefreshToken: false, // No need to refresh tokens for service key
                persistSession: false    // Don't persist sessions on the server
             }
        });

        console.log(`API Patch: Admin ${currentUser.email} attempting to update profile for user ${userIdToUpdate} with data:`, body);

        // Prepare the data object specifically for the Supabase update operation
        const dataToUpdate: Partial<UpdateProfilePayload> = {}; // Use Partial for flexibility
        if (body.full_name !== undefined) {
             // Trim whitespace and set to null if the result is empty, assuming DB allows null
             dataToUpdate.full_name = body.full_name?.trim() || null;
        }
        // Add assignments for other updatable fields from 'profiles' here
        // if (body.some_other_field !== undefined) {
        //     dataToUpdate.some_other_field = body.some_other_field;
        // }

        // Ensure there's actually something to update after processing
        if (Object.keys(dataToUpdate).length === 0) {
             throw createError({ statusCode: 400, statusMessage: 'No valid fields provided for update.' });
        }


        // *** Perform the update on the 'profiles' table in the 'public' schema ***
        const { error: updateError } = await adminClient
            .from('profiles') // Assumes table 'profiles' exists in 'public' schema
            .update(dataToUpdate)
            .eq('user_id', userIdToUpdate); // Target the profile row matching the user's ID

        // Check for errors during the database update operation
        if (updateError) {
            console.error(`API Patch Error: Failed to update profile for user ${userIdToUpdate}:`, updateError);
            // Provide a more specific error message based on the known cache issue
            if (updateError.message.includes("schema cache")) {
                 throw createError({ statusCode: 500, statusMessage: `Failed to update profile: Could not find the table 'public.profiles' in the schema cache. Please ensure the table exists and try reloading the schema in Supabase SQL Editor (NOTIFY pgrst, 'reload schema').` });
            }
            // Generic error for other database issues
            throw createError({ statusCode: 500, statusMessage: `Failed to update profile: ${updateError.message}` });
        }

        // If successful
        console.log(`API Patch: Successfully updated profile for user ${userIdToUpdate}`);
        return { success: true, message: `User profile ${userIdToUpdate} updated successfully.` };

    } catch (error: any) {
        // Catch errors thrown by createError or any unexpected exceptions
        console.error('API Patch Unhandled Error:', error);
        // If it's already an H3 error (like from createError), re-throw it
        if (error.statusCode) {
            throw error;
        }
        // Otherwise, wrap it in a generic 500 error
        throw createError({ statusCode: 500, statusMessage: error.message || 'Internal Server Error occurred during profile update.' });
    }
});