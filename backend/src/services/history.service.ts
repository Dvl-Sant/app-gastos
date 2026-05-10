import pool from '../db/pool';

export class HistoryService {
    static async getRecentHistory(userId: number) {
        const query = `
            SELECT expense_id, concept, SUM(amount_paid) as total_paid,
                   json_agg(json_build_object(
                       'id', id,
                       'amount_paid', amount_paid,
                       'payment_date', payment_date
                   ) ORDER BY payment_date DESC) as payments
            FROM payment_history
            WHERE user_id = $1
            GROUP BY expense_id, concept
            ORDER BY total_paid DESC
        `;
        const { rows } = await pool.query(query, [userId]);
        return rows;
    }
}
