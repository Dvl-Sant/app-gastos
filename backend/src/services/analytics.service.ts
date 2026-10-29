import pool from '../db/pool';

export class AnalyticsService {
    static async getByCategory(userId: number) {
        const { rows } = await pool.query(
            `SELECT category,
                    COUNT(*)::int AS count,
                    SUM(monthly_payment)::numeric AS total_monthly,
                    SUM(total_amount)::numeric AS total_amount
             FROM expenses
             WHERE user_id = $1
             GROUP BY category
             ORDER BY total_monthly DESC`,
            [userId]
        );
        return rows;
    }
}
