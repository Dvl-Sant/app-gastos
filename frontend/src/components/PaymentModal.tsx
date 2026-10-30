import { useEffect, useMemo, useState } from 'react';
import { Alert, Form, InputNumber, Modal, Select, Switch } from 'antd';
import type { Account, Due } from '../types';
import { formatCurrency } from '../utils/format';
import type { PaymentSourceInput } from '../hooks/useFetch';

interface Props {
    open: boolean;
    /** Mensualidad concreta a pagar (pago individual) */
    due: Due | null;
    /** Estado de cuenta a pagar (pago de tarjeta: total o parcial) */
    statementPending: number | null;
    /** Cuenta que recibe el pago: no puede pagar consigo misma */
    targetAccountId: number | null;
    accounts: Account[];
    savingsTotal: number | null;
    onCancel: () => void;
    onSubmit: (amount: number | 'full', source: PaymentSourceInput) => Promise<void>;
}

interface SourceOption {
    value: string; // 'savings' | id numérico como string
    label: string;
}

/**
 * Modal de pago flexible: paga una mensualidad concreta o el estado de
 * cuenta (todo o un monto arbitrario). El dinero sale de los ahorros o de
 * cualquier cuenta/tarjeta distinta a la que recibe el pago.
 */
export default function PaymentModal({
    open,
    due,
    statementPending,
    targetAccountId,
    accounts,
    savingsTotal,
    onCancel,
    onSubmit,
}: Props) {
    const [form] = Form.useForm<{ pay_full: boolean; amount?: number; source: string }>();
    const [payFull, setPayFull] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const defaultAmount = due ? Number(due.amount) - Number(due.paid_amount) : (statementPending ?? 0);

    const sourceOptions: SourceOption[] = useMemo(() => {
        const options: SourceOption[] = [
            { value: 'savings', label: `Ahorros — ${formatCurrency(savingsTotal ?? 0)}` },
        ];
        for (const account of accounts) {
            if (targetAccountId !== null && account.id === targetAccountId) continue; // no pagarse a sí misma
            const detail =
                account.type === 'credito'
                    ? `crédito, deuda ${formatCurrency(account.pending_debt ?? 0)}`
                    : `saldo ${formatCurrency(account.balance)}`;
            options.push({ value: String(account.id), label: `${account.name} — ${detail}` });
        }
        return options;
    }, [accounts, targetAccountId, savingsTotal]);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setPayFull(!due);
        form.setFieldsValue({
            pay_full: !due,
            amount: Math.max(0.01, Math.round(defaultAmount * 100) / 100) || undefined,
            source: sourceOptions[0]?.value,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, due, statementPending, targetAccountId]);

    const handleOk = async () => {
        const values = await form.validateFields();
        if (!values.source) {
            setError('Selecciona de dónde sacar el dinero');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const amount: number | 'full' = payFull ? 'full' : Number(values.amount);
            const source: PaymentSourceInput =
                values.source === 'savings'
                    ? { source_kind: 'savings' }
                    : { source_kind: 'account', source_account_id: Number(values.source) };
            await onSubmit(amount, source);
        } finally {
            setSaving(false);
        }
    };

    const isStatement = statementPending !== null && !due;

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={saving}
            title={due ? `Pagar: ${due.expense_name}` : 'Pagar Estado de Cuenta'}
            okText="Confirmar Pago"
            cancelText="Cancelar"
            centered
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                {isStatement && (
                    <Form.Item label="Pagar todo el pendiente del periodo">
                        <Switch checked={payFull} onChange={setPayFull} />
                    </Form.Item>
                )}
                {!payFull && (
                    <Form.Item
                        name="amount"
                        label="Monto a pagar"
                        rules={[{ required: true, message: 'Ingresa el monto' }]}
                        extra={
                            isStatement
                                ? `Pendiente del periodo: ${formatCurrency(statementPending)} — si pagas menos, se aplica a las mensualidades más antiguas primero`
                                : `Pendiente: ${formatCurrency(defaultAmount)} — puedes pagar parcial`
                        }
                    >
                        <InputNumber min={0.01} step={0.01} className="!w-full !font-semibold" placeholder="0.00" />
                    </Form.Item>
                )}
                <Form.Item
                    name="source"
                    label="Sacar dinero de"
                    rules={[{ required: true, message: 'Selecciona el origen' }]}
                >
                    <Select options={sourceOptions} placeholder="Ahorros, efectivo o tarjeta" />
                </Form.Item>
                {error && <Alert type="error" showIcon message={error} />}
            </Form>
        </Modal>
    );
}
