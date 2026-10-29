import { useState } from 'react';
import { Alert, App as AntApp, DatePicker, Skeleton, Statistic } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, CalendarRange } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import DuesTable from '../components/DuesTable';
import PaymentModal from '../components/PaymentModal';
import { api, useFetch } from '../hooks/useFetch';
import type { Due } from '../types';
import { formatCurrency } from '../utils/format';

interface Range {
    from: Dayjs;
    to: Dayjs;
}

const { RangePicker } = DatePicker;

export default function CashflowPage() {
    const { message } = AntApp.useApp();
    const [range, setRange] = useState<Range>({ from: dayjs().startOf('month'), to: dayjs().endOf('month') });

    const cashflow = useFetch(
        () => api.cashflow(range.from.format('YYYY-MM-DD'), range.to.format('YYYY-MM-DD')),
        [range.from.format('YYYY-MM-DD'), range.to.format('YYYY-MM-DD')]
    );

    const accounts = useFetch(api.accounts.list);
    const [payingDue, setPayingDue] = useState<Due | null>(null);

    const handleError = (e: unknown) => message.error(e instanceof Error ? e.message : 'Error inesperado');

    const payDue = async (amount: number | 'full', sourceAccountId: number) => {
        if (!payingDue) return;
        try {
            await api.dues.pay(payingDue.id, {
                amount: amount === 'full' ? undefined : amount,
                source_account_id: sourceAccountId,
            });
            message.success('Pago registrado');
            setPayingDue(null);
            await cashflow.reload();
            await accounts.reload();
        } catch (e) {
            handleError(e);
        }
    };

    const data = cashflow.data;
    const net = data ? data.totals.incomes - data.totals.dues : 0;

    return (
        <div className="flex flex-col min-h-screen bg-background-light">
            <AppHeader icon={<CalendarRange className="text-primary w-5 h-5" />} subtitle="Proyección" title="Flujo por Fechas" />

            <main className="flex-1 px-4 py-6 space-y-6 max-w-5xl w-full mx-auto">
                {cashflow.error && <Alert type="error" showIcon message={cashflow.error} />}

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h3 className="text-lg font-bold text-slate-800">¿Qué vence en este rango?</h3>
                    <RangePicker
                        value={[range.from, range.to]}
                        onChange={(dates) => {
                            if (dates && dates[0] && dates[1]) setRange({ from: dates[0], to: dates[1] });
                        }}
                        format="DD/MM/YYYY"
                        allowClear={false}
                    />
                </div>

                {cashflow.loading ? (
                    <Skeleton active paragraph={{ rows: 8 }} />
                ) : data ? (
                    <>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-4">
                                <Statistic
                                    title={<span className="text-[10px] uppercase font-bold text-slate-500">Ingresos en el rango</span>}
                                    value={formatCurrency(data.totals.incomes)}
                                    valueStyle={{ color: '#10b981', fontWeight: 800 }}
                                    prefix={<ArrowUpRight className="w-4 h-4 inline" />}
                                />
                            </div>
                            <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-4">
                                <Statistic
                                    title={<span className="text-[10px] uppercase font-bold text-slate-500">Gastos que vencen (pendiente)</span>}
                                    value={formatCurrency(data.totals.dues_pending)}
                                    valueStyle={{ color: '#ef4444', fontWeight: 800 }}
                                    prefix={<ArrowDownRight className="w-4 h-4 inline" />}
                                    suffix={<span className="text-[10px] text-slate-400">de {formatCurrency(data.totals.dues)}</span>}
                                />
                            </div>
                            <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-4">
                                <Statistic
                                    title={<span className="text-[10px] uppercase font-bold text-slate-500">Neto del periodo</span>}
                                    value={formatCurrency(net)}
                                    valueStyle={{ color: net >= 0 ? '#10b981' : '#ef4444', fontWeight: 800 }}
                                />
                            </div>
                        </motion.div>

                        {data.months.length > 1 && (
                            <section>
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Por mes</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {data.months.map((m, i) => (
                                        <motion.div
                                            key={m.month}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="bg-white rounded-xl border border-border-subtle shadow-sm p-3"
                                        >
                                            <p className="text-[10px] font-bold uppercase text-slate-500">
                                                {dayjs(`${m.month}-15`).format('MMMM YYYY')}
                                            </p>
                                            <p className="text-xs text-success font-bold">+{formatCurrency(m.incomes)}</p>
                                            <p className="text-xs text-danger font-bold">-{formatCurrency(m.dues)}</p>
                                            <p className={`text-[11px] font-extrabold mt-1 ${m.net >= 0 ? 'text-slate-900' : 'text-danger'}`}>
                                                Neto: {formatCurrency(m.net)}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section>
                            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                                Vencimientos ({data.dues.length})
                            </h4>
                            <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
                                <DuesTable dues={data.dues} showAccount onPay={(due) => setPayingDue(due)} />
                            </div>
                        </section>

                        <section>
                            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                                Ingresos proyectados ({data.income_occurrences.length})
                            </h4>
                            <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm divide-y divide-slate-50">
                                {data.income_occurrences.length === 0 ? (
                                    <p className="text-slate-500 italic text-center py-6">Sin ingresos en este rango.</p>
                                ) : (
                                    data.income_occurrences.map((occ, i) => (
                                        <div key={i} className="flex items-center justify-between px-4 py-3">
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{occ.name}</p>
                                                <p className="text-[10px] text-slate-400 font-semibold uppercase">
                                                    {new Date(`${occ.date}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} • {occ.income_type}
                                                </p>
                                            </div>
                                            <span className="text-success font-bold">+{formatCurrency(occ.amount)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </>
                ) : null}
            </main>

            <PaymentModal
                open={payingDue !== null}
                due={payingDue}
                statementPending={null}
                accounts={accounts.data ?? []}
                onCancel={() => setPayingDue(null)}
                onSubmit={payDue}
            />
        </div>
    );
}
