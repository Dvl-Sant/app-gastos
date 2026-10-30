import pool, { getClient } from '../db/pool';
import type { PoolClient } from 'pg';
import { HttpError } from '../utils/errors';
import { addMonths, nextCutDate, paymentDateForCut, toNum, todayISO } from '../utils/dates';
import { CreateExpenseDTO, Due, Expense, UpdateExpenseDTO } from '../models/Expense';
import type { PaymentSource } from '../models/Payment';

/** Meses de mensualidades recurrentes generados por adelantado. */
const RECURRENT_HORIZON_MONTHS = 12;

const EXPENSE_SELECT = `
    SELECT e.*, a.name AS account_name, a.type AS account_type,
           (SELECT d.due_date FROM dues d WHERE d.expense_id = e.id AND d.is_paid = false
            ORDER BY d.due_date ASC LIMIT 1) AS next_due_date,
           COALESCE((SELECT SUM(d.amount - d.paid_amount) FROM dues d
                     WHERE d.expense_id = e.id AND d.is_paid = false), 0) AS pending_amount
    FROM expenses e
    JOIN accounts a ON a.id = e.account_id
`;

export class ExpensesService {
    static async list(userId: number): Promise<Expense[]> {
        await this.ensureRecurringDues(userId, addMonths(todayISO(), RECURRENT_HORIZON_MONTHS));
        const { rows } = await pool.query(`${EXPENSE_SELECT} WHERE e.user_id = $1 ORDER BY e.created_at DESC`, [userId]);
        return rows;
    }

    static async getById(id: number, userId: number): Promise<Expense | null> {
        const { rows } = await pool.query(`${EXPENSE_SELECT} WHERE e.id = $1 AND e.user_id = $2`, [id, userId]);
        return rows[0] || null;
    }

    /**
     * Crea la declaración de gasto y genera sus mensualidades:
     *  - recurrente: 12 meses rodantes el día due_day
     *  - unico: una mensualidad; en tarjeta vence en la fecha límite de pago
     *    del ciclo del próximo corte >= compra,
     *    en efectivo/débito se registra como pagado el mismo día
     *  - msi: N mensualidades el día de corte de la tarjeta, desde el próximo
     *    corte >= fecha de compra
     */
    static async create(userId: number, data: CreateExpenseDTO): Promise<Expense> {
        const type = data.expense_type ?? 'recurrente';
        if (!data.name) throw new HttpError(400, 'El nombre del gasto es requerido');

        const client = await getClient();
        try {
            await client.query('BEGIN');

            const { rows: accountRows } = await client.query(
                'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
                [data.account_id, userId]
            );
            const account = accountRows[0];
            if (!account) throw new HttpError(404, 'Cuenta no encontrada');

            const purchaseDate: string = data.purchase_date || todayISO();
            let expenseId: number;

            if (type === 'recurrente') {
                if (!data.monthly_payment || data.monthly_payment <= 0) {
                    throw new HttpError(400, 'El pago mensual es requerido para gastos recurrentes');
                }
                if (!data.due_day || data.due_day < 1 || data.due_day > 28) {
                    throw new HttpError(400, 'El día de vencimiento debe estar entre 1 y 28');
                }
                const { rows } = await client.query(
                    `INSERT INTO expenses (user_id, account_id, name, category, expense_type,
                         monthly_payment, due_day, purchase_date)
                     VALUES ($1, $2, $3, $4, 'recurrente', $5, $6, $7) RETURNING id`,
                    [userId, data.account_id, data.name, data.category ?? null, data.monthly_payment, data.due_day, purchaseDate]
                );
                expenseId = rows[0].id;
                await this.generateRecurringDues(client, userId, expenseId, account, data.due_day!, toNum(data.monthly_payment), purchaseDate);
            } else if (type === 'unico') {
                if (!data.total_amount || data.total_amount <= 0) {
                    throw new HttpError(400, 'El monto total es requerido para gastos únicos');
                }
                const isCredit = account.type === 'credito';
                // En tarjeta se difiere al ciclo del próximo corte y la fecha
                // de pago es la fecha límite de pago de ese ciclo; en
                // efectivo/débito se paga al instante.
                const isPaid = data.is_paid ?? !isCredit;
                const { rows } = await client.query(
                    `INSERT INTO expenses (user_id, account_id, name, category, expense_type,
                         total_amount, purchase_date, is_paid)
                     VALUES ($1, $2, $3, $4, 'unico', $5, $6, $7) RETURNING id`,
                    [userId, data.account_id, data.name, data.category ?? null, data.total_amount, purchaseDate, isPaid]
                );
                expenseId = rows[0].id;
                let dueDate: string;
                let cutDate: string | null = null;
                if (isCredit) {
                    cutDate = nextCutDate(purchaseDate, account.cut_off_day ?? 28);
                    dueDate = account.payment_due_day
                        ? paymentDateForCut(cutDate, account.cut_off_day ?? 28, account.payment_due_day)
                        : cutDate;
                } else {
                    dueDate = purchaseDate;
                }
                await client.query(
                    `INSERT INTO dues (user_id, expense_id, account_id, due_date, cut_date, amount, paid_amount, is_paid)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [userId, expenseId, data.account_id, dueDate, cutDate, data.total_amount, isPaid ? data.total_amount : 0, isPaid]
                );
            } else if (type === 'msi') {
                if (account.type !== 'credito' || !account.cut_off_day) {
                    throw new HttpError(400, 'Los gastos a meses (MSI) requieren una tarjeta de crédito con día de corte');
                }
                if (!data.total_amount || data.total_amount <= 0) {
                    throw new HttpError(400, 'El monto total es requerido para gastos a meses');
                }
                if (!data.installments || data.installments < 1 || data.installments > 60) {
                    throw new HttpError(400, 'El número de mensualidades debe estar entre 1 y 60');
                }
                const n = data.installments;
                const total = toNum(data.total_amount);
                // Cuota fija; la última absorbe el redondeo
                const monthly = Math.round((total / n) * 100) / 100;
                // Ciclo 1 = corte siguiente a la compra; cada mensualidad vence
                // en la fecha límite de pago de su ciclo.
                const firstCut = nextCutDate(purchaseDate, account.cut_off_day);

                const { rows } = await client.query(
                    `INSERT INTO expenses (user_id, account_id, name, category, expense_type,
                         monthly_payment, total_amount, installments, purchase_date)
                     VALUES ($1, $2, $3, $4, 'msi', $5, $6, $7, $8) RETURNING id`,
                    [userId, data.account_id, data.name, data.category ?? null, monthly, data.total_amount, n, purchaseDate]
                );
                expenseId = rows[0].id;
                for (let i = 0; i < n; i++) {
                    const cycleCut = addMonths(firstCut, i);
                    const dueDate = account.payment_due_day
                        ? paymentDateForCut(cycleCut, account.cut_off_day, account.payment_due_day)
                        : cycleCut;
                    const amount = i === n - 1 ? Math.round((total - monthly * (n - 1)) * 100) / 100 : monthly;
                    await client.query(
                        `INSERT INTO dues (user_id, expense_id, account_id, due_date, cut_date, amount)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [userId, expenseId, data.account_id, dueDate, cycleCut, amount]
                    );
                }
            } else {
                throw new HttpError(400, `Tipo de gasto inválido: ${type}`);
            }

            await client.query('COMMIT');
            return (await this.getById(expenseId, userId))!;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /** Genera (si faltan) las mensualidades de los gastos recurrentes hasta upTo. */
    static async ensureRecurringDues(userId: number, upTo: string): Promise<void> {
        const client = await getClient();
        try {
            const { rows } = await client.query(
                `SELECT e.id, e.account_id, e.due_day, e.monthly_payment, e.purchase_date,
                        a.type AS account_type, a.cut_off_day,
                        (SELECT MAX(d.due_date) FROM dues d WHERE d.expense_id = e.id) AS last_due
                 FROM expenses e
                 JOIN accounts a ON a.id = e.account_id
                 WHERE e.user_id = $1 AND e.expense_type = 'recurrente'`,
                [userId]
            );
            for (const exp of rows) {
                let next: string;
                if (exp.last_due) {
                    next = addMonths(exp.last_due, 1);
                } else {
                    // Sin mensualidades aún: la primera cae el due_day del mes de compra
                    // (o el mes siguiente si ese día ya pasó)
                    const monthAnchor = exp.purchase_date.slice(0, 8) + '01';
                    const candidate = nextCutDate(monthAnchor, exp.due_day);
                    next = candidate >= exp.purchase_date ? candidate : addMonths(candidate, 1);
                }
                while (next <= upTo) {
                    const cutDate =
                        exp.account_type === 'credito' && exp.cut_off_day
                            ? nextCutDate(next, exp.cut_off_day)
                            : null;
                    await client.query(
                        `INSERT INTO dues (user_id, expense_id, account_id, due_date, cut_date, amount)
                         VALUES ($1, $2, $3, $4, $5, $6)
                         ON CONFLICT (expense_id, due_date) DO NOTHING`,
                        [userId, exp.id, exp.account_id, next, cutDate, exp.monthly_payment]
                    );
                    next = addMonths(next, 1);
                }
            }
        } finally {
            client.release();
        }
    }

    private static async generateRecurringDues(
        client: PoolClient,
        userId: number,
        expenseId: number,
        account: { id: number; type: string; cut_off_day: number | null },
        dueDay: number,
        amount: number,
        purchaseDate: string
    ): Promise<void> {
        const monthAnchor = purchaseDate.slice(0, 8) + '01';
        const candidate = nextCutDate(monthAnchor, dueDay);
        let next = candidate >= purchaseDate ? candidate : addMonths(candidate, 1);
        for (let i = 0; i < RECURRENT_HORIZON_MONTHS; i++) {
            const cutDate =
                account.type === 'credito' && account.cut_off_day ? nextCutDate(next, account.cut_off_day) : null;
            await client.query(
                `INSERT INTO dues (user_id, expense_id, account_id, due_date, cut_date, amount)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (expense_id, due_date) DO NOTHING`,
                [userId, expenseId, account.id, next, cutDate, amount]
            );
            next = addMonths(next, 1);
        }
    }

    /**
     * Pago de una mensualidad individual, con monto completo o parcial.
     * El dinero sale de una cuenta/tarjeta distinta a la del gasto, o de los ahorros.
     */
    static async payDue(userId: number, dueId: number, amount: number | undefined, source: PaymentSource) {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            const { rows: dueRows } = await client.query(
                `SELECT d.*, e.name AS expense_name
                 FROM dues d JOIN expenses e ON e.id = d.expense_id
                 WHERE d.id = $1 AND d.user_id = $2 FOR UPDATE`,
                [dueId, userId]
            );
            const due = dueRows[0];
            if (!due) throw new HttpError(404, 'Mensualidad no encontrada');
            if (due.is_paid) throw new HttpError(400, 'Esta mensualidad ya está pagada');

            const pending = toNum(due.amount) - toNum(due.paid_amount);
            const toPay = Math.round(Math.min(amount ?? pending, pending) * 100) / 100;
            if (toPay <= 0) throw new HttpError(400, 'El monto a pagar debe ser mayor a 0');

            let sourceAccountId: number | null = null;
            if (source.kind === 'savings') {
                await this.deductFromSavings(client, userId, toPay);
            } else {
                if (!source.account_id) throw new HttpError(400, 'Falta la cuenta de origen');
                if (source.account_id === due.account_id) {
                    throw new HttpError(400, 'No puedes pagar una tarjeta con ella misma');
                }
                sourceAccountId = await this.deductFromAccount(client, userId, source.account_id, toPay);
            }

            const newPaid = toNum(due.paid_amount) + toPay;
            await client.query('UPDATE dues SET paid_amount = $1, is_paid = $2 WHERE id = $3', [
                newPaid,
                newPaid >= toNum(due.amount) - 0.001,
                due.id,
            ]);

            const { rows: paymentRows } = await client.query(
                `INSERT INTO payments (user_id, account_id, source_account_id, due_id, amount, note)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [userId, due.account_id, sourceAccountId, due.id, toPay, `Pago: ${due.expense_name}`]
            );

            await client.query('COMMIT');
            return { payment: paymentRows[0], amount_paid: toPay, due: { ...due, paid_amount: newPaid, is_paid: newPaid >= toNum(due.amount) - 0.001 } };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /** Descuenta de una cuenta cualquiera (efectivo, débito u otra tarjeta). */
    private static async deductFromAccount(client: PoolClient, userId: number, accountId: number, amount: number): Promise<number> {
        const { rows: sourceRows } = await client.query(
            'SELECT id FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE',
            [accountId, userId]
        );
        if (!sourceRows[0]) throw new HttpError(404, 'Cuenta de origen no encontrada');
        await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, accountId]);
        return accountId;
    }

    /** Descuenta de los ahorros (inserta la fila si no existe). */
    private static async deductFromSavings(client: PoolClient, userId: number, amount: number): Promise<void> {
        await client.query(
            `INSERT INTO user_savings (user_id, total_amount, currency)
             VALUES ($1, 0 - $2::numeric, 'USD')
             ON CONFLICT (user_id) DO UPDATE SET total_amount = user_savings.total_amount - $2::numeric, updated_at = NOW()`,
            [userId, amount]
        );
    }

    /** Calendario: todo lo que vence en un rango de fechas (dues + gastos únicos). */
    static async getCalendar(userId: number, from: string, to: string): Promise<Due[]> {
        await this.ensureRecurringDues(userId, addMonths(todayISO(), RECURRENT_HORIZON_MONTHS));
        const { rows } = await pool.query(
            `SELECT d.*, e.name AS expense_name, e.category, e.expense_type, a.name AS account_name
             FROM dues d
             JOIN expenses e ON e.id = d.expense_id
             JOIN accounts a ON a.id = d.account_id
             WHERE d.user_id = $1 AND d.due_date BETWEEN $2 AND $3
             ORDER BY d.due_date ASC, d.id ASC`,
            [userId, from, to]
        );
        return rows;
    }

    static async update(id: number, userId: number, data: UpdateExpenseDTO): Promise<Expense | null> {
        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;
        for (const key of ['name', 'category'] as const) {
            if (data[key] !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push(data[key]);
                idx++;
            }
        }
        if (fields.length === 0) return this.getById(id, userId);

        values.push(id, userId);
        await pool.query(`UPDATE expenses SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1}`, values);
        return this.getById(id, userId);
    }

    static async remove(id: number, userId: number): Promise<boolean> {
        const { rowCount } = await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
        return (rowCount ?? 0) > 0;
    }
}
