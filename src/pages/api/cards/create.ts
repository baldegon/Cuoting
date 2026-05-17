import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase';

const toDay = (value: FormDataEntryValue | null) => Number.parseInt(String(value ?? ''), 10);

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
	if (!locals.user) {
		return redirect('/login');
	}

	const formData = await request.formData();
	const payload = {
		user_id: locals.user.id,
		visible_name: String(formData.get('visible_name') ?? '').trim(),
		brand: String(formData.get('brand') ?? '').trim(),
		issuer_bank: String(formData.get('issuer_bank') ?? '').trim(),
		closing_day: toDay(formData.get('closing_day')),
		due_day: toDay(formData.get('due_day'))
	};

	if (
		!payload.visible_name ||
		!payload.brand ||
		!payload.issuer_bank ||
		payload.closing_day < 1 ||
		payload.closing_day > 31 ||
		payload.due_day < 1 ||
		payload.due_day > 31
	) {
		return redirect('/dashboard?card_error=Datos+de+tarjeta+inválidos');
	}

	const supabase = getSupabaseServerClient(cookies, request);
	const { error } = await supabase.from('cards').insert(payload);

	if (error) {
		return redirect('/dashboard?card_error=No+se+pudo+crear+la+tarjeta');
	}

	return redirect('/dashboard?card_success=1');
};
