import pool, { getClient } from '../db/pool';
import { HttpError } from '../utils/errors';
import { toNum } from '../utils/dates';

export class TransfersService {
    /**
     * Traspaso libre entre dos cuentas del usuario (Efectivo -> débito,
     * entre débitos, etc.). Actualiza ambos saldos y deja registro
     * trazable en account_transfers.
     */
    static async create(
        userId: number,
        data: { from_account_id: number; to_account_id: number; amount: number; note?: string }
    ) {
        const amount = toNum(data.amount);
        if (amount <= 0) throw new HttpError(400, 'El monto del traspaso debe ser mayor a 0');
        if (data.from_account_id === data.to_account_id) {
            throw new HttpError(400, 'El origen y el destino no pueden ser la misma cuenta');
        }

        const client = await getClient();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(
                "SELECT id, name FROM accounts WHERE id = ANY($1::int[]) AND user_id = $2 FOR UPDATE",
                [[data.from_account_id, data.to_account_id], userId]
            );
            if (rows.length < 2) throw new HttpError(404, 'Origen o destino no encontrados');

            await client.query('UPDATE accounts SET balance = balance - $1::numeric WHERE id = $2', [amount, data.from_account_id]);
            await client.query('UPDATE accounts SET balance = balance + $1::numeric WHERE id = $2', [amount, data.to_account_id]);

            const { rows: transferRows } = await client.query(
                `INSERT INTO account_transfers (user_id, from_account_id, to_account_id, amount, note)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [userId, data.from_account_id, data.to_account_id, amount, data.note ?? null]
            );

            await client.query('COMMIT');
            return { transfer: transferRows[0], amount };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
