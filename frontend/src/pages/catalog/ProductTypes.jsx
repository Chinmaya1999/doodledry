import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { Field, Input, Textarea } from '../../components/FormField';
import { StatusBadge } from '../../components/StockBadge';
import SearchBar from '../../components/SearchBar';
import { getProductTypes, createProductType, updateProductType, deleteProductType } from '../../services/catalogService';
import { extractErrorMessage } from '../../services/api';

export default function ProductTypes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['product-types', search],
    queryFn: () => getProductTypes({ search: search || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['product-types'] });

  const createMutation = useMutation({
    mutationFn: createProductType,
    onSuccess: () => { toast.success('Product type created successfully.'); invalidate(); closeModal(); },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateProductType(id, payload),
    onSuccess: () => { toast.success('Product type updated successfully.'); invalidate(); closeModal(); },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteProductType,
    onSuccess: () => { toast.success('Product type deleted successfully.'); invalidate(); setDeleteTarget(null); },
    onError: (err) => { toast.error(extractErrorMessage(err)); setDeleteTarget(null); },
  });

  function openCreate() { setForm({ name: '', code: '', description: '' }); setModalState({ mode: 'create' }); }
  function openEdit(row) { setForm({ name: row.name, code: row.code, description: row.description || '' }); setModalState({ mode: 'edit', data: row }); }
  function closeModal() { setModalState(null); }
  function toggleStatus(row) { updateMutation.mutate({ id: row._id, payload: { status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } }); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Product type name cannot be empty.');
    if (!form.code.trim()) return toast.error('Code is required.');
    if (modalState.mode === 'create') createMutation.mutate(form);
    else updateMutation.mutate({ id: modalState.data._id, payload: form });
  }

  const columns = [
    { key: 'name', header: 'Product Type' },
    { key: 'code', header: 'Code' },
    { key: 'description', header: 'Description', render: (r) => r.description || '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge active={r.status === 'ACTIVE'} /> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><Pencil size={15} /></button>
          <button type="button" onClick={() => toggleStatus(r)} className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100">
            {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search product types..." className="w-64" />
        <Button icon={Plus} onClick={openCreate}>Add Product Type</Button>
      </div>

      <DataTable columns={columns} rows={types} loading={isLoading} emptyTitle="No product types yet" emptyDescription="Add Full Sleeve, Half Sleeve, Onesie, Romper, and more." />

      <Modal
        open={!!modalState} onClose={closeModal}
        title={modalState?.mode === 'create' ? 'Add Product Type' : 'Edit Product Type'}
        footer={(<><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>Save</Button></>)}
      >
        <form onSubmit={handleSubmit}>
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Full Sleeve" />
          </Field>
          <Field label="Code" required hint="Short unique code, e.g. FS">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. FS" />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </form>
      </Modal>

      <ConfirmationDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        title="Delete product type"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete" danger loading={deleteMutation.isPending}
      />
    </div>
  );
}
