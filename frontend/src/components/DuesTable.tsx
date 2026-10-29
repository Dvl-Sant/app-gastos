import { Alert, Button, Table } from 'antd';
import type { TableProps } from 'antd';
import { Wallet } from 'lucide-react';
import type { Due } from '../types';
import { formatCurrency } from '../utils/format';

interface Props {
    dues: Due[];
    loading?: boolean;
    showAccount?: boolean;
    onPay?: (due: Due) => void;
    emptyText?: string;
    footer?: React.ReactNode;
}

const typeLabels: Record<string, string> = {
    recurrente: 'Recurrente',
    unico: 'Único',
    msi: 'A meses',
};

export default function DuesTable({ dues, loading, showAccount, onPay, emptyText, footer }: Props) {
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
        ...(onPay
            ? [
                  {
                      title: '',
                      key: 'pay',
                      align: 'right' as const,
                      width: 110,
                      render: (_: unknown, due: Due) =>
                          due.is_paid ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-success">Pagado</span>
                          ) : (
                              <Button size="small" type="primary" ghost onClick={() => onPay(due)}>
                                  Pagar
                              </Button>
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
