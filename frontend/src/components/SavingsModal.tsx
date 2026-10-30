import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Modal, Segmented, Select } from 'antd';
import type { Account } from '../types';
import { formatCurrency } from '../utils/format';

export interface SavingsFormValues {
    total_amount: number;
    currency: string;
}

export interface TransferFormValues {
    amount: number;
    source_account_id: number;
    note?: string;
}

interface Props {
    open: boolean;
    current: { total_amount: string; currency: string } | null;
    accounts: Account[];
    onCancel: () => void;
    onSetTotal: (values: SavingsFormValues) => Promise<void>;
    onTransfer: (values: TransferFormValues) => Promise<void>;
}

/**
 * Ahorros con dos modos: definir el total manualmente o hacer un traspaso
 * desde una cuenta de efectivo/débito (suma al total actual).
 */
export default function SavingsModal({ open, current, accounts, onCancel, onSetTotal, onTransfer }: Props) {
    const [totalForm] = Form.useForm<SavingsFormValues>();
    const [transferForm] = Form.useForm<TransferFormValues>();
    const [mode, setMode] = useState<'traspaso' | 'total'>('traspaso');
    const [saving, setSaving] = useState(false);

    const transferSources = accounts.filter((a) => a.type === 'efectivo' || a.type === 'debito');

    useEffect(() => {
        if (!open) return;
        totalForm.setFieldsValue({
            total_amount: current ? Number(current.total_amount) : 0,
            currency: current?.currency ?? 'USD',
        });
        transferForm.setFieldsValue({
            source_account_id: transferSources[0]?.id,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, current]);

    const handleOk = async () => {
        setSaving(true);
        try {
            if (mode === 'total') {
                const values = await totalForm.validateFields();
                await onSetTotal({ ...values, currency: values.currency || 'USD' });
                totalForm.resetFields();
            } else {
                const values = await transferForm.validateFields();
                await onTransfer(values);
                transferForm.resetFields();
            }
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
            okText={mode === 'total' ? 'Guardar Ahorros' : 'Traspasar'}
            cancelText="Cancelar"
            title="Ahorros"
            centered
            destroyOnClose
        >
            <div className="mt-4">
                <Form.Item label="¿Qué quieres hacer?" className="mb-4">
                    <Segmented
                        block
                        value={mode}
                        onChange={(v) => setMode(v as 'traspaso' | 'total')}
                        options={[
                            { label: 'Traspasar a ahorros', value: 'traspaso' },
                            { label: 'Definir total', value: 'total' },
                        ]}
                    />
                </Form.Item>

                {mode === 'total' ? (
                    <Form form={totalForm} layout="vertical" requiredMark={false}>
                        <Form.Item
                            name="total_amount"
                            label="Monto Total"
                            rules={[{ required: true, message: 'Ingresa el monto' }]}
                        >
                            <InputNumber min={0} step={0.01} className="!w-full" placeholder="0.00" />
                        </Form.Item>
                        <Form.Item name="currency" label="Moneda">
                            <Input maxLength={3} placeholder="USD" />
                        </Form.Item>
                    </Form>
                ) : (
                    <>
                        <p className="text-xs text-slate-500 bg-blue-50 rounded-lg p-3 mb-4">
                            Total actual de ahorros: <b>{formatCurrency(current?.total_amount ?? 0)}</b>. El traspaso
                            resta el monto de la cuenta origen y lo suma a tus ahorros.
                        </p>
                        <Form form={transferForm} layout="vertical" requiredMark={false}>
                            <Form.Item
                                name="source_account_id"
                                label="Sacar de"
                                rules={[{ required: true, message: 'Selecciona la cuenta' }]}
                            >
                                <Select
                                    placeholder="Efectivo / Débito"
                                    options={transferSources.map((a) => ({
                                        value: a.id,
                                        label: `${a.name} — saldo ${formatCurrency(a.balance)}`,
                                    }))}
                                />
                            </Form.Item>
                            <Form.Item
                                name="amount"
                                label="Monto a traspasar"
                                rules={[{ required: true, message: 'Ingresa el monto' }]}
                            >
                                <InputNumber min={0.01} step={0.01} className="!w-full !font-semibold" placeholder="0.00" />
                            </Form.Item>
                            <Form.Item name="note" label="Nota (opcional)">
                                <Input placeholder="Ej. ahorro de la quincena" />
                            </Form.Item>
                        </Form>
                    </>
                )}
            </div>
        </Modal>
    );
}
