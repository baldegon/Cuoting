import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
	if (!locals.user) {
		return redirect('/login');
	}

	const formData = await request.formData();
	const installmentId = String(formData.get('installment_id') ?? '').trim();

	if (!installmentId) {
		return redirect('/dashboard?installment_error=Cuota+inv%C3%A1lida');
	}

	const supabase = getSupabaseServerClient(cookies, request);
	const { data: installment, error: installmentError } = await supabase
		.from('installments')
		.select(
			'id, status, paid_at, installment_plans!inner(purchase_allocations!inner(purchases!inner(user_id)))'
		)
		.eq('id', installmentId)
		.eq('installment_plans.purchase_allocations.purchases.user_id', locals.user.id)
		.single();

	if (installmentError || !installment) {
		return redirect('/dashboard?installment_error=No+se+encontr%C3%B3+la+cuota');
	}

	if (installment.status === 'paid') {
		return redirect('/dashboard?installment_success=1');
	}

	const { data: updatedInstallment, error: updateError } = await supabase
		.from('installments')
		.update({
			status: 'paid',
			paid_at: installment.paid_at ?? new Date().toISOString()
		})
		.eq('id', installmentId)
		.eq('status', 'pending')
		.select('id, status')
		.maybeSingle();

	if (updateError) {
		return redirect('/dashboard?installment_error=No+se+pudo+marcar+la+cuota');
	}

	if (!updatedInstallment) {
		const { data: currentInstallment } = await supabase
			.from('installments')
			.select('status')
			.eq('id', installmentId)
			.maybeSingle();

		if (currentInstallment?.status === 'paid') {
			return redirect('/dashboard?installment_success=1');
		}

		return redirect('/dashboard?installment_error=No+se+pudo+marcar+la+cuota');
	}

	return redirect('/dashboard?installment_success=1');
};
