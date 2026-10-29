import { Table, Popconfirm } from 'antd';
import type { TableProps } from 'antd';
import { Pencil, Trash2 } from 'lucide-react';
import type { Income } from '../types';
import { formatCurrency } from '../utils/format';

interface Props {
    incomes: Income[];
    onEdit: (income: Income) => void;
    onDelete: (income: Income) => void;
}

const frequencyLabels: Record<string, string> = {
    semanal: 'Semanal',
    quincenal: 'Quincenal',
    mensual: 'Mensual',
};

export default function IncomesTable({ incomes, onEdit, onDelete }: Props) {
    const columns: TableProps<Income>['columns'] = [
        {
            title: 'Fuente',
            dataIndex: 'name',
            key: 'name',
            render: (value: string, income) => (
                <div>
                    <span className="font-bold text-slate-900">{value}</span>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">
                        {income.income_type === 'unico' ? 'Único' : 'Frecuente'}
                    </p>
                </div>
            ),
        },
        {
            title: 'Monto',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            render: (value: string) => <span className="text-success font-bold">{formatCurrency(value)}</span>,
        },
        {
            title: 'Detalle',
            key: 'detail',
            align: 'right',
            render: (_, income) =>
                income.income_type === 'unico' ? (
                    <span className="text-slate-500 text-xs">
                        Recibido:{' '}
                        {income.received_at
                            ? new Date(`${income.received_at}T12:00:00`).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                              })
                            : '—'}
                    </span>
                ) : (
                    <span className="text-slate-500 text-xs">
                        {frequencyLabels[income.frequency ?? ''] ?? income.frequency} • día {income.next_pay_day}
                    </span>
                ),
        },
        {
            title: 'Acciones',
            key: 'actions',
            align: 'right',
            width: 110,
            render: (_, income) => (
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(income)} className="text-primary mx-1 hover:opacity-70" title="Editar">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <Popconfirm
                        title="¿Eliminar este ingreso?"
                        okText="Sí, eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onDelete(income)}
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
        <Table<Income>
            rowKey="id"
            columns={columns}
            dataSource={incomes}
            pagination={false}
            size="middle"
            locale={{ emptyText: 'No hay ingresos registrados.' }}
        />
    );
}
