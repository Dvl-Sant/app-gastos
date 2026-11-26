import { useEffect, useState } from 'react';
import { App as AntApp, Button, Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { Plus, X } from 'lucide-react';
import type { Account, AccountType, Bank } from '../types';
import { api } from '../hooks/useFetch';

export interface AccountFormValues {
    name: string;
    type: AccountType;
    bank_id?: number | null;
    bank_new?: string;
    cut_off_day?: number;
    payment_due_day?: number;
    credit_limit?: number;
    linked_to_savings?: boolean;
    balance?: number;
    color?: string;
}

const COLOR_PRESETS = [
    '#6d28d9', // violeta
    '#b91c1c', // rojo
    '#1d4ed8', // azul
    '#047857', // verde
    '#111827', // negro
    '#b45309', // dorado
    '#be185d', // rosa
    '#0f766e', // teal
];

/** Paleta de swatches + color personalizado (control de Form compatible). */
function ColorSwatches({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
    const current = value || COLOR_PRESETS[0];
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {COLOR_PRESETS.map((c) => (
                <button
                    type="button"
                    key={c}
                    onClick={() => onChange?.(c)}
                    title={c}
                    className={`size-8 rounded-full transition ${
                        current.toLowerCase() === c ? 'ring-2 ring-offset-2 ring-slate-900' : 'hover:scale-110'
                    }`}
                    style={{ background: c }}
                />
            ))}
            <input
                type="color"
                value={current}
                onChange={(e) => onChange?.(e.target.value)}
                className="size-8 rounded cursor-pointer bg-transparent"
                title="Color personalizado"
            />
        </div>
    );
}

interface Props {
    open: boolean;
    editing: Account | null;
    banks: Bank[];
    onBanksChanged: () => Promise<void>;
    onCancel: () => void;
    onSubmit: (payload: Record<string, unknown>, editingId: number | null) => Promise<void>;
}

const typeLabels: Record<AccountType, string> = {
    efectivo: 'Efectivo',
    debito: 'Débito',
    credito: 'Crédito',
};

export default function AccountModal({ open, editing, banks, onBanksChanged, onCancel, onSubmit }: Props) {
    const { message } = AntApp.useApp();
    const [form] = Form.useForm<AccountFormValues>();
    const [type, setType] = useState<AccountType>('credito');
    const [saving, setSaving] = useState(false);
    const [newBankMode, setNewBankMode] = useState(false);
    const [newBankName, setNewBankName] = useState('');

    useEffect(() => {
        if (!open) return;
        setNewBankMode(false);
        setNewBankName('');
        if (editing) {
            form.setFieldsValue({
                name: editing.name,
                type: editing.type,
                bank_id: editing.bank_id ?? undefined,
                cut_off_day: editing.cut_off_day ?? undefined,
                payment_due_day: editing.payment_due_day ?? undefined,
                credit_limit: editing.credit_limit ? Number(editing.credit_limit) : undefined,
                linked_to_savings: editing.linked_to_savings,
                balance: Number(editing.balance),
                color: editing.color ?? COLOR_PRESETS[0],
            });
            setType(editing.type);
        } else {
            form.resetFields();
            setType('credito');
            form.setFieldsValue({ color: COLOR_PRESETS[0], linked_to_savings: false });
        }
    }, [open, editing, form]);

    /** Resuelve el banco: crea uno nuevo si el usuario escribió el nombre, o usa el seleccionado. */
    const resolveBankId = async (values: AccountFormValues): Promise<number | null> => {
        if (type === 'efectivo') return null;
        if (newBankMode && values.bank_new?.trim()) {
            const bank = await api.banks.create({ name: values.bank_new.trim() });
            await onBanksChanged();
            return bank.id;
        }
        return values.bank_id ?? null;
    };

    const handleOk = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            const bankId = await resolveBankId(values);
            const payload: Record<string, unknown> = {
                name: values.name,
                type,
                color: values.color ?? null,
                bank_id: bankId,
            };
            if (type === 'credito') {
                Object.assign(payload, {
                    cut_off_day: values.cut_off_day,
                    payment_due_day: values.payment_due_day ?? null,
                    credit_limit: values.credit_limit ?? null,
                });
            } else if (type === 'debito') {
                Object.assign(payload, { linked_to_savings: values.linked_to_savings === true, balance: values.balance ?? 0 });
            } else {
                Object.assign(payload, { balance: values.balance ?? 0 });
            }
            await onSubmit(payload, editing?.id ?? null);
            setNewBankMode(false);
            setNewBankName('');
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
            title={editing ? 'Editar Cuenta' : 'Nueva Cuenta / Tarjeta'}
            okText="Guardar"
            cancelText="Cancelar"
            centered
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                <Form.Item label="Tipo de cuenta" className="mb-4">
                    <Select
                        value={type}
                        onChange={(v: AccountType) => setType(v)}
                        disabled={Boolean(editing)}
                        options={(Object.keys(typeLabels) as AccountType[]).map((t) => ({
                            value: t,
                            label: typeLabels[t],
                        }))}
                    />
                </Form.Item>

                <Form.Item
                    name="name"
                    label="Nombre de la tarjeta"
                    rules={[{ required: true, message: 'Ingresa el nombre' }]}
                >
                    <Input placeholder="Ej. Tarjeta Plata" />
                </Form.Item>

                {type !== 'efectivo' && (
                    <Form.Item label="Banco" className="mb-2">
                        {newBankMode ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Nombre del nuevo banco (Ej. BBVA)"
                                    value={newBankName}
                                    onChange={(e) => setNewBankName(e.target.value)}
                                    maxLength={100}
                                />
                                <Button
                                    icon={<X className="w-3.5 h-3.5" />}
                                    onClick={() => {
                                        setNewBankMode(false);
                                        setNewBankName('');
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Form.Item name="bank_id" className="!mb-0 flex-1" noStyle>
                                    <Select
                                        allowClear
                                        placeholder="Selecciona un banco"
                                        options={banks.map((b) => ({ value: b.id, label: b.name }))}
                                    />
                                </Form.Item>
                                <Button
                                    icon={<Plus className="w-3.5 h-3.5" />}
                                    onClick={() => setNewBankMode(true)}
                                    title="Crear banco nuevo"
                                />
                            </div>
                        )}
                    </Form.Item>
                )}

                {type === 'credito' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item
                                name="cut_off_day"
                                label="Día de Corte"
                                rules={[{ required: true, message: 'Día 1-28' }]}
                                extra="Cierra el estado de cuenta este día"
                            >
                                <InputNumber min={1} max={28} className="!w-full" placeholder="1-28" />
                            </Form.Item>
                            <Form.Item
                                name="payment_due_day"
                                label="Día Límite de Pago"
                                rules={[{ required: true, message: 'Día 1-28' }]}
                                extra="Las mensualidades vencen este día"
                            >
                                <InputNumber min={1} max={28} className="!w-full" placeholder="1-28" />
                            </Form.Item>
                        </div>
                        <Form.Item
                            name="credit_limit"
                            label="Límite de crédito (opcional)"
                            extra="Para medir tu capacidad de uso"
                        >
                            <InputNumber min={0} step={100} className="!w-full" placeholder="Ej. 30000" />
                        </Form.Item>
                    </>
                )}

                {type === 'debito' && (
                    <>
                        <Form.Item name="balance" label="Saldo Actual" extra="Dinero disponible en esta cuenta">
                            <InputNumber min={0} step={0.01} className="!w-full" placeholder="0.00" />
                        </Form.Item>
                        <Form.Item
                            name="linked_to_savings"
                            label="Vincular a ahorros"
                            valuePropName="checked"
                            extra="Su saldo contará como parte de tus ahorros y los ingresos que reciba los reflejarán"
                        >
                            <Switch />
                        </Form.Item>
                    </>
                )}

                <Form.Item name="color" label="Color de la tarjeta">
                    <ColorSwatches />
                </Form.Item>
            </Form>
        </Modal>
    );
}
