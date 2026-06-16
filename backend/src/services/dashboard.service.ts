import pool from '../db/pool';

export class DashboardService {
   static async getSummary(userId: number) {
      const currentMonth = new Date().toISOString().slice(0, 7);

      await pool.query(
         `UPDATE expenses SET is_paid = false WHERE user_id = $1 AND is_paid = true AND last_paid_month != $2`,
         [userId, currentMonth]
      );

      const query = `
      WITH income_calc AS (
         SELECT COALESCE(SUM(
            CASE 
               WHEN frequency = 'semanal' THEN amount * 4.33 
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

      const baseSavings = result.base_savings || 0;
      const incomes = result.total_incomes_monthly || 0;
      const paidThisMonth = result.paid || 0;
      const totalMonthlyPayment = result.total_monthly_payment || 0;

      const availableBalance = baseSavings + incomes - totalMonthlyPayment;

      const { rows: unpaidExpenses } = await pool.query(
         'SELECT * FROM expenses WHERE is_paid = false AND user_id = $1 ORDER BY due_date ASC',
         [userId]
      );

      let recommendation = null;
      for (const exp of unpaidExpenses) {
         if (exp.monthly_payment <= availableBalance) {
            recommendation = {
               name: exp.name,
               amount: exp.monthly_payment,
               due_date: exp.due_date
            };
            break;
         }
      }

      return {
         total_savings: baseSavings,
         total_monthly_payment: totalMonthlyPayment,
         total_debt: result.total_debt || 0,
         total_incomes: incomes,
         total_paid: paidThisMonth,
         available_balance: availableBalance,
         recommendation
      };
   }
}
