/**
 * Utilidades de fecha basadas en strings 'YYYY-MM-DD' (fechas de calendario,
 * sin zonas horarias). pg devuelve DATE como string en ese formato.
 */

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const toISO = (year: number, monthIdx: number, day: number): string =>
    `${year}-${pad2(monthIdx + 1)}-${pad2(day)}`;

export function parseISO(value: string | Date): Date {
    if (value instanceof Date) {
        return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    }
    const [y, m, d] = value.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

export function todayISO(): string {
    const now = new Date();
    return toISO(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Último día del mes (1-31) para year/monthIdx. */
export function daysInMonth(year: number, monthIdx: number): number {
    return new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
}

/** Día recortado al largo real del mes (31 -> 28 en febrero). */
export function clampDay(day: number, year: number, monthIdx: number): number {
    return Math.min(day, daysInMonth(year, monthIdx));
}

/** Suma n meses a una fecha 'YYYY-MM-DD' recortando el día al mes destino. */
export function addMonths(dateStr: string, n: number): string {
    const d = parseISO(dateStr);
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
    const day = clampDay(d.getUTCDate(), target.getUTCFullYear(), target.getUTCMonth());
    return toISO(target.getUTCFullYear(), target.getUTCMonth(), day);
}

/** Primer día de corte >= fromDate para un día de corte dado. */
export function nextCutDate(fromDate: string, cutDay: number): string {
    const d = parseISO(fromDate);
    const day = clampDay(cutDay, d.getUTCFullYear(), d.getUTCMonth());
    if (d.getUTCDate() <= day) {
        return toISO(d.getUTCFullYear(), d.getUTCMonth(), day);
    }
    return addMonths(toISO(d.getUTCFullYear(), d.getUTCMonth(), day), 1);
}

/**
 * Fecha límite de pago del ciclo que cierra en cutDate:
 * si el día de pago es posterior al corte, cae en el mismo mes del corte;
 * si es anterior (o igual), cae al mes siguiente.
 * Ej.: corte día 28, pago límite día 10 -> ciclo que cierra 28/nov se paga el 10/dic.
 */
export function paymentDateForCut(cutDate: string, cutDay: number, payDay: number): string {
    const d = parseISO(cutDate);
    const day = clampDay(payDay, d.getUTCFullYear(), d.getUTCMonth());
    const sameMonth = toISO(d.getUTCFullYear(), d.getUTCMonth(), day);
    return payDay > cutDay ? sameMonth : addMonths(sameMonth, 1);
}

export function addDays(dateStr: string, n: number): string {
    const d = parseISO(dateStr);
    d.setUTCDate(d.getUTCDate() + n);
    return toISO(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Ventana del ciclo de una tarjeta (crédito): (corte anterior, próximo corte].
 * Si hoy es el día de corte, el próximo corte es hoy.
 */
export function cycleWindow(reference: string, cutDay: number): { from: string; to: string } {
    const next = nextCutDate(reference, cutDay);
    const prev = addMonths(next, -1);
    return { from: addDays(prev, 1), to: next };
}

/** Ventana del mes natural de una fecha. */
export function monthWindow(reference: string): { from: string; to: string } {
    const d = parseISO(reference);
    const last = daysInMonth(d.getUTCFullYear(), d.getUTCMonth());
    return { from: toISO(d.getUTCFullYear(), d.getUTCMonth(), 1), to: toISO(d.getUTCFullYear(), d.getUTCMonth(), last) };
}

export const toNum = (value: unknown): number => parseFloat(String(value ?? 0)) || 0;
