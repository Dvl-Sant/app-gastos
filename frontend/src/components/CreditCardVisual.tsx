import { Wifi } from 'lucide-react';
import { Popconfirm } from 'antd';
import { motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import type { Account } from '../types';
import { formatCurrency } from '../utils/format';
import { cardGradient } from '../utils/color';

interface Props {
    account: Account;
    onOpen: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const DEFAULT_COLORS: Record<string, string> = {
    credito: '#6d28d9',
    debito: '#1e40af',
    efectivo: '#047857',
};

const typeLabels: Record<string, string> = {
    credito: 'TARJETA DE CRÉDITO',
    debito: 'TARJETA DE DÉBITO',
    efectivo: 'EFECTIVO',
};

/**
 * Tarjeta visual estilo tarjeta física: gradiente según el color configurado,
 * chip dorado, contactless y ondas decorativas.
 */
export default function CreditCardVisual({ account, onOpen, onEdit, onDelete }: Props) {
    const baseColor = account.color || DEFAULT_COLORS[account.type] || '#6d28d9';
    const isCredit = account.type === 'credito';

    return (
        <motion.div
            whileHover={{ scale: 1.03, rotate: -0.5 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpen}
            className="relative aspect-[1.586/1] rounded-2xl shadow-lg cursor-pointer overflow-hidden text-white select-none"
            style={{ background: cardGradient(baseColor) }}
        >
            {/* Ondas decorativas */}
            <svg viewBox="0 0 400 250" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                <circle cx="355" cy="30" r="110" fill="white" opacity="0.06" />
                <path d="M0,175 C110,115 260,225 400,145 L400,250 L0,250 Z" fill="white" opacity="0.08" />
                <path d="M0,205 C140,150 290,240 400,185 L400,250 L0,250 Z" fill="white" opacity="0.06" />
            </svg>

            {/* Acciones */}
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={onEdit} className="text-white/70 hover:text-white p-1" title="Editar cuenta">
                    <Pencil className="w-4 h-4" />
                </button>
                <Popconfirm
                    title="¿Eliminar cuenta?"
                    description="Se borran también sus gastos y mensualidades."
                    okText="Eliminar"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                    onConfirm={onDelete}
                >
                    <button className="text-white/70 hover:text-white p-1" title="Eliminar cuenta">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </Popconfirm>
            </div>

            {/* Contenido */}
            <div className="relative z-10 h-full flex flex-col justify-between p-4">
                <div>
                    <p className="font-extrabold uppercase tracking-wide text-sm leading-tight pr-14 truncate">{account.name}</p>
                    <p className="text-[9px] font-bold tracking-[0.2em] text-white/70">{typeLabels[account.type] ?? ''}</p>
                </div>

                <div className="flex items-center justify-between">
                    {/* Chip dorado */}
                    <div className="w-11 h-8 rounded-md bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 p-[3px] shadow">
                        <div className="w-full h-full rounded-sm border border-yellow-800/50 grid grid-cols-3 grid-rows-2 overflow-hidden">
                            <div className="border-r border-b border-yellow-800/40" />
                            <div className="border-r border-b border-yellow-800/40" />
                            <div className="border-b border-yellow-800/40" />
                            <div className="border-r border-yellow-800/40" />
                            <div className="border-r border-yellow-800/40" />
                            <div />
                        </div>
                    </div>
                    <Wifi className="w-6 h-6 rotate-90 text-white/80" />
                </div>

                <div>
                    <p className="font-mono tracking-[0.18em] text-white/90 text-sm">•••• {String(account.id).padStart(4, '0')}</p>
                    {isCredit ? (
                        <div className="mt-1 flex items-end justify-between gap-2">
                            <div>
                                <p className="text-[8px] font-bold uppercase tracking-widest text-white/60">Deuda pendiente</p>
                                <p className="text-lg font-extrabold leading-tight">{formatCurrency(account.pending_debt ?? 0)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-white/70 font-semibold leading-tight">
                                    Corte {account.cut_off_day} • Pago {account.payment_due_day ?? '—'}
                                </p>
                                {account.next_payment_date && typeof account.days_until_payment === 'number' && (
                                    <span
                                        className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            account.days_until_payment <= 5 ? 'bg-red-500/80' : 'bg-white/20'
                                        }`}
                                    >
                                        Paga{' '}
                                        {new Date(`${account.next_payment_date}T12:00:00`).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'short',
                                        })}{' '}
                                        ({account.days_until_payment}d)
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-1 flex items-end justify-between">
                            <div>
                                <p className="text-[8px] font-bold uppercase tracking-widest text-white/60">Saldo</p>
                                <p className="text-lg font-extrabold leading-tight">{formatCurrency(account.balance)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
