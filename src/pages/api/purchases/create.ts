import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const addMonthsIso = (isoDate: string, monthsToAdd: number) => {
	const [year, month, day] = isoDate.split('-').map((part) => Number.parseInt(part, 10));
	const date = new Date(Date.UTC(year, month - 1, day));
	date.setUTCMonth(date.getUTCMonth() + monthsToAdd);
	return date.toISOString().slice(0, 10);
};

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
	const supabase = getSupabaseServerClient(cookies);

	const { data: validCards, error: cardsError } = await supabase
		.from('cards')
		.select('id')
		.in('id', uniqueCardIds)
		.eq('user_id', locals.user.id);

	if (cardsError || !validCards || validCards.length !== uniqueCardIds.length) {
		return redirect('/dashboard?purchase_error=Tarjetas+inválidas+para+la+cuenta');
	}

	const { data: purchase, error: purchaseError } = await supabase
		.from('purchases')
		.insert({
			user_id: locals.user.id,
			name,
			total_amount: totalAmount,
			purchase_date: purchaseDate,
			installments_count: installmentsCount
		})
		.select('id')
		.single();

	if (purchaseError || !purchase) {
		return redirect('/dashboard?purchase_error=No+se+pudo+crear+la+compra');
	}

	for (let index = 0; index < cardIds.length; index += 1) {
		const amount = allocationAmounts[index];
		const { data: allocation, error: allocationError } = await supabase
			.from('purchase_allocations')
			.insert({
				purchase_id: purchase.id,
				user_id: locals.user.id,
				card_id: cardIds[index],
				amount
			})
			.select('id')
			.single();

		if (allocationError || !allocation) {
			return redirect('/dashboard?purchase_error=Error+creando+asignaciones');
		}

		const { data: plan, error: planError } = await supabase
			.from('installment_plans')
			.insert({
				allocation_id: allocation.id,
				user_id: locals.user.id,
				installments_count: installmentsCount,
				frequency: 'monthly',
				start_date: purchaseDate
			})
			.select('id')
			.single();

		if (planError || !plan) {
			return redirect('/dashboard?purchase_error=Error+creando+plan+de+cuotas');
		}

		const baseInstallment = round2(Math.floor((amount * 100) / installmentsCount) / 100);
		const generatedTotal = round2(baseInstallment * installmentsCount);
		const lastAdjustment = round2(amount - generatedTotal);

		const installments = Array.from({ length: installmentsCount }, (_, installmentIndex) => ({
			plan_id: plan.id,
			user_id: locals.user.id,
			installment_number: installmentIndex + 1,
			due_date: addMonthsIso(purchaseDate, installmentIndex),
			amount:
				installmentIndex === installmentsCount - 1
					? round2(baseInstallment + lastAdjustment)
					: baseInstallment,
			status: 'pending'
		}));

		const { error: installmentsError } = await supabase.from('installments').insert(installments);

		if (installmentsError) {
			return redirect('/dashboard?purchase_error=Error+generando+cuotas');
		}
	}

	return redirect('/dashboard?purchase_success=1');
};
