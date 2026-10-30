import pool from '../db/pool';
import { toNum, todayISO } from '../utils/dates';
import { ExpensesService } from './expenses.service';
import { IncomesService } from './incomes.service';
export interface CashflowMonth {
    month: string; // YYYY-MM
    incomes: number;
    dues: number;
    dues_paid: number;
    net: number;
}

export class CashflowService {
    /**
     * Flujo entre dos fechas: mensualidades que vencen (con estado de pago)
     * e ingresos proyectados (frecuentes expandidos + únicos), agrupados por mes.
     */
    static async getCashflow(userId: number, from: string, to: string) {
        await ExpensesService.ensureRecurringDues(userId, to);
        await IncomesService.settleIncomes(userId);

        const dues = await ExpensesService.getCalendar(userId, from, to);
        const { rows: incomeRows } = await pool.query('SELECT * FROM incomes WHERE user_id = $1', [userId]);
        const incomeOccurrences = IncomesService.projectInRange(incomeRows, from, to);

        const monthMap = new Map<string, CashflowMonth>();
        const monthKey = (date: string) => date.slice(0, 7);
        const ensureMonth = (date: string): CashflowMonth => {
            const key = monthKey(date);
            if (!monthMap.has(key)) {
                monthMap.set(key, { month: key, incomes: 0, dues: 0, dues_paid: 0, net: 0 });
            }
            return monthMap.get(key)!;
        };

        for (const due of dues) {
            const m = ensureMonth(due.due_date);
            m.dues += toNum(due.amount);
            m.dues_paid += toNum(due.paid_amount);
        }
        for (const occ of incomeOccurrences) {
            const m = ensureMonth(occ.date);
            m.incomes += occ.amount;
        }
        const months = [...monthMap.values()]
            .sort((a, b) => a.month.localeCompare(b.month))
            .map((m) => ({ ...m, net: Math.round((m.incomes - m.dues) * 100) / 100 }));

        const totals = {
            incomes: Math.round(incomeOccurrences.reduce((acc, o) => acc + o.amount, 0) * 100) / 100,
            dues: Math.round(dues.reduce((acc, d) => acc + toNum(d.amount), 0) * 100) / 100,
            dues_paid: Math.round(dues.reduce((acc, d) => acc + toNum(d.paid_amount), 0) * 100) / 100,
            dues_pending: Math.round(dues.reduce((acc, d) => acc + (toNum(d.amount) - toNum(d.paid_amount)), 0) * 100) / 100,
        };
        dues.sort((a, b) => a.due_date.localeCompare(b.due_date));

        return {
            from,
            to,
            generated_at: todayISO(),
            months,
            totals,
            dues,
            income_occurrences: incomeOccurrences,
        };
    }
}
