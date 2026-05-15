import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Missing Supabase env vars: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY');
}

export const getSupabaseBrowserClient = () => createClient(supabaseUrl, supabaseAnonKey);

export const getSupabaseServerClient = (cookies: AstroCookies) =>
	createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return cookies
					.headers()
					.get('cookie')
					?.split(';')
					.map((cookie) => {
						const [name, ...rest] = cookie.trim().split('=');
						return { name, value: rest.join('=') };
					})
					.filter((cookie) => cookie.name && cookie.value) ?? [];
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, options);
				});
			}
		}
	});
