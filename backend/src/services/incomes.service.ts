import pool, { getClient } from '../db/pool';
import { HttpError } from '../utils/errors';
import { clampDay, daysInMonth, parseISO, toISO, toNum, todayISO } from '../utils/dates';
import { CreateIncomeDTO, Income, IncomeType, UpdateIncomeDTO } from '../models/Income';

export interface IncomeOccurrence {
    date: string;
    income_id: number;
    name: string;
    amount: number;
    income_type: IncomeType;
}

// La quincena es fija: día 15 y día 28 (febrero recorta al 28)
const QUINCENA_DAYS = [15, 28];

export class IncomesService {
    static async list(userId: number): Promise<Income[]> {
        const { rows } = await pool.query(
            'SELECT * FROM incomes WHERE user_id = $1 ORDER BY income_type ASC, created_at DESC',
            [userId]
        );
        return rows;
    }

    static async create(userId: number, data: CreateIncomeDTO): Promise<Income> {
        if (!data.name) throw new HttpError(400, 'El nombre del ingreso es requerido');
        if (!data.amount || data.amount <= 0) throw new HttpError(400, 'El monto debe ser mayor a 0');

        if (data.income_type === 'unico') {
            if (!data.received_at) throw new HttpError(400, 'Los ingresos únicos requieren una fecha');
            const { rows } = await pool.query(
                `INSERT INTO incomes (user_id, name, amount, income_type, received_at)
                 VALUES ($1, $2, $3, 'unico', $4) RETURNING *`,
                [userId, data.name, data.amount, data.received_at]
            );
            return rows[0];
        }

        // Quincenal: los pagos son fijos (15 y 28); el día es irrelevante.
        const nextPayDay =
            data.frequency === 'quincenal' ? (data.next_pay_day ?? 15) : data.next_pay_day;
        if (!data.frequency || !nextPayDay || nextPayDay < 1 || nextPayDay > 28) {
            throw new HttpError(400, 'Los ingresos frecuentes requieren frecuencia y día de pago (1-28)');
        }
        const { rows } = await pool.query(
            `INSERT INTO incomes (user_id, name, amount, income_type, frequency, next_pay_day)
             VALUES ($1, $2, $3, 'frecuente', $4, $5) RETURNING *`,
            [userId, data.name, data.amount, data.frequency, nextPayDay]
        );
        return rows[0];
    }

    static async update(id: number, userId: number, data: UpdateIncomeDTO): Promise<Income | null> {
        const existing = await this.getById(id, userId);
        if (!existing) return null;
        if (existing.income_type === 'unico' && (data.frequency !== undefined || data.next_pay_day !== undefined)) {
            throw new HttpError(400, 'Un ingreso único no lleva frecuencia ni día de pago');
        }
        if (existing.income_type === 'frecuente' && data.received_at !== undefined) {
            throw new HttpError(400, 'Un ingreso frecuente no lleva fecha de recepción');
        }

        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;
        for (const key of ['name', 'amount', 'frequency', 'next_pay_day', 'received_at'] as const) {
            if ((data as Record<string, unknown>)[key] !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push((data as Record<string, unknown>)[key]);
                idx++;
            }
        }
        if (fields.length === 0) return existing;

        values.push(id, userId);
        const { rows } = await pool.query(
            `UPDATE incomes SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
            values
        );
        return rows[0];
    }

    static async getById(id: number, userId: number): Promise<Income | null> {
        const { rows } = await pool.query('SELECT * FROM incomes WHERE id = $1 AND user_id = $2', [id, userId]);
        return rows[0] || null;
    }

    static async remove(id: number, userId: number): Promise<boolean> {
        const { rowCount } = await pool.query('DELETE FROM incomes WHERE id = $1 AND user_id = $2', [id, userId]);
        return (rowCount ?? 0) > 0;
    }

    /**
     * Proyecta las ocurrencias de ingresos dentro de un rango:
     *  - unico: la fecha en que se recibió (si cae en el rango)
     *  - frecuente semanal: 4 ocurrencias por mes (día, +7, +14, +21)
     *  - frecuente quincenal: fijas 15 y 28
     *  - frecuente mensual: 1 (día)
     * Ninguna ocurrencia es anterior a la fecha de creación del ingreso.
     */
    static projectInRange(incomes: Income[], from: string, to: string): IncomeOccurrence[] {
        const occurrences: IncomeOccurrence[] = [];
        const start = parseISO(from);
        const end = parseISO(to);

        for (const income of incomes) {
            const amount = toNum(income.amount);
            const createdDate = income.created_at
                ? todayUTCString(income.created_at)
                : '0000-01-01';
            const anchor = createdDate > from ? createdDate : from;

            if (income.income_type === 'unico') {
                if (income.received_at && income.received_at >= anchor && income.received_at <= to) {
                    occurrences.push({ date: income.received_at, income_id: income.id, name: income.name, amount, income_type: 'unico' });
                }
                continue;
            }

            const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

            while (cursor <= end) {
                const year = cursor.getUTCFullYear();
                const monthIdx = cursor.getUTCMonth();
                const monthDays = daysInMonth(year, monthIdx);

                let candidateDays: number[];
                if (income.frequency === 'quincenal') {
                    candidateDays = QUINCENA_DAYS.map((d) => Math.min(d, monthDays));
                } else {
                    const baseDay = clampDay(income.next_pay_day ?? 1, year, monthIdx);
                    const offsets = income.frequency === 'semanal' ? [0, 7, 14, 21] : [0];
                    candidateDays = offsets.map((o) => Math.min(baseDay + o, monthDays));
                }

                for (const day of candidateDays) {
                    const date = toISO(year, monthIdx, day);
                    if (date >= anchor && date <= to) {
                        occurrences.push({ date, income_id: income.id, name: income.name, amount, income_type: 'frecuente' });
                    }
                }
                cursor.setUTCMonth(cursor.getUTCMonth() + 1);
            }
        }

        return occurrences.sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Liquida los ingresos cuya fecha ya llegó o pasó: cada ocurrencia se
     * acredita UNA sola vez a la primera cuenta de efectivo del usuario
     * (idempotente por income_settlements). Llamar al abrir panel/flujo.
     */
    static async settleIncomes(userId: number): Promise<void> {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            const today = todayISO();
            const { rows: efectivoRows } = await client.query(
                "SELECT id FROM accounts WHERE user_id = $1 AND type = 'efectivo' ORDER BY created_at ASC LIMIT 1",
                [userId]
            );
            const efectivoId = efectivoRows[0]?.id;
            if (!efectivoId) {
                await client.query('ROLLBACK');
                return;
            }

            const { rows: incomeRows } = await client.query('SELECT * FROM incomes WHERE user_id = $1', [userId]);
            const incomes = incomeRows as Income[];
            const occurrences = this.projectInRange(incomes, '2000-01-01', today);

            for (const occ of occurrences) {
                const { rows: inserted } = await client.query(
                    `INSERT INTO income_settlements (user_id, income_id, settled_date, amount)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (income_id, settled_date) DO NOTHING
                     RETURNING id`,
                    [userId, occ.income_id, occ.date, occ.amount]
                );
                if (inserted.length > 0) {
                    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [
                        occ.amount,
                        efectivoId,
                    ]);
                }
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async getAll(userId: number): Promise<Income[]> {
        return this.list(userId);
    }
}

/** Fecha (UTC) de un timestamp en 'YYYY-MM-DD'. */
function todayUTCString(timestamp: Date | string): string {
    const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return toISO(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
