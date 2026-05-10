import pool from '../db/pool';

export class DashboardService {
   static async getSummary(userId: number) {
      const query = `
      WITH income_calc AS (
         SELECT COALESCE(SUM(
            CASE 
               WHEN frequency = 'semanal' THEN amount * 4 
               WHEN frequency = 'quincenal' THEN amount * 2 
               ELSE amount 
            END
         ), 0) AS total_incomes_monthly
         FROM incomes
         WHERE user_id = $1
      ),
      expense_calc AS (
         SELECT 
            COALESCE(SUM(CASE WHEN is_paid = true THEN monthly_payment ELSE 0 END), 0) AS paid_this_month,
            COALESCE(SUM(CASE WHEN is_paid = false THEN monthly_payment ELSE 0 END), 0) AS total_monthly_payment,
            COALESCE(SUM(total_debt), 0) AS total_debt
         FROM expenses
         WHERE user_id = $1
      )
      SELECT
        (SELECT total_amount FROM user_savings WHERE user_id = $1 LIMIT 1) AS base_savings,
        (SELECT total_incomes_monthly FROM income_calc) AS total_incomes_monthly,
        (SELECT paid_this_month FROM expense_calc) AS paid,
        (SELECT total_monthly_payment FROM expense_calc) AS total_monthly_payment,
        (SELECT total_debt FROM expense_calc) AS total_debt
    `;
      const { rows } = await pool.query(query, [userId]);
      const result = rows[0];

      const baseSavings = parseFloat(result.base_savings || '0');
      const incomes = parseFloat(result.total_incomes_monthly || '0');

      const dynamicSavings = baseSavings;

      const { rows: unpaidExpenses } = await pool.query(
         'SELECT * FROM expenses WHERE is_paid = false AND user_id = $1 ORDER BY due_date ASC',
         [userId]
      );

      let recommendation = null;
      for (const exp of unpaidExpenses) {
         if (parseFloat(exp.monthly_payment) <= dynamicSavings) {
            recommendation = {
               name: exp.name,
               amount: parseFloat(exp.monthly_payment),
               due_date: exp.due_date
            };
            break;
         }
      }

      return {
         total_savings: dynamicSavings,
         total_monthly_payment: parseFloat(result.total_monthly_payment || '0'),
         total_debt: parseFloat(result.total_debt || '0'),
         total_incomes: incomes,
         recommendation
      };
   }
}
