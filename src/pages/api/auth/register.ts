import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase';

const registerErrorRedirect = (message: string) => `/register?error=${encodeURIComponent(message)}`;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const formData = await request.formData();
	const email = String(formData.get('email') ?? '').trim();
	const password = String(formData.get('password') ?? '');
	const confirmPassword = String(formData.get('confirmPassword') ?? '');

	if (!email || !password || !confirmPassword) {
		return redirect(registerErrorRedirect('Completá todos los campos'));
	}

	if (password.length < 8) {
		return redirect(registerErrorRedirect('La contraseña debe tener al menos 8 caracteres'));
	}

	if (password !== confirmPassword) {
		return redirect(registerErrorRedirect('Las contraseñas no coinciden'));
	}

	const supabase = getSupabaseServerClient(cookies, request);
	const { data, error } = await supabase.auth.signUp({ email, password });

	if (error) {
		return redirect(registerErrorRedirect('No se pudo crear la cuenta'));
	}

	if (!data.session) {
		return redirect('/login?success=Revisá+tu+email+para+confirmar+la+cuenta+y+después+ingresá');
	}

	return redirect('/dashboard');
};
