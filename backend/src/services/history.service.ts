import pool from '../db/pool';

export class HistoryService {
    static async getRecentHistory() {
        const query = `
            SELECT id, expense_id, amount_paid, payment_date, concept
            FROM payment_history
            ORDER BY payment_date DESC
            LIMIT 50
        `;
        const { rows } = await pool.query(query);
        return rows;
    }
}
