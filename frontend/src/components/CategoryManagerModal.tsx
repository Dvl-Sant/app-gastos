import { useEffect, useState } from 'react';
import { App as AntApp, Button, Input, List, Modal, Popconfirm } from 'antd';
import { Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import type { ExpenseCategory } from '../types';
import { api } from '../hooks/useFetch';

interface Props {
    open: boolean;
    categories: ExpenseCategory[];
    onChanged: () => Promise<void>;
    onClose: () => void;
}

/** Administrador de categorías de gastos personalizadas: crear, renombrar, eliminar. */
export default function CategoryManagerModal({ open, categories, onChanged, onClose }: Props) {
    const { message } = AntApp.useApp();
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) {
            setNewName('');
            setEditingId(null);
        }
    }, [open]);

    const handleError = (e: unknown) => message.error(e instanceof Error ? e.message : 'Error inesperado');

    const create = async () => {
        if (!newName.trim()) return;
        setBusy(true);
        try {
            await api.expenseCategories.create(newName.trim());
            message.success(`Categoría "${newName.trim()}" creada`);
            setNewName('');
            await onChanged();
        } catch (e) {
            handleError(e);
        } finally {
            setBusy(false);
        }
    };

    const rename = async (id: number) => {
        if (!editingName.trim()) return;
        setBusy(true);
        try {
            await api.expenseCategories.update(id, editingName.trim());
            message.success('Categoría actualizada (los gastos existentes se renombraron también)');
            setEditingId(null);
            await onChanged();
        } catch (e) {
            handleError(e);
        } finally {
            setBusy(false);
        }
    };

    const remove = async (category: ExpenseCategory) => {
        setBusy(true);
        try {
            await api.expenseCategories.remove(category.id);
            message.success('Categoría eliminada');
            await onChanged();
        } catch (e) {
            handleError(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            title="Mis categorías de gastos"
            centered
            destroyOnClose
        >
            <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Nueva categoría (Ej. Streaming, Ropa...)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onPressEnter={create}
                        maxLength={100}
                    />
                    <Button type="primary" icon={<Plus className="w-4 h-4" />} loading={busy} onClick={create}>
                        Crear
                    </Button>
                </div>

                <List
                    size="small"
                    dataSource={categories}
                    locale={{ emptyText: 'No tienes categorías todavía. Crea la primera arriba.' }}
                    renderItem={(category) => (
                        <List.Item
                            className="!px-2"
                            actions={
                                editingId === category.id
                                    ? [
                                          <Button
                                              key="save"
                                              size="small"
                                              type="primary"
                                              icon={<Check className="w-3.5 h-3.5" />}
                                              loading={busy}
                                              onClick={() => rename(category.id)}
                                          />,
                                          <Button
                                              key="cancel"
                                              size="small"
                                              icon={<X className="w-3.5 h-3.5" />}
                                              onClick={() => setEditingId(null)}
                                          />,
                                      ]
                                    : [
                                          <Button
                                              key="edit"
                                              size="small"
                                              type="text"
                                              icon={<Pencil className="w-3.5 h-3.5" />}
                                              onClick={() => {
                                                  setEditingId(category.id);
                                                  setEditingName(category.name);
                                              }}
                                          />,
                                          <Popconfirm
                                              key="delete"
                                              title="¿Eliminar categoría?"
                                              description={
                                                  (category.usage_count ?? 0) > 0
                                                      ? `Hay ${category.usage_count} gastos usándola; el sistema bloqueará el borrado hasta reasignarlos.`
                                                      : 'No hay gastos usándola.'
                                              }
                                              okText="Eliminar"
                                              cancelText="Cancelar"
                                              okButtonProps={{ danger: true }}
                                              onConfirm={() => remove(category)}
                                          >
                                              <Button size="small" type="text" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
                                          </Popconfirm>,
                                      ]
                            }
                        >
                            {editingId === category.id ? (
                                <Input
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onPressEnter={() => rename(category.id)}
                                    maxLength={100}
                                    autoFocus
                                />
                            ) : (
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded truncate inline-flex items-center gap-1">
                                        <Tag className="w-3 h-3 shrink-0" /> {category.name}
                                    </span>
                                    {(category.usage_count ?? 0) > 0 && (
                                        <span className="text-[11px] text-slate-400">({category.usage_count} gastos)</span>
                                    )}
                                </div>
                            )}
                        </List.Item>
                    )}
                />

                <p className="text-[11px] text-slate-400">
                    Al renombrar una categoría, tus gastos existentes se actualizan al nuevo nombre automáticamente.
                </p>
            </div>
        </Modal>
    );
}
