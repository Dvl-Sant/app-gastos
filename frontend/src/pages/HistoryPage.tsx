import { useState } from 'react';
import { Alert, DatePicker, Skeleton, Statistic } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { motion } from 'framer-motion';
import { ArrowDownLeft } from 'lucide-react';
import receiptWallet from '../assets/receipt-wallet.svg';
import AppHeader from '../components/AppHeader';
import { api, useFetch } from '../hooks/useFetch';
import { formatCurrency } from '../utils/format';

interface Range {
    from: Dayjs;
    to: Dayjs;
}

const { RangePicker } = DatePicker;

export default function HistoryPage() {
    const [range, setRange] = useState<Range>({ from: dayjs().startOf('month'), to: dayjs().endOf('month') });

    const history = useFetch(
        () => api.history(range.from.format('YYYY-MM-DD'), range.to.format('YYYY-MM-DD')),
        [range.from.format('YYYY-MM-DD'), range.to.format('YYYY-MM-DD')]
    );

    const data = history.data;
    const inflowsTotal = (data?.inflows ?? []).reduce((acc, e) => acc + Number(e.amount), 0);

    return (
        <div className="flex flex-col min-h-screen bg-background-light">
            <AppHeader icon={<img src={receiptWallet} alt="" className="w-6 h-6" />} subtitle="Detalles" title="Historial de Movimientos" />

            <main className="flex-1 px-4 py-6 space-y-6 max-w-5xl w-full mx-auto">
                {history.error && <Alert type="error" showIcon message={history.error} />}

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h3 className="text-lg font-bold text-slate-800">Movimientos del rango</h3>
                    <RangePicker
                        value={[range.from, range.to]}
                        onChange={(dates) => {
                            if (dates && dates[0] && dates[1]) setRange({ from: dates[0], to: dates[1] });
                        }}
                        format="DD/MM/YYYY"
                        allowClear={false}
                    />
                </div>

                {history.loading ? (
                    <div className="bg-white rounded-xl p-6 border border-border-subtle">
                        <Skeleton active paragraph={{ rows: 6 }} />
                    </div>
                ) : (
                    <>
                        {/* Dinero que entra */}
                        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
                                <div className="bg-success/5 px-6 py-4 border-b border-border-subtle flex justify-between items-center flex-wrap gap-3">
                                    <h3 className="text-base font-bold text-success flex items-center gap-2">
                                        <ArrowDownLeft className="w-5 h-5" /> Dinero que entró
                                    </h3>
                                    <Statistic
                                        title={<span className="text-[10px] uppercase font-bold text-slate-500">Total entradas</span>}
                                        value={formatCurrency(inflowsTotal)}
                                        valueStyle={{ fontSize: '1.1rem', color: '#10b981', fontWeight: 800 }}
                                    />
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {(data?.inflows ?? []).length === 0 ? (
                                        <p className="text-slate-500 italic text-center py-6">Sin entradas de dinero en este rango.</p>
                                    ) : (
                                        (data?.inflows ?? []).map((entry) => (
                                            <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                                                        {entry.name}
                                                        <span
                                                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                                entry.kind === 'ingreso'
                                                                    ? 'bg-green-50 text-green-600'
                                                                    : entry.kind === 'abono'
                                                                        ? 'bg-emerald-50 text-emerald-600'
                                                                        : 'bg-blue-50 text-blue-600'
                                                            }`}
                                                        >
                                                            {entry.kind === 'ingreso' ? 'Ingreso' : entry.kind === 'abono' ? 'Abono préstamo' : 'Compartido'}
                                                        </span>
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 font-medium">
                                                        {new Date(entry.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} • {entry.detail}
                                                        {entry.note ? ` • ${entry.note}` : ''}
                                                    </p>
                                                </div>
                                                <span className="text-success font-bold whitespace-nowrap">+{formatCurrency(entry.amount)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.section>

                        {/* Préstamos otorgados */}
                        {(data?.loans_given ?? []).length > 0 && (
                            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                                <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
                                    <div className="bg-purple-50 px-6 py-4 border-b border-border-subtle">
                                        <h3 className="text-base font-bold text-purple-600">Préstamos otorgados</h3>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {(data?.loans_given ?? []).map((l) => (
                                            <div key={l.id} className="flex items-center justify-between px-4 py-3">
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">
                                                        {l.person_name} <span className="text-slate-400 font-medium">• {l.concept}</span>
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 font-medium">
                                                        {new Date(`${l.loan_date}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        {l.account_name ? ` • salió de ${l.account_name}` : ''}
                                                    </p>
                                                </div>
                                                <span className="text-danger font-bold">-{formatCurrency(l.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.section>
                        )}

                        {/* Grupos de salidas (pagos por cuenta + traspasos) */}
                        {(data?.groups ?? []).length === 0 && (data?.inflows ?? []).length === 0 && (
                            <p className="text-slate-500 italic text-center w-full py-8">No hay movimientos en este rango.</p>
                        )}

                        {(data?.groups ?? []).map((group, index) => (
                            <motion.div
                                key={`${group.kind}-${group.account_id}`}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
                                className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm"
                            >
                                <div className="bg-primary/5 px-6 py-4 border-b border-border-subtle flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-primary">
                                        {group.kind === 'traspasos' ? 'Ahorros — Traspasos recibidos' : group.account_name}
                                    </h3>
                                    <span className="text-sm font-semibold text-slate-500">
                                        {group.kind === 'traspasos' ? 'Total traspasado:' : 'Total pagado:'}{' '}
                                        <span className="text-slate-900">{formatCurrency(group.total)}</span>
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                                                <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Fecha</th>
                                                <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Concepto</th>
                                                <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Pago</th>
                                                <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-right">Origen</th>
                                                <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-right">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {group.payments.map((p) => (
                                                <tr key={p.id}>
                                                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                                                        {new Date(p.paid_at).toLocaleDateString('es-ES', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-900 font-semibold">
                                                        {p.expense_name ?? p.note ?? (group.kind === 'traspasos' ? 'Traspaso a ahorros' : '—')}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 text-xs font-bold whitespace-nowrap">
                                                        {p.installments && p.installment_no ? `${p.installment_no}/${p.installments}` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-500 text-xs">{p.source_account_name ?? 'Ahorros'}</td>
                                                    <td className="px-4 py-3 text-right text-slate-900 font-bold">{formatCurrency(p.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        ))}
                    </>
                )}
            </main>
        </div>
    );
}
