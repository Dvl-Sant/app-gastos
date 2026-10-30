import { Popconfirm, Table } from 'antd';
import type { TableProps } from 'antd';
import { Banknote, Pencil, Trash2 } from 'lucide-react';
import type { Expense } from '../types';
import { formatCurrency } from '../utils/format';

interface Props {
    expenses: Expense[];
    loading?: boolean;
    onPay?: (expense: Expense) => void;
    onEdit: (expense: Expense) => void;
    onDelete: (expense: Expense) => void;
}

const typeLabels: Record<string, string> = {
    recurrente: 'Recurrente',
    unico: 'Único',
    msi: 'A meses',
};

/** Lista de gastos declarados con pago anticipado, edición y eliminación. */
export default function ExpensesList({ expenses, loading, onPay, onEdit, onDelete }: Props) {
    const columns: TableProps<Expense>['columns'] = [
        {
            title: 'Concepto',
            key: 'concept',
            render: (_, expense) => (
                <div>
                    <p className="font-bold text-slate-900">{expense.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                        {expense.category ?? 'Sin categoría'} • {typeLabels[expense.expense_type] ?? expense.expense_type}
                        {expense.expense_type === 'msi' && expense.installments ? ` (${expense.installments} meses)` : ''}
                    </p>
                </div>
            ),
        },
        {
            title: 'Cuenta',
            dataIndex: 'account_name',
            key: 'account_name',
            width: 130,
            render: (value: string) => <span className="text-slate-600 text-xs font-semibold">{value}</span>,
        },
        {
            title: 'Monto',
            key: 'amount',
            align: 'right',
            render: (_, expense) =>
                expense.expense_type === 'recurrente' ? (
                    <span className="font-bold text-danger">{formatCurrency(expense.monthly_payment)}/mes</span>
                ) : (
                    <div>
                        <span className="font-bold text-danger">{formatCurrency(expense.total_amount)}</span>
                        {expense.expense_type === 'msi' && Number(expense.monthly_payment) > 0 && (
                            <p className="text-[10px] text-slate-400 font-semibold">
                                {formatCurrency(expense.monthly_payment)}/mes
                            </p>
                        )}
                    </div>
                ),
        },
        {
            title: 'Pendiente',
            dataIndex: 'pending_amount',
            key: 'pending_amount',
            align: 'right',
            render: (value: string, expense) =>
                expense.expense_type === 'unico' && expense.is_paid ? (
                    <span className="text-[10px] font-bold uppercase text-success">Pagado</span>
                ) : (
                    <span className="font-semibold text-slate-700">{formatCurrency(value)}</span>
                ),
        },
        {
            title: 'Próx. venc.',
            dataIndex: 'next_due_date',
            key: 'next_due_date',
            align: 'right',
            width: 120,
            render: (value: string | null) =>
                value ? (
                    <span className="text-slate-600 text-xs font-semibold whitespace-nowrap">
                        {new Date(`${value}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                ) : (
                    <span className="text-slate-400 text-xs">—</span>
                ),
        },
        {
            title: 'Acciones',
            key: 'actions',
            align: 'right',
            width: 140,
            render: (_, expense) => (
                <div className="flex items-center justify-end gap-1">
                    {onPay && expense.next_due_id && (
                        <button
                            onClick={() => onPay(expense)}
                            className="text-success mx-1 hover:opacity-70"
                            title={`Registrar pago (${formatCurrency(expense.next_due_amount ?? 0)})`}
                        >
                            <Banknote className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={() => onEdit(expense)} className="text-primary mx-1 hover:opacity-70" title="Editar">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <Popconfirm
                        title="¿Eliminar este gasto?"
                        description="Se borran también sus mensualidades pendientes. El historial de pagos se conserva."
                        okText="Eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onDelete(expense)}
                    >
                        <button className="text-danger mx-1 hover:opacity-70" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <Table<Expense>
            rowKey="id"
            columns={columns}
            dataSource={expenses}
            loading={loading}
            pagination={false}
            size="middle"
            locale={{ emptyText: 'No hay gastos declarados todavía.' }}
        />
    );
}
