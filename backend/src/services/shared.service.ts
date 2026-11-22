import pool, { getClient } from '../db/pool';
import { HttpError } from '../utils/errors';
import { clampDay, toISO, toNum, todayISO } from '../utils/dates';
import {
    CreateSharedGroupDTO,
    SharedGroup,
    SharedMember,
    UpdateSharedGroupDTO,
    UpdateSharedMemberDTO,
} from '../models/Shared';

const PERIOD_RE = /^\d{4}-(?:0[1-9]|1[0-2])$/;

const currentPeriod = (): string => todayISO().slice(0, 7);

/** Suma n meses a un periodo 'YYYY-MM'. */
function addPeriods(period: string, n: number): string {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

type MemberStatus = 'pagado' | 'pendiente' | 'por_vencer' | 'adelantado';

interface MemberWithStatus extends SharedMember {
    status: MemberStatus;
    advance_until: string | null;
    last_payment_at: string | null;
    total_paid: number;
    paid_current: boolean;
}

export interface SharedAlert {
    id: number;
    name: string;
    due_day: number | null;
    member_cuota: number;
    total_cost: number | null;
    active_members: number;
    paid_count: number;
    pending: { id: number; name: string }[];
    advance: { name: string; until: string }[];
    collected: number;
    expected: number;
}

export class SharedService {
    // ---------------- Grupos ----------------

    static async listGroups(userId: number): Promise<SharedGroup[]> {
        const { rows } = await pool.query(
            `SELECT g.*, (SELECT COUNT(*)::int FROM shared_members m WHERE m.group_id = g.id AND m.active) AS members_count
             FROM shared_groups g WHERE g.user_id = $1 ORDER BY g.created_at ASC`,
            [userId]
        );
        return rows;
    }

    static async createGroup(userId: number, data: CreateSharedGroupDTO): Promise<SharedGroup> {
        if (!data.name) throw new HttpError(400, 'El nombre del grupo es requerido');
        if (data.member_cuota !== undefined && Number(data.member_cuota) < 0) {
            throw new HttpError(400, 'La cuota no puede ser negativa');
        }
        if (data.due_day !== null && data.due_day !== undefined && (data.due_day < 1 || data.due_day > 28)) {
            throw new HttpError(400, 'El día de cobro debe estar entre 1 y 28');
        }
        const { rows } = await pool.query(
            `INSERT INTO shared_groups (user_id, name, member_cuota, due_day, total_cost)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, data.name, data.member_cuota ?? 0, data.due_day ?? null, data.total_cost ?? null]
        );
        return rows[0];
    }

    static async updateGroup(userId: number, id: number, data: UpdateSharedGroupDTO): Promise<SharedGroup | null> {
        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;
        for (const key of ['name', 'member_cuota', 'due_day', 'total_cost'] as const) {
            if ((data as Record<string, unknown>)[key] !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push((data as Record<string, unknown>)[key]);
                idx++;
            }
        }
        if (fields.length === 0) return this.getGroup(userId, id);

        values.push(id, userId);
        const { rows } = await pool.query(
            `UPDATE shared_groups SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
            values
        );
        return rows[0] || null;
    }

    static async deleteGroup(userId: number, id: number): Promise<boolean> {
        const { rowCount } = await pool.query('DELETE FROM shared_groups WHERE id = $1 AND user_id = $2', [id, userId]);
        return (rowCount ?? 0) > 0;
    }

    // ---------------- Miembros ----------------

    static async addMember(userId: number, groupId: number, data: { name: string; note?: string; active?: boolean }): Promise<SharedMember> {
        if (!data.name) throw new HttpError(400, 'El nombre del miembro es requerido');
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const { rows: groupRows } = await client.query(
                'SELECT id FROM shared_groups WHERE id = $1 AND user_id = $2',
                [groupId, userId]
            );
            if (!groupRows[0]) throw new HttpError(404, 'Grupo no encontrado');
            const { rows } = await client.query(
                `INSERT INTO shared_members (group_id, user_id, name, note, active)
                 VALUES ($1, $2, $3, $4, COALESCE($5, true))
                 ON CONFLICT (group_id, name) DO NOTHING RETURNING *`,
                [groupId, userId, data.name, data.note ?? null, data.active]
            );
            if (rows.length === 0) {
                throw new HttpError(400, `Ya existe un miembro llamado "${data.name}" en este grupo`);
            }
            await client.query('COMMIT');
            return rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async updateMember(userId: number, id: number, data: UpdateSharedMemberDTO): Promise<SharedMember | null> {
        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;
        for (const key of ['name', 'note', 'active'] as const) {
            if ((data as Record<string, unknown>)[key] !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push((data as Record<string, unknown>)[key]);
                idx++;
            }
        }
        if (fields.length === 0) return this.getMember(userId, id);

        values.push(id, userId);
        const { rows } = await pool.query(
            `UPDATE shared_members SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
            values
        );
        return rows[0] || null;
    }

    static async deleteMember(userId: number, id: number): Promise<boolean> {
        const { rowCount } = await pool.query('DELETE FROM shared_members WHERE id = $1 AND user_id = $2', [id, userId]);
        return (rowCount ?? 0) > 0;
    }

    // ---------------- Pagos ----------------

    /**
     * Registra el pago de un miembro cubriendo `months` periodos mensuales,
     * empezando en su primer periodo pendiente (o en start_period si viene).
     * Un registro por periodo cubierto (UNIQUE member+period) y el total
     * se acredita a la cuenta Efectivo del usuario.
     */
    static async registerPayment(
        userId: number,
        memberId: number,
        data: { months: number; start_period?: string; amount?: number; note?: string }
    ) {
        const months = Number(data.months);
        if (!Number.isInteger(months) || months < 1 || months > 12) {
            throw new HttpError(400, 'Los meses a cubrir deben estar entre 1 y 12');
        }
        if (data.start_period !== undefined && !PERIOD_RE.test(data.start_period)) {
            throw new HttpError(400, 'start_period debe tener formato YYYY-MM');
        }

        const client = await getClient();
        try {
            await client.query('BEGIN');

            const { rows: memberRows } = await client.query(
                `SELECT m.*, g.member_cuota, g.name AS group_name
                 FROM shared_members m JOIN shared_groups g ON g.id = m.group_id
                 WHERE m.id = $1 AND m.user_id = $2 FOR UPDATE`,
                [memberId, userId]
            );
            const member = memberRows[0];
            if (!member) throw new HttpError(404, 'Miembro no encontrado');

            const perMonth = data.amount !== undefined ? Number(data.amount) : toNum(member.member_cuota);
            if (!(perMonth > 0)) {
                throw new HttpError(400, 'Define un monto por mes mayor a 0 (la cuota del grupo es 0)');
            }

            // Arranca en el primer periodo pendiente a partir del mes actual
            let start = data.start_period;
            if (start === undefined) {
                const { rows: paidRows } = await client.query('SELECT period FROM shared_payments WHERE member_id = $1', [memberId]);
                const paidSet = new Set(paidRows.map((r) => String(r.period)));
                let p = currentPeriod();
                for (let i = 0; i < 24; i++) {
                    if (!paidSet.has(p)) break;
                    p = addPeriods(p, 1);
                }
                start = p;
            }

            const periods = Array.from({ length: months }, (_, i) => addPeriods(start!, i));
            const { rows: conflicts } = await client.query(
                'SELECT period FROM shared_payments WHERE member_id = $1 AND period::text = ANY($2::text[])',
                [memberId, periods]
            );
            if (conflicts.length > 0) {
                throw new HttpError(
                    400,
                    `${member.name} ya tiene registrado el pago de ${conflicts.map((r) => r.period).join(', ')}`
                );
            }

            const inserted = [];
            for (const period of periods) {
                const { rows } = await client.query(
                    `INSERT INTO shared_payments (user_id, group_id, member_id, period, amount, note)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [userId, member.group_id, memberId, period, perMonth, data.note ?? null]
                );
                inserted.push(rows[0]);
            }

            const total = Math.round(perMonth * months * 100) / 100;
            let credited = 0;
            const { rows: efectivoRows } = await client.query(
                "SELECT id FROM accounts WHERE user_id = $1 AND type = 'efectivo' ORDER BY created_at ASC LIMIT 1",
                [userId]
            );
            if (efectivoRows[0]) {
                await client.query('UPDATE accounts SET balance = balance + $1::numeric WHERE id = $2', [total, efectivoRows[0].id]);
                credited = total;
            }

            await client.query('COMMIT');
            return { payments: inserted, periods, total, credited };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /** Elimina un pago registrado y revierte el abono a Efectivo. */
    static async deletePayment(userId: number, paymentId: number): Promise<{ amount: number }> {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(
                'SELECT * FROM shared_payments WHERE id = $1 AND user_id = $2 FOR UPDATE',
                [paymentId, userId]
            );
            const payment = rows[0];
            if (!payment) throw new HttpError(404, 'Pago no encontrado');

            await client.query('DELETE FROM shared_payments WHERE id = $1', [paymentId]);
            const amount = toNum(payment.amount);
            const { rows: efectivoRows } = await client.query(
                "SELECT id FROM accounts WHERE user_id = $1 AND type = 'efectivo' ORDER BY created_at ASC LIMIT 1",
                [userId]
            );
            if (efectivoRows[0]) {
                await client.query('UPDATE accounts SET balance = balance - $1::numeric WHERE id = $2', [amount, efectivoRows[0].id]);
            }
            await client.query('COMMIT');
            return { amount };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ---------------- Vistas ----------------

    private static statusFor(member: { id: number }, payments: { period: string }[], dueDay: number | null): {
        status: MemberStatus;
        paid_current: boolean;
        advance_until: string | null;
    } {
        const cur = currentPeriod();
        const paidSet = new Set(payments.map((p) => String(p.period)));
        const paidCurrent = paidSet.has(cur);
        const futurePeriods = payments.map((p) => String(p.period)).filter((p) => p > cur).sort();
        const advanceUntil = futurePeriods.length > 0 ? futurePeriods[futurePeriods.length - 1] : null;

        let status: MemberStatus;
        if (paidCurrent) {
            status = advanceUntil ? 'adelantado' : 'pagado';
        } else {
            const [y, mo] = cur.split('-').map(Number);
            const dueDate = toISO(y, mo - 1, clampDay(dueDay ?? 28, y, mo - 1));
            status = todayISO() > dueDate ? 'pendiente' : 'por_vencer';
        }
        return { status, paid_current: paidCurrent, advance_until: advanceUntil };
    }

    /** Alertas compactas para el widget del panel. */
    static async getAlerts(userId: number): Promise<SharedAlert[]> {
        const cur = currentPeriod();
        const { rows: groups } = await pool.query('SELECT * FROM shared_groups WHERE user_id = $1 ORDER BY created_at ASC', [userId]);
        const alerts: SharedAlert[] = [];

        for (const group of groups) {
            const { rows: members } = await pool.query(
                'SELECT id, name FROM shared_members WHERE group_id = $1 AND active ORDER BY name ASC',
                [group.id]
            );
            const { rows: payments } = await pool.query(
                'SELECT member_id, period, amount FROM shared_payments WHERE group_id = $1',
                [group.id]
            );
            const byMember = new Map<number, { period: string; amount: string }[]>();
            for (const p of payments) {
                if (!byMember.has(p.member_id)) byMember.set(p.member_id, []);
                byMember.get(p.member_id)!.push({ period: String(p.period), amount: p.amount });
            }

            let paidCount = 0;
            const pending: { id: number; name: string }[] = [];
            const advance: { name: string; until: string }[] = [];
            let collected = 0;
            for (const m of members) {
                const memberPayments = byMember.get(m.id) ?? [];
                const { status, advance_until } = this.statusFor(m, memberPayments, group.due_day);
                if (memberPayments.some((p) => p.period === cur)) {
                    paidCount++;
                    collected += memberPayments.filter((p) => p.period === cur).reduce((acc, p) => acc + toNum(p.amount), 0);
                }
                if (status === 'pendiente' || status === 'por_vencer') pending.push({ id: m.id, name: m.name });
                if (advance_until) advance.push({ name: m.name, until: advance_until });
            }

            alerts.push({
                id: group.id,
                name: group.name,
                due_day: group.due_day,
                member_cuota: toNum(group.member_cuota),
                total_cost: group.total_cost === null ? null : toNum(group.total_cost),
                active_members: members.length,
                paid_count: paidCount,
                pending,
                advance,
                collected: Math.round(collected * 100) / 100,
                expected: Math.round(toNum(group.member_cuota) * members.length * 100) / 100,
            });
        }
        return alerts;
    }

    /** Detalle de grupo: miembros con estatus y pagos recientes. */
    static async getGroupDetail(userId: number, groupId: number) {
        const group = await this.getGroup(userId, groupId);
        const { rows: memberRows } = await pool.query(
            'SELECT * FROM shared_members WHERE group_id = $1 ORDER BY active DESC, name ASC',
            [groupId]
        );
        const { rows: paymentRows } = await pool.query(
            'SELECT * FROM shared_payments WHERE group_id = $1 ORDER BY paid_at DESC',
            [groupId]
        );

        const byMember = new Map<number, { id: number; period: string; amount: string; paid_at: Date }[]>();
        for (const p of paymentRows) {
            if (!byMember.has(p.member_id)) byMember.set(p.member_id, []);
            byMember.get(p.member_id)!.push({ id: p.id, period: String(p.period), amount: p.amount, paid_at: p.paid_at });
        }

        const members: MemberWithStatus[] = memberRows.map((m) => {
            const payments = byMember.get(m.id) ?? [];
            const { status, paid_current, advance_until } = this.statusFor(m, payments, group.due_day);
            const last = payments.length
                ? payments.slice().sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1))[0].paid_at
                : null;
            return {
                ...m,
                status,
                paid_current,
                advance_until,
                last_payment_at: last ? new Date(last).toISOString() : null,
                total_paid: Math.round(payments.reduce((acc, p) => acc + toNum(p.amount), 0) * 100) / 100,
            };
        });

        const recentPayments = paymentRows.slice(0, 30).map((p) => ({
            ...p,
            period: String(p.period),
            member_name: memberRows.find((m) => m.id === p.member_id)?.name ?? '—',
        }));

        return { group, members, recent_payments: recentPayments };
    }

    // ---------------- helpers ----------------

    private static async getGroup(userId: number, id: number): Promise<SharedGroup> {
        const { rows } = await pool.query('SELECT * FROM shared_groups WHERE id = $1 AND user_id = $2', [id, userId]);
        if (!rows[0]) throw new HttpError(404, 'Grupo no encontrado');
        return rows[0];
    }

    private static async getMember(userId: number, id: number): Promise<SharedMember> {
        const { rows } = await pool.query('SELECT * FROM shared_members WHERE id = $1 AND user_id = $2', [id, userId]);
        if (!rows[0]) throw new HttpError(404, 'Miembro no encontrado');
        return rows[0];
    }

    static async getAll(userId: number): Promise<SharedGroup[]> {
        return this.listGroups(userId);
    }
}
