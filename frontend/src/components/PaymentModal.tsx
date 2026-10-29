import { useEffect, useMemo, useState } from 'react';
import { Alert, Form, InputNumber, Modal, Select, Switch } from 'antd';
import type { Account, Due } from '../types';
import { formatCurrency } from '../utils/format';

interface Props {
    open: boolean;
    /** Mensualidad concreta a pagar (pago individual) */
    due: Due | null;
    /** Estado de cuenta a pagar (pago de tarjeta: total o parcial) */
    statementPending: number | null;
    accounts: Account[];
    onCancel: () => void;
    onSubmit: (amount: number | 'full', sourceAccountId: number) => Promise<void>;
}

/**
 * Modal de pago flexible: paga una mensualidad concreta o el estado de
 * cuenta (todo o un monto arbitrario), sacando dinero de una cuenta
 * de efectivo/débito.
 */
export default function PaymentModal({ open, due, statementPending, accounts, onCancel, onSubmit }: Props) {
    const [form] = Form.useForm<{ pay_full: boolean; amount?: number; source_account_id?: number }>();
    const [payFull, setPayFull] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const defaultAmount = due
        ? Number(due.amount) - Number(due.paid_amount)
        : (statementPending ?? 0);
    const sourceOptions = useMemo(
        () =>
            accounts
                .filter((a) => a.type === 'efectivo' || a.type === 'debito')
                .map((a) => ({
                    value: a.id,
                    label: `${a.name} — saldo ${formatCurrency(a.balance)}`,
                })),
        [accounts]
    );

    useEffect(() => {
        if (!open) return;
        setError(null);
        setPayFull(!due);
        form.setFieldsValue({
            pay_full: !due,
            amount: Math.max(0.01, Math.round(defaultAmount * 100) / 100) || undefined,
            source_account_id: sourceOptions[0]?.value,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, due, statementPending]);

    const handleOk = async () => {
        const values = await form.validateFields();
        const source = values.source_account_id;
        if (!source) {
            setError('Necesitas una cuenta de efectivo o débito de donde sacar el dinero');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const amount: number | 'full' = payFull ? 'full' : Number(values.amount);
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
                    name="source_account_id"
                    label="Sacar dinero de"
                    rules={[{ required: true, message: 'Selecciona la cuenta de origen' }]}
                >
                    <Select options={sourceOptions} placeholder="Efectivo / Débito" />
                </Form.Item>
                {error && <Alert type="error" showIcon message={error} />}
            </Form>
        </Modal>
    );
}
