import pool from '../db/pool';

export class DashboardService {
   static async getSummary() {
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
      ),
      expense_calc AS (
         SELECT 
            COALESCE(SUM(CASE WHEN is_paid = true THEN monthly_payment ELSE 0 END), 0) AS paid_this_month,
            COALESCE(SUM(CASE WHEN is_paid = false THEN monthly_payment ELSE 0 END), 0) AS total_monthly_payment,
            COALESCE(SUM(total_debt), 0) AS total_debt
         FROM expenses
      )
      SELECT
        (SELECT total_amount FROM user_savings LIMIT 1) AS base_savings,
        (SELECT total_incomes_monthly FROM income_calc) AS total_incomes_monthly,
        (SELECT paid_this_month FROM expense_calc) AS paid,
        (SELECT total_monthly_payment FROM expense_calc) AS total_monthly_payment,
        (SELECT total_debt FROM expense_calc) AS total_debt
    `;
      const { rows } = await pool.query(query);
      const result = rows[0];

      const baseSavings = parseFloat(result.base_savings || '0');
      const incomes = parseFloat(result.total_incomes_monthly || '0');
      const paidThisMonth = parseFloat(result.paid || '0');

      // Dynamic total savings: Base Savings + Incomes - Paid this month
      const dynamicSavings = baseSavings + incomes - paidThisMonth;

      // Intelligent recommendation
      const { rows: unpaidExpenses } = await pool.query(
         'SELECT * FROM expenses WHERE is_paid = false ORDER BY due_date ASC'
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
         recommendation
      };
   }
}
