import { useEffect, useState } from 'react';
import { App as AntApp, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { Account, Loan } from '../types';
import { formatCurrency } from '../utils/format';

export interface LoanPayFormValues {
    amount: number;
    account_id?: number;
    paid_at?: Dayjs;
    note?: string;
}

interface Props {
    open: boolean;
    loan: Loan | null;
    accounts: Account[];
    onCancel: () => void;
    onSubmit: (values: { amount: number; account_id?: number; note?: string; paid_at?: string }) => Promise<void>;
}

/** Registrar abono de un préstamo: el dinero entra a la cuenta elegida. */
export default function LoanPayModal({ open, loan, accounts, onCancel, onSubmit }: Props) {
    const { message } = AntApp.useApp();
    const [form] = Form.useForm<LoanPayFormValues>();
    const [saving, setSaving] = useState(false);

    const remaining = loan && loan.remaining !== undefined ? Number(loan.remaining) : 0;

    useEffect(() => {
        if (!open) return;
        form.setFieldsValue({
            amount: remaining > 0 ? Math.round(remaining * 100) / 100 : undefined,
            account_id: accounts.find((a) => a.type === 'efectivo')?.id,
            paid_at: dayjs(),
        });
    }, [open, loan, accounts, form, remaining]);

    const handleOk = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            await onSubmit({
                amount: values.amount,
                account_id: values.account_id,
                note: values.note,
                paid_at: values.paid_at ? values.paid_at.format('YYYY-MM-DD') : undefined,
            });
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Error inesperado');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={saving}
            title={`Registrar abono — ${loan?.person_name ?? ''}`}
            okText="Registrar Abono"
            cancelText="Cancelar"
            centered
            destroyOnClose
        >
            <p className="text-xs text-slate-500 bg-blue-50 rounded-lg p-3 mt-4">
                Pendiente: <b>{formatCurrency(remaining)}</b> de {formatCurrency(loan?.amount ?? 0)}. El abono
                entrará a la cuenta que elijas (si está vinculada a ahorros, se refleja solo).
            </p>
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        name="amount"
                        label="Monto del abono"
                        rules={[{ required: true, message: 'Ingresa el monto' }]}
                    >
                        <InputNumber min={0.01} step={0.01} className="!w-full !text-success !font-semibold" placeholder="0.00" />
                    </Form.Item>
                    <Form.Item name="paid_at" label="Fecha del abono">
                        <DatePicker className="!w-full" format="DD/MM/YYYY" />
                    </Form.Item>
                </div>
                <Form.Item
                    name="account_id"
                    label="Dónde entra el dinero"
                    extra="Si eliges una tarjeta vinculada a ahorros, tus ahorros crecen automáticamente"
                >
                    <Select
                        allowClear
                        placeholder="Efectivo / Débito"
                        options={accounts
                            .filter((a) => a.type === 'efectivo' || a.type === 'debito')
                            .map((a) => ({
                                value: a.id,
                                label: `${a.name} — saldo ${formatCurrency(a.balance)}`,
                            }))}
                    />
                </Form.Item>
                <Form.Item name="note" label="Nota (opcional)">
                    <Input placeholder="Ej. abono en efectivo" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
