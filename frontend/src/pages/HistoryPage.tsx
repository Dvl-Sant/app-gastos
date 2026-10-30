import { Alert, Skeleton } from 'antd';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { api, useFetch } from '../hooks/useFetch';
import { formatCurrency } from '../utils/format';

export default function HistoryPage() {
    const history = useFetch(api.history);

    return (
        <div className="flex flex-col min-h-screen bg-background-light">
            <AppHeader icon={<History className="text-primary w-5 h-5" />} subtitle="Detalles" title="Historial de Pagos" />

            <main className="flex-1 px-4 py-6 space-y-6 max-w-5xl w-full mx-auto">
                {history.error && <Alert type="error" showIcon message={history.error} />}

                {history.loading && (
                    <div className="bg-white rounded-xl p-6 border border-border-subtle">
                        <Skeleton active paragraph={{ rows: 6 }} />
                    </div>
                )}

                {!history.loading && (history.data ?? []).length === 0 && (
                    <p className="text-slate-500 italic text-center w-full py-8">No hay pagos registrados todavía.</p>
                )}

                {(history.data ?? []).map((group, index) => (
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
            </main>
        </div>
    );
}
