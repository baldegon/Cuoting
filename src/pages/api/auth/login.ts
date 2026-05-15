import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const formData = await request.formData();
	const email = String(formData.get('email') ?? '');
	const password = String(formData.get('password') ?? '');

	if (!email || !password) {
		return redirect('/login?error=Completa+email+y+contraseña');
	}

	const supabase = getSupabaseServerClient(cookies);
	const { error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		return redirect(`/login?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/dashboard');
};
