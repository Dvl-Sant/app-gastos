import { Alert, Button, Table } from 'antd';
import type { TableProps } from 'antd';
import { Pencil, Trash2, Wallet } from 'lucide-react';
import type { Due } from '../types';
import { formatCurrency } from '../utils/format';

interface Props {
    dues: Due[];
    loading?: boolean;
    showAccount?: boolean;
    onPay?: (due: Due) => void;
    /** Editar/eliminar el gasto padre de la mensualidad */
    onEditExpense?: (due: Due) => void;
    onDeleteExpense?: (due: Due) => void;
    emptyText?: string;
    footer?: React.ReactNode;
}

const typeLabels: Record<string, string> = {
    recurrente: 'Recurrente',
    unico: 'Único',
    msi: 'A meses',
};

export default function DuesTable({ dues, loading, showAccount, onPay, onEditExpense, onDeleteExpense, emptyText, footer }: Props) {
    const columns: TableProps<Due>['columns'] = [
        {
            title: 'Fecha',
            dataIndex: 'due_date',
            key: 'due_date',
            width: 120,
            render: (value: string) => (
                <span className="font-semibold text-slate-700 whitespace-nowrap">
                    {new Date(`${value}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
            ),
        },
        {
            title: 'Concepto',
            key: 'concept',
            render: (_, due) => (
                <div>
                    <p className={due.is_paid ? 'line-through text-slate-500 font-medium' : 'font-bold text-slate-900'}>
                        {due.expense_name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                        {due.category ?? 'Sin categoría'} • {typeLabels[due.expense_type ?? ''] ?? due.expense_type}
                    </p>
                </div>
            ),
        },
        ...(showAccount
            ? [
                  {
                      title: 'Cuenta',
                      dataIndex: 'account_name',
                      key: 'account_name',
                      width: 130,
                      render: (value: string) => (
                          <span className="inline-flex items-center gap-1 text-slate-600 text-xs font-semibold">
                              <Wallet className="w-3.5 h-3.5 text-primary" /> {value}
                          </span>
                      ),
                  },
              ]
            : []),
        {
            title: 'Monto',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            render: (_, due) => (
                <div>
                    <span className={due.is_paid ? 'line-through text-slate-400 font-bold' : 'text-danger font-bold'}>
                        {formatCurrency(due.amount)}
                    </span>
                    {Number(due.paid_amount) > 0 && !due.is_paid && (
                        <p className="text-[10px] text-success font-semibold">
                            Pagado: {formatCurrency(due.paid_amount)}
                        </p>
                    )}
                </div>
            ),
        },
        ...(onPay || onEditExpense || onDeleteExpense
            ? [
                  {
                      title: '',
                      key: 'actions',
                      align: 'right' as const,
                      width: onEditExpense ? 170 : 110,
                      render: (_: unknown, due: Due) => (
                          <div className="flex items-center justify-end gap-1">
                              {onPay && !due.is_paid && (
                                  <Button size="small" type="primary" ghost onClick={() => onPay(due)}>
                                      Pagar
                                  </Button>
                              )}
                              {onPay && due.is_paid && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-success mr-1">
                                      Pagado
                                  </span>
                              )}
                              {onEditExpense && (
                                  <button
                                      onClick={() => onEditExpense(due)}
                                      className="text-primary mx-1 hover:opacity-70"
                                      title="Editar gasto"
                                  >
                                      <Pencil className="w-4 h-4" />
                                  </button>
                              )}
                              {onDeleteExpense && (
                                  <button
                                      onClick={() => onDeleteExpense(due)}
                                      className="text-danger mx-1 hover:opacity-70"
                                      title="Eliminar gasto"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              )}
                          </div>
                      ),
                  },
              ]
            : []),
    ];

    if (!loading && dues.length === 0 && !footer) {
        return <Alert type="info" showIcon message={emptyText ?? 'No hay vencimientos en este periodo.'} />;
    }

    return (
        <Table<Due>
            rowKey="id"
            columns={columns}
            dataSource={dues}
            loading={loading}
            pagination={false}
            size="middle"
            footer={footer ? () => footer : undefined}
            locale={{ emptyText: emptyText ?? 'No hay vencimientos en este periodo.' }}
        />
    );
}
