import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Plus, Wallet, Users2, UserCheck, ArrowLeftRight } from 'lucide-react';
import { CardsGrid, StatCard } from '../components/DashboardCards';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Field, Input, Select, Textarea } from '../components/FormField';
import { StatusBadge } from '../components/StockBadge';
import { getInvestors, createInvestor, addInvestorTransaction, getInvestor } from '../services/investorService';
import { extractErrorMessage } from '../services/api';

const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function Investors() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [txnTarget, setTxnTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const { data, isLoading } = useQuery({ queryKey: ['investors'], queryFn: () => getInvestors({}) });

  const createMutation = useMutation({
    mutationFn: createInvestor,
    onSuccess: () => {
      toast.success('Investor added successfully.');
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      setCreateOpen(false);
      setForm(emptyForm());
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const columns = [
    { key: 'name', header: 'Investor' },
    { key: 'phone', header: 'Phone' },
    { key: 'investmentAmount', header: 'Investment Balance', render: (r) => CURRENCY.format(r.investmentAmount) },
    { key: 'ownershipPercentage', header: 'Ownership', render: (r) => `${r.ownershipPercentage}%` },
    { key: 'investmentDate', header: 'Investment Date', render: (r) => format(new Date(r.investmentDate), 'dd-MMM-yyyy') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge active={r.status === 'ACTIVE'} /> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => setDetailTarget(r._id)}>History</Button>
          <Button size="sm" icon={ArrowLeftRight} onClick={() => setTxnTarget(r)}>Transaction</Button>
        </div>
      ),
    },
  ];

  function handleCreateSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Investor name is required.');
    createMutation.mutate({
      ...form,
      investmentAmount: Number(form.investmentAmount) || 0,
      ownershipPercentage: Number(form.ownershipPercentage) || 0,
    });
  }

  return (
    <div className="space-y-6">
      <CardsGrid>
        <StatCard icon={Users2} label="Total Investors" value={data?.meta?.totalInvestors ?? 0} />
        <StatCard icon={UserCheck} label="Active Investors" value={data?.meta?.activeInvestors ?? 0} tone="success" />
        <StatCard icon={Wallet} label="Total Investment" value={CURRENCY.format(data?.meta?.totalInvestment ?? 0)} />
      </CardsGrid>

      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => setCreateOpen(true)}>Add Investor</Button>
      </div>

      <DataTable columns={columns} rows={data?.data} loading={isLoading} emptyTitle="No investors yet" />

      <Modal
        open={createOpen} onClose={() => setCreateOpen(false)} title="Add Investor"
        footer={(<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreateSubmit} loading={createMutation.isPending}>Save</Button></>)}
      >
        <form onSubmit={handleCreateSubmit}>
          <Field label="Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone" required><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Address"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Investment Amount (₹)" required>
            <Input type="number" min="0" value={form.investmentAmount} onChange={(e) => setForm({ ...form, investmentAmount: e.target.value })} />
          </Field>
          <Field label="Investment Date">
            <Input type="date" value={form.investmentDate} onChange={(e) => setForm({ ...form, investmentDate: e.target.value })} />
          </Field>
          <Field label="Ownership Percentage (%)">
            <Input type="number" min="0" max="100" value={form.ownershipPercentage} onChange={(e) => setForm({ ...form, ownershipPercentage: e.target.value })} />
          </Field>
          <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </form>
      </Modal>

      <TransactionModal investor={txnTarget} onClose={() => setTxnTarget(null)} />
      <InvestorHistoryModal investorId={detailTarget} onClose={() => setDetailTarget(null)} />
    </div>
  );
}

function emptyForm() {
  return { name: '', phone: '', email: '', address: '', investmentAmount: '', investmentDate: '', ownershipPercentage: '', notes: '' };
}

function TransactionModal({ investor, onClose }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('ADDITIONAL_INVESTMENT');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: ({ id, payload }) => addInvestorTransaction(id, payload),
    onSuccess: () => {
      toast.success('Investor transaction recorded successfully.');
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      queryClient.invalidateQueries({ queryKey: ['investor', investor?._id] });
      handleClose();
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  function handleClose() {
    setType('ADDITIONAL_INVESTMENT');
    setAmount('');
    setNotes('');
    onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Investment amount cannot be negative.');
    mutation.mutate({ id: investor._id, payload: { type, amount: amt, notes } });
  }

  return (
    <Modal
      open={!!investor} onClose={handleClose} title={`Record Transaction — ${investor?.name || ''}`}
      footer={(<><Button variant="secondary" onClick={handleClose}>Cancel</Button><Button onClick={handleSubmit} loading={mutation.isPending}>Save</Button></>)}
    >
      <form onSubmit={handleSubmit}>
        <Field label="Type" required>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ADDITIONAL_INVESTMENT">Additional Investment</option>
            <option value="WITHDRAWAL">Withdrawal</option>
          </Select>
        </Field>
        <Field label="Amount (₹)" required>
          <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {investor && <p className="text-xs text-gray-400">Current balance: {CURRENCY.format(investor.investmentAmount)}</p>}
      </form>
    </Modal>
  );
}

function InvestorHistoryModal({ investorId, onClose }) {
  const { data } = useQuery({
    queryKey: ['investor', investorId],
    queryFn: () => getInvestor(investorId),
    enabled: !!investorId,
  });

  const columns = [
    { key: 'date', header: 'Date', render: (r) => format(new Date(r.date), 'dd-MMM-yyyy') },
    { key: 'type', header: 'Type', render: (r) => r.type.replace('_', ' ') },
    { key: 'amount', header: 'Amount', render: (r) => CURRENCY.format(r.amount) },
    { key: 'balance', header: 'Balance', render: (r) => `${CURRENCY.format(r.previousBalance)} → ${CURRENCY.format(r.newBalance)}` },
    { key: 'recordedBy', header: 'Recorded By', render: (r) => r.recordedBy?.name },
  ];

  return (
    <Modal open={!!investorId} onClose={onClose} title="Investment History" size="xl">
      <DataTable columns={columns} rows={data?.transactions} rowKey="_id" emptyTitle="No transactions yet" />
    </Modal>
  );
}
