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
import { getAgeGroups, createAgeGroup, updateAgeGroup, deleteAgeGroup } from '../../services/catalogService';
import { extractErrorMessage } from '../../services/api';

export default function AgeGroups() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState(null); // { mode: 'create'|'edit', data }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const { data: ageGroups = [], isLoading } = useQuery({
    queryKey: ['age-groups', search],
    queryFn: () => getAgeGroups({ search: search || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['age-groups'] });

  const createMutation = useMutation({
    mutationFn: createAgeGroup,
    onSuccess: () => { toast.success('Age group created successfully.'); invalidate(); closeModal(); },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateAgeGroup(id, payload),
    onSuccess: () => { toast.success('Age group updated successfully.'); invalidate(); closeModal(); },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAgeGroup,
    onSuccess: () => { toast.success('Age group deleted successfully.'); invalidate(); setDeleteTarget(null); },
    onError: (err) => { toast.error(extractErrorMessage(err)); setDeleteTarget(null); },
  });

  function openCreate() {
    setForm({ name: '', code: '', description: '' });
    setModalState({ mode: 'create' });
  }

  function openEdit(row) {
    setForm({ name: row.name, code: row.code, description: row.description || '' });
    setModalState({ mode: 'edit', data: row });
  }

  function closeModal() {
    setModalState(null);
  }

  function toggleStatus(row) {
    updateMutation.mutate({ id: row._id, payload: { status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Age group name cannot be empty.');
    if (!form.code.trim()) return toast.error('Code is required.');
    if (modalState.mode === 'create') {
      createMutation.mutate(form);
    } else {
      updateMutation.mutate({ id: modalState.data._id, payload: form });
    }
  }

  const columns = [
    { key: 'name', header: 'Age Group' },
    { key: 'code', header: 'Code' },
    { key: 'description', header: 'Description', render: (r) => r.description || '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge active={r.status === 'ACTIVE'} /> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <Pencil size={15} />
          </button>
          <button type="button" onClick={() => toggleStatus(r)} className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100">
            {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search age groups..." className="w-64" />
        <Button icon={Plus} onClick={openCreate}>Add Age Group</Button>
      </div>

      <DataTable columns={columns} rows={ageGroups} loading={isLoading} emptyTitle="No age groups yet" emptyDescription="Create your first age group to start organizing inventory." />

      <Modal
        open={!!modalState}
        onClose={closeModal}
        title={modalState?.mode === 'create' ? 'Add Age Group' : 'Edit Age Group'}
        footer={(
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>Save</Button>
          </>
        )}
      >
        <form onSubmit={handleSubmit}>
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 0-6 Months" />
          </Field>
          <Field label="Code" required hint="Short unique code, e.g. 06M">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. 06M" />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </form>
      </Modal>

      <ConfirmationDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        title="Delete age group"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
