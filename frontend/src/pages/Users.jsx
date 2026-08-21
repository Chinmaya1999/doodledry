import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import { Field, Input, Select } from '../components/FormField';
import { StatusBadge } from '../components/StockBadge';
import { getUsers, createUser, updateUser } from '../services/userService';
import { extractErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const { data, isLoading } = useQuery({ queryKey: ['users', search], queryFn: () => getUsers({ search: search || undefined }) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => { toast.success('Admin user created successfully.'); invalidate(); closeModal(); },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateUser(id, payload),
    onSuccess: () => { toast.success('User updated successfully.'); invalidate(); closeModal(); },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  function openCreate() { setForm(emptyForm()); setModalState({ mode: 'create' }); }
  function openEdit(row) { setForm({ name: row.name, email: row.email, phone: row.phone, role: row.role, password: '' }); setModalState({ mode: 'edit', data: row }); }
  function closeModal() { setModalState(null); }
  function toggleActive(row) { updateMutation.mutate({ id: row.id, payload: { isActive: !row.isActive } }); }

  function handleSubmit(e) {
    e.preventDefault();
    if (modalState.mode === 'create') {
      createMutation.mutate(form);
    } else {
      const payload = { name: form.name, phone: form.phone, role: form.role };
      if (form.password) payload.password = form.password;
      updateMutation.mutate({ id: modalState.data.id, payload });
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'role', header: 'Role', render: (r) => (r.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin') },
    { key: 'isActive', header: 'Status', render: (r) => <StatusBadge active={r.isActive} /> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><Pencil size={15} /></button>
          {r.id !== currentUser.id && (
            <button type="button" onClick={() => toggleActive(r)} className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100">
              {r.isActive ? 'Disable' : 'Enable'}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search users..." className="w-64" />
        <Button icon={Plus} onClick={openCreate}>Create Admin</Button>
      </div>

      <DataTable columns={columns} rows={data?.data} loading={isLoading} rowKey="id" emptyTitle="No users found" />

      <Modal
        open={!!modalState} onClose={closeModal}
        title={modalState?.mode === 'create' ? 'Create Admin User' : 'Edit User'}
        footer={(<><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>Save</Button></>)}
      >
        <form onSubmit={handleSubmit}>
          <Field label="Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email" required>
            <Input type="email" value={form.email} disabled={modalState?.mode === 'edit'} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone" required><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Role" required>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </Select>
          </Field>
          <Field label={modalState?.mode === 'create' ? 'Password' : 'New Password'} required={modalState?.mode === 'create'} hint={modalState?.mode === 'edit' ? 'Leave blank to keep current password' : ''}>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}

function emptyForm() {
  return { name: '', email: '', phone: '', role: 'ADMIN', password: '' };
}
