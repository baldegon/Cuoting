import { defineMiddleware } from 'astro:middleware';
import { getSupabaseServerClient } from './lib/supabase';

export const onRequest = defineMiddleware(async ({ locals, cookies }, next) => {
	const supabase = getSupabaseServerClient(cookies);
	const {
		data: { session }
	} = await supabase.auth.getSession();

	locals.session = session;
	locals.user = session?.user ?? null;

	return next();
});
