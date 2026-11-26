import pool from '../db/pool';
import { addMonths, diffDays, monthWindow, nextCutDate, paymentDateForCut, toNum, todayISO } from '../utils/dates';
import { Due } from '../models/Expense';
import { ExpensesService } from './expenses.service';
import { IncomesService } from './incomes.service';
import { AccountsService } from './accounts.service';
import { SharedService } from './shared.service';

export interface CardTipEntry {
    id: number;
    name: string;
    cut_off_day: number | null;
    next_cut_date: string;
    next_payment_date: string;
    days_until_cut: number;
    days_until_payment: number;
    pending_debt: number;
    credit_limit: number | null;
    usage_percent: number | null;
}

export interface CardTip {
    best: CardTipEntry | null;
    caution: CardTipEntry | null;
    cards: CardTipEntry[];
}

export interface AccountCycleSummary {
    id: number;
    name: string;
    type: string;
    cut_off_day: number | null;
    balance: string;
    pending_debt: number;
    cycle_total: number;
    cycle_paid: number;
    cycle_pending: number;
}

export class DashboardService {
    /** Resumen: ahorros, mes en curso, ciclo actual por tarjeta y próximos vencimientos. */
    static async getSummary(userId: number) {
        const reference = todayISO();
        await ExpensesService.ensureRecurringDues(userId, addMonths(reference, 12));
        await IncomesService.settleIncomes(userId);

        const { rows: savingsRows } = await pool.query(
            'SELECT total_amount FROM user_savings WHERE user_id = $1 LIMIT 1',
            [userId]
        );
        const savingsBase = toNum(savingsRows[0]?.total_amount);

        // Débitos vinculados a ahorros: su saldo cuenta como ahorro
        const { rows: linkedRows } = await pool.query(
            `SELECT id, name, balance FROM accounts
             WHERE user_id = $1 AND type = 'debito' AND linked_to_savings = true
             ORDER BY created_at ASC`,
            [userId]
        );
        const savingsLinked = Math.round(linkedRows.reduce((acc, a) => acc + toNum(a.balance), 0) * 100) / 100;
        const savings = Math.round((savingsBase + savingsLinked) * 100) / 100;

        const month = monthWindow(reference);
        const { rows: monthDues } = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS total, COALESCE(SUM(paid_amount), 0) AS paid
             FROM dues WHERE user_id = $1 AND due_date BETWEEN $2 AND $3`,
            [userId, month.from, month.to]
        );

        const { rows: incomeRows } = await pool.query('SELECT * FROM incomes WHERE user_id = $1', [userId]);
        const monthOccurrences = IncomesService.projectInRange(incomeRows, month.from, month.to);
        const monthIncomes = Math.round(monthOccurrences.reduce((acc, o) => acc + o.amount, 0) * 100) / 100;

        const { rows: accountRows } = await pool.query(
            `SELECT a.*,
                    COALESCE((SELECT SUM(d.amount - d.paid_amount) FROM dues d
                              WHERE d.account_id = a.id AND d.is_paid = false), 0) AS pending_debt
             FROM accounts a WHERE a.user_id = $1 ORDER BY a.created_at ASC`,
            [userId]
        );

        const accountSummaries: AccountCycleSummary[] = [];
        for (const account of accountRows) {
            const { cutDate, from, to } = AccountsService.cycleFilter(account);
            const { rows: cycleRows } = await pool.query(
                `SELECT COALESCE(SUM(amount), 0) AS total, COALESCE(SUM(paid_amount), 0) AS paid
                 FROM dues
                 WHERE account_id = $1
                   AND ($2::date IS NOT NULL AND cut_date = $2::date
                        OR $2::date IS NULL AND due_date BETWEEN $3 AND $4)`,
                [account.id, cutDate, from, to]
            );
            accountSummaries.push({
                id: account.id,
                name: account.name,
                type: account.type,
                cut_off_day: account.cut_off_day,
                balance: account.balance,
                pending_debt: Math.round(toNum(account.pending_debt) * 100) / 100,
                cycle_total: Math.round(toNum(cycleRows[0].total) * 100) / 100,
                cycle_paid: Math.round(toNum(cycleRows[0].paid) * 100) / 100,
                cycle_pending: Math.round((toNum(cycleRows[0].total) - toNum(cycleRows[0].paid)) * 100) / 100,
            });
        }

        const { rows: upcoming } = await pool.query(
            `SELECT d.*, e.name AS expense_name, e.category, e.expense_type, a.name AS account_name
             FROM dues d JOIN expenses e ON e.id = d.expense_id JOIN accounts a ON a.id = d.account_id
             WHERE d.user_id = $1 AND d.is_paid = false AND d.due_date >= $2
             ORDER BY d.due_date ASC LIMIT 5`,
            [userId, reference]
        );

        const shared = await SharedService.getAlerts(userId);

        // Tip financiero: la tarjeta con el corte más lejano da más días de
        // financiamiento. Entre las que quedan bajo el 80% de su límite se
        // elige la de corte más lejano; si todas están al límite se avisa.
        let card_tip: CardTip | null = null;
        const creditCards = accountRows.filter((a) => a.type === 'credito' && a.cut_off_day);
        if (creditCards.length > 0) {
            const cards: CardTipEntry[] = creditCards
                .map((a) => {
                    const cut = nextCutDate(reference, a.cut_off_day!);
                    const pay = a.payment_due_day
                        ? paymentDateForCut(cut, a.cut_off_day!, a.payment_due_day)
                        : cut;
                    const limit = a.credit_limit === null ? null : toNum(a.credit_limit);
                    const pending = toNum(a.pending_debt);
                    const usage = limit && limit > 0 ? Math.min(100, Math.round((pending / limit) * 100)) : null;
                    return {
                        id: a.id,
                        name: a.name,
                        cut_off_day: a.cut_off_day,
                        next_cut_date: cut,
                        next_payment_date: pay,
                        days_until_cut: diffDays(reference, cut),
                        days_until_payment: diffDays(reference, pay),
                        pending_debt: Math.round(pending * 100) / 100,
                        credit_limit: limit,
                        usage_percent: usage,
                    };
                })
                .sort((x, y) => y.days_until_cut - x.days_until_cut);

            const withRoom = cards.filter((c) => c.usage_percent === null || c.usage_percent < 80);
            const pool_ = withRoom.length > 0 ? withRoom : cards;
            const best = pool_[0];
            const cautionCandidate = cards[cards.length - 1];
            card_tip = {
                best,
                caution: cards.length > 1 && cautionCandidate.id !== best.id ? cautionCandidate : null,
                cards,
            };
        }

        return {
            savings,
            savings_base: savingsBase,
            savings_linked: linkedRows.map((a) => ({ id: a.id, name: a.name, balance: a.balance })),
            currency: 'USD',
            month: {
                from: month.from,
                to: month.to,
                incomes: monthIncomes,
                dues_total: Math.round(toNum(monthDues[0].total) * 100) / 100,
                dues_paid: Math.round(toNum(monthDues[0].paid) * 100) / 100,
                dues_pending: Math.round((toNum(monthDues[0].total) - toNum(monthDues[0].paid)) * 100) / 100,
            },
            accounts: accountSummaries,
            upcoming: upcoming as Due[],
            shared,
            card_tip,
        };
    }
}
