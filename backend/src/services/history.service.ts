import pool from '../db/pool';

export interface HistoryInflow {
    id: string;
    kind: 'ingreso' | 'compartido' | 'abono';
    name: string;
    detail: string;
    amount: string;
    date: string;
    note: string | null;
}

export class HistoryService {
    /**
     * Historial por rango de fechas (opcional): pagos por cuenta destino,
     * traspasos a ahorros y dinero que ENTRA (ingresos liquidados y pagos
     * de miembros en gastos compartidos).
     */
    static async getHistory(userId: number, from?: string, to?: string) {
        const hasRange = Boolean(
            from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)
        );
        const rangeParams = hasRange ? [from, to] : [];
        const paidRange = hasRange ? ' AND p.paid_at::date BETWEEN $2 AND $3' : '';
        const createdRange = hasRange ? ' AND sm.created_at::date BETWEEN $2 AND $3' : '';
        const sharedRange = hasRange ? ' AND sp.paid_at::date BETWEEN $2 AND $3' : '';
        const settledRange = hasRange ? ' AND s.settled_date BETWEEN $2 AND $3' : '';

        // Pagos de deudas (dinero que sale), agrupados por cuenta destino
        const { rows } = await pool.query(
            `SELECT p.id, p.amount, p.note, p.paid_at, p.due_id,
                    a.name AS account_name, a.id AS account_id,
                    sa.name AS source_account_name,
                    e.name AS expense_name,
                    e.installments,
                    CASE WHEN e.installments IS NOT NULL THEN
                        (SELECT COUNT(*)::int FROM dues d2
                         WHERE d2.expense_id = d.expense_id AND d2.due_date <= d.due_date)
                    END AS installment_no
             FROM payments p
             JOIN accounts a ON a.id = p.account_id
             LEFT JOIN accounts sa ON sa.id = p.source_account_id
             LEFT JOIN dues d ON d.id = p.due_id
             LEFT JOIN expenses e ON e.id = d.expense_id
             WHERE p.user_id = $1${paidRange}
             ORDER BY p.paid_at DESC
             LIMIT 200`,
            [userId, ...rangeParams]
        );

        const groups = new Map<number, { account_id: number; account_name: string; kind: string; total: number; payments: typeof rows }>();
        for (const row of rows) {
            if (!groups.has(row.account_id)) {
                groups.set(row.account_id, {
                    account_id: row.account_id,
                    account_name: row.account_name,
                    kind: 'pagos',
                    total: 0,
                    payments: [],
                });
            }
            const group = groups.get(row.account_id)!;
            group.total += parseFloat(row.amount) || 0;
            group.payments.push(row);
        }
        const result = [...groups.values()].map((g) => ({
            ...g,
            total: Math.round(g.total * 100) / 100,
        }));

        // Traspasos a ahorros
        const { rows: transfers } = await pool.query(
            `SELECT sm.id, sm.amount, sm.note, sm.created_at,
                    a.name AS source_account_name
             FROM savings_movements sm
             LEFT JOIN accounts a ON a.id = sm.source_account_id
             WHERE sm.user_id = $1${createdRange}
             ORDER BY sm.created_at DESC
             LIMIT 100`,
            [userId, ...rangeParams]
        );

        if (transfers.length > 0) {
            result.push({
                account_id: 0,
                account_name: 'Ahorros',
                kind: 'traspasos',
                total: Math.round(transfers.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0) * 100) / 100,
                payments: transfers.map((t) => ({
                    ...t,
                    due_id: null,
                    account_id: 0,
                    account_name: 'Ahorros',
                    expense_name: null,
                    installments: null,
                    installment_no: null,
                })),
            });
        }

        // Dinero que ENTRA: pagos de miembros en gastos compartidos
        const { rows: sharedRows } = await pool.query(
            `SELECT sp.id, sp.amount, sp.paid_at, sp.period, sp.note,
                    m.name AS member_name, g.name AS group_name
             FROM shared_payments sp
             JOIN shared_members m ON m.id = sp.member_id
             JOIN shared_groups g ON g.id = sp.group_id
             WHERE sp.user_id = $1${sharedRange}
             ORDER BY sp.paid_at DESC
             LIMIT 200`,
            [userId, ...rangeParams]
        );

        // Dinero que ENTRA: ingresos frecuentes/únicos liquidados a Efectivo
        const { rows: settledRows } = await pool.query(
            `SELECT s.id, s.amount, s.settled_date, i.name AS income_name
             FROM income_settlements s
             JOIN incomes i ON i.id = s.income_id
             WHERE s.user_id = $1${settledRange}
             ORDER BY s.settled_date DESC
             LIMIT 200`,
            [userId, ...rangeParams]
        );

        // Dinero que ENTRA: abonos de préstamos + compartidos + ingresos liquidados
        const loanPaidRange = hasRange ? ' AND lp.paid_at::date BETWEEN $2 AND $3' : '';
        const { rows: loanPaidRows } = await pool.query(
            `SELECT lp.id, lp.amount, lp.paid_at, lp.note,
                    l.person_name, l.concept
             FROM loan_payments lp JOIN loans l ON l.id = lp.loan_id
             WHERE lp.user_id = $1${loanPaidRange}
             ORDER BY lp.paid_at DESC
             LIMIT 200`,
            [userId, ...rangeParams]
        );

        const inflows: HistoryInflow[] = [
            ...loanPaidRows.map((p) => ({
                id: `abono-${p.id}`,
                kind: 'abono' as const,
                name: p.person_name,
                detail: `Abono de préstamo: ${p.concept}`,
                amount: p.amount,
                date: new Date(p.paid_at).toISOString(),
                note: p.note,
            })),
            ...sharedRows.map((p) => ({
                id: `shared-${p.id}`,
                kind: 'compartido' as const,
                name: p.member_name,
                detail: `${p.group_name} • periodo ${String(p.period)}`,
                amount: p.amount,
                date: new Date(p.paid_at).toISOString(),
                note: p.note,
            })),
            ...settledRows.map((s) => ({
                id: `ingreso-${s.id}`,
                kind: 'ingreso' as const,
                name: s.income_name,
                detail: 'Ingreso acreditado a Efectivo',
                amount: s.amount,
                date: `${s.settled_date}T12:00:00.000Z`,
                note: null,
            })),
        ].sort((a, b) => (a.date < b.date ? 1 : -1));

        // Préstamos otorgados (dinero que sale hacia alguien)
        const loansGivenRange = hasRange ? ' AND l.loan_date BETWEEN $2 AND $3' : '';
        const { rows: loansGiven } = await pool.query(
            `SELECT l.id, l.amount, l.loan_date, l.person_name, l.concept, a.name AS account_name
             FROM loans l LEFT JOIN accounts a ON a.id = l.account_id
             WHERE l.user_id = $1${loansGivenRange}
             ORDER BY l.loan_date DESC
             LIMIT 200`,
            [userId, ...rangeParams]
        );

        return { groups: result, inflows, loans_given: loansGiven };
    }
}
