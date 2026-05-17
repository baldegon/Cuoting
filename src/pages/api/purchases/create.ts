import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
	if (!locals.user) {
		return redirect('/login');
	}

	const formData = await request.formData();
	const name = String(formData.get('name') ?? '').trim();
	const purchaseDate = String(formData.get('purchase_date') ?? '').trim();
	const totalAmount = round2(Number.parseFloat(String(formData.get('total_amount') ?? '0')));
	const installmentsCount = Number.parseInt(String(formData.get('installments_count') ?? '0'), 10);
	const cardIds = formData
		.getAll('allocation_card_id')
		.map((entry) => String(entry).trim())
		.filter(Boolean);
	const allocationAmounts = formData
		.getAll('allocation_amount')
		.map((entry) => round2(Number.parseFloat(String(entry ?? '0'))));

	if (!name || !purchaseDate || !Number.isFinite(totalAmount) || totalAmount <= 0) {
		return redirect('/dashboard?purchase_error=Datos+inválidos');
	}

	if (!Number.isInteger(installmentsCount) || installmentsCount < 1 || installmentsCount > 120) {
		return redirect('/dashboard?purchase_error=Cuotas+inválidas');
	}

	if (!cardIds.length || cardIds.length !== allocationAmounts.length) {
		return redirect('/dashboard?purchase_error=Asignaciones+incompletas');
	}

	if (allocationAmounts.some((amount) => !Number.isFinite(amount) || amount <= 0)) {
		return redirect('/dashboard?purchase_error=Montos+de+asignación+inválidos');
	}

	const allocationsTotal = round2(allocationAmounts.reduce((acc, value) => acc + value, 0));
	if (allocationsTotal !== totalAmount) {
		return redirect('/dashboard?purchase_error=Las+asignaciones+deben+sumar+el+total');
	}

	const uniqueCardIds = [...new Set(cardIds)];
	const supabase = getSupabaseServerClient(cookies, request);

	const { data: validCards, error: cardsError } = await supabase
		.from('cards')
		.select('id')
		.in('id', uniqueCardIds)
		.eq('user_id', locals.user.id);

	if (cardsError || !validCards || validCards.length !== uniqueCardIds.length) {
		return redirect('/dashboard?purchase_error=Tarjetas+inválidas+para+la+cuenta');
	}

	const { error: purchaseError } = await supabase.rpc('create_purchase_atomic', {
		p_name: name,
		p_purchase_date: purchaseDate,
		p_total_amount: totalAmount,
		p_installments_count: installmentsCount,
		p_card_ids: cardIds,
		p_allocation_amounts: allocationAmounts
	});

	if (purchaseError) {
		return redirect('/dashboard?purchase_error=No+se+pudo+crear+la+compra');
	}

	return redirect('/dashboard?purchase_success=1');
};
