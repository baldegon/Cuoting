import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const supabase = getSupabaseServerClient(cookies, request);
	await supabase.auth.signOut();

	return redirect('/login');
};
