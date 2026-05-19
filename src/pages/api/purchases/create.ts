import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const purchaseRedirect = (search: string) => `/dashboard?action=purchase&${search}`;

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
	if (!locals.user) {
		return redirect('/login');
	}

	const formData = await request.formData();
	const name = String(formData.get('name') ?? '').trim();
	const purchaseDate = String(formData.get('purchase_date') ?? '').trim();
	const totalAmount = round2(Number.parseFloat(String(formData.get('total_amount') ?? '0')));
	const cardIds = formData
		.getAll('allocation_card_id')
		.map((entry) => String(entry).trim())
		.filter(Boolean);
	const allocationAmounts = formData
		.getAll('allocation_amount')
		.map((entry) => round2(Number.parseFloat(String(entry ?? '0'))));
	const allocationInstallmentsCounts = formData
		.getAll('allocation_installments_count')
		.map((entry) => Number.parseInt(String(entry ?? '0'), 10));

	if (!name || !purchaseDate || !Number.isFinite(totalAmount) || totalAmount <= 0) {
		return redirect(purchaseRedirect('purchase_error=Datos+inválidos'));
	}

	if (
		!cardIds.length ||
		cardIds.length !== allocationAmounts.length ||
		cardIds.length !== allocationInstallmentsCounts.length
	) {
		return redirect(purchaseRedirect('purchase_error=Asignaciones+incompletas'));
	}

	if (allocationAmounts.some((amount) => !Number.isFinite(amount) || amount <= 0)) {
		return redirect(purchaseRedirect('purchase_error=Montos+de+asignación+inválidos'));
	}

	if (
		allocationInstallmentsCounts.some(
			(installmentsCount) =>
				!Number.isInteger(installmentsCount) || installmentsCount < 1 || installmentsCount > 120
		)
	) {
		return redirect(purchaseRedirect('purchase_error=Cuotas+inválidas+en+las+asignaciones'));
	}

	const allocationsTotal = round2(allocationAmounts.reduce((acc, value) => acc + value, 0));
	if (allocationsTotal !== totalAmount) {
		return redirect(purchaseRedirect('purchase_error=Las+asignaciones+deben+sumar+el+total'));
	}

	const uniqueCardIds = [...new Set(cardIds)];
	const supabase = getSupabaseServerClient(cookies, request);

	const { data: validCards, error: cardsError } = await supabase
		.from('cards')
		.select('id')
		.in('id', uniqueCardIds)
		.eq('user_id', locals.user.id);

	if (cardsError || !validCards || validCards.length !== uniqueCardIds.length) {
		return redirect(purchaseRedirect('purchase_error=Tarjetas+inválidas+para+la+cuenta'));
	}

	const { error: purchaseError } = await supabase.rpc('create_purchase_atomic', {
		p_name: name,
		p_purchase_date: purchaseDate,
		p_total_amount: totalAmount,
		p_card_ids: cardIds,
		p_allocation_amounts: allocationAmounts,
		p_allocation_installments_counts: allocationInstallmentsCounts
	});

	if (purchaseError) {
		return redirect(purchaseRedirect('purchase_error=No+se+pudo+crear+la+compra'));
	}

	return redirect(purchaseRedirect('purchase_success=1'));
};
