import pool from '../db/pool';

export class AnalyticsService {
    static async getByCategory(userId: number) {
        const { rows } = await pool.query(`
      SELECT category,
             COUNT(*)::int                   AS count,
             SUM(monthly_payment)::numeric   AS total_monthly,
             SUM(total_debt)::numeric        AS total_debt
      FROM expenses
      WHERE user_id = $1
      GROUP BY category 
      ORDER BY total_monthly DESC
    `, [userId]);
        return rows;
    }

    static async getByDueDate(userId: number) {
        const { rows } = await pool.query(`
      SELECT 
        CASE 
          WHEN due_date <= 10 THEN '1-10'
          WHEN due_date <= 20 THEN '11-20'
          ELSE '21-31'
        END AS period,
        COUNT(*)::int AS count,
        SUM(monthly_payment)::numeric AS total_monthly
      FROM expenses
      WHERE user_id = $1
      GROUP BY period
      ORDER BY period
    `, [userId]);
        return rows;
    }
}
