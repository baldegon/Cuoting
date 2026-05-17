import { defineMiddleware } from 'astro:middleware';
import { getSupabaseServerClient } from './lib/supabase';

export const onRequest = defineMiddleware(async ({ locals, cookies, request }, next) => {
	const supabase = getSupabaseServerClient(cookies, request);
	const {
		data: { user }
	} = await supabase.auth.getUser();
	const {
		data: { session }
	} = await supabase.auth.getSession();

	locals.supabase = supabase;
	locals.session = session;
	locals.user = user ?? null;

	return next();
});
