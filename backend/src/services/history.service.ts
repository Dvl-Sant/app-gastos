import pool from '../db/pool';

export class HistoryService {
    /** Pagos recientes agrupados por cuenta destino. */
    static async getRecentPayments(userId: number) {
        const { rows } = await pool.query(
            `SELECT p.id, p.amount, p.note, p.paid_at, p.due_id,
                    a.name AS account_name, a.id AS account_id,
                    sa.name AS source_account_name,
                    e.name AS expense_name
             FROM payments p
             JOIN accounts a ON a.id = p.account_id
             LEFT JOIN accounts sa ON sa.id = p.source_account_id
             LEFT JOIN dues d ON d.id = p.due_id
             LEFT JOIN expenses e ON e.id = d.expense_id
             WHERE p.user_id = $1
             ORDER BY p.paid_at DESC
             LIMIT 200`,
            [userId]
        );

        const groups = new Map<number, { account_id: number; account_name: string; total: number; payments: typeof rows }>();
        for (const row of rows) {
            if (!groups.has(row.account_id)) {
                groups.set(row.account_id, {
                    account_id: row.account_id,
                    account_name: row.account_name,
                    total: 0,
                    payments: [],
                });
            }
            const group = groups.get(row.account_id)!;
            group.total += parseFloat(row.amount) || 0;
            group.payments.push(row);
        }
        return [...groups.values()].map((g) => ({
            ...g,
            total: Math.round(g.total * 100) / 100,
        }));
    }
}
