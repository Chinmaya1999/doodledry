import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ImageOff } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { Field, Input, Textarea, Checkbox } from '../../components/FormField';
import { StatusBadge } from '../../components/StockBadge';
import SearchBar from '../../components/SearchBar';
import { getDesigns, createDesign, updateDesign, deleteDesign } from '../../services/catalogService';
import { extractErrorMessage, API_ORIGIN } from '../../services/api';

function DesignThumb({ image, name }) {
  if (!image) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <ImageOff size={15} />
      </div>
    );
  }
  return <img src={`${API_ORIGIN}${image}`} alt={name} className="h-9 w-9 rounded-lg object-cover" />;
}

export default function Designs() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', isSolid: false });
  const [imageFile, setImageFile] = useState(null);

  const { data: designs = [], isLoading } = useQuery({
    queryKey: ['designs', search],
    queryFn: () => getDesigns({ search: search || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['designs'] });

  const createMutation = useMutation({
    mutationFn: createDesign,
    onSuccess: () => { toast.success('Design created successfully.'); invalidate(); closeModal(); },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateDesign(id, payload),
    onSuccess: () => { toast.success('Design updated successfully.'); invalidate(); closeModal(); },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteDesign,
    onSuccess: () => { toast.success('Design deleted successfully.'); invalidate(); setDeleteTarget(null); },
    onError: (err) => { toast.error(extractErrorMessage(err)); setDeleteTarget(null); },
  });

  function openCreate() { setForm({ name: '', code: '', description: '', isSolid: false }); setImageFile(null); setModalState({ mode: 'create' }); }
  function openEdit(row) { setForm({ name: row.name, code: row.code, description: row.description || '', isSolid: row.isSolid }); setImageFile(null); setModalState({ mode: 'edit', data: row }); }
  function closeModal() { setModalState(null); }
  function toggleStatus(row) {
    const fd = new FormData();
    fd.append('status', row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
    updateMutation.mutate({ id: row._id, payload: fd });
  }

  function buildFormData() {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('code', form.code);
    fd.append('description', form.description);
    fd.append('isSolid', String(form.isSolid));
    if (imageFile) fd.append('image', imageFile);
    return fd;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Design name cannot be empty.');
    if (!form.code.trim()) return toast.error('Code is required.');
    const fd = buildFormData();
    if (modalState.mode === 'create') createMutation.mutate(fd);
    else updateMutation.mutate({ id: modalState.data._id, payload: fd });
  }

  const columns = [
    { key: 'image', header: '', render: (r) => <DesignThumb image={r.image} name={r.name} /> },
    { key: 'name', header: 'Design' },
    { key: 'code', header: 'Code' },
    { key: 'isSolid', header: 'Type', render: (r) => (r.isSolid ? 'Solid' : 'Printed') },
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
        <SearchBar value={search} onChange={setSearch} placeholder="Search designs..." className="w-64" />
        <Button icon={Plus} onClick={openCreate}>Add Design</Button>
      </div>

      <DataTable columns={columns} rows={designs} loading={isLoading} emptyTitle="No designs yet" emptyDescription="Add your first design, such as Happy Unicorn or Solid." />

      <Modal
        open={!!modalState} onClose={closeModal}
        title={modalState?.mode === 'create' ? 'Add Design' : 'Edit Design'}
        footer={(<><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>Save</Button></>)}
      >
        <form onSubmit={handleSubmit}>
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Happy Unicorn" />
          </Field>
          <Field label="Code" required hint="Short unique code, e.g. HUN">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. HUN" />
          </Field>
          <Field label="Design Image">
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-600" />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Checkbox
            label="This is a Solid design (no printed pattern)"
            checked={form.isSolid}
            onChange={(e) => setForm({ ...form, isSolid: e.target.checked })}
          />
        </form>
      </Modal>

      <ConfirmationDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        title="Delete design"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete" danger loading={deleteMutation.isPending}
      />
    </div>
  );
}
