import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Undo2, Plus } from 'lucide-react';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Field, Input, Select } from '../components/FormField';
import Pagination from '../components/Pagination';
import { getReturns, createReturn, getSales } from '../services/saleService';
import { extractErrorMessage } from '../services/api';

export default function Returns() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [saleSearch, setSaleSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['returns', page],
    queryFn: () => getReturns({ page, limit: 20 }),
  });

  const { data: saleOptions } = useQuery({
    queryKey: ['sales', 'search', saleSearch],
    queryFn: () => getSales({ search: saleSearch || undefined, limit: 20 }),
    enabled: modalOpen,
  });

  const mutation = useMutation({
    mutationFn: createReturn,
    onSuccess: (res) => {
      toast.success(`Return processed successfully. New Stock: ${res.return.newStock}`);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  function closeModal() {
    setModalOpen(false);
    setSelectedSale('');
    setQuantity('1');
    setReason('');
    setSaleSearch('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedSale) return toast.error('Select the sale to return.');
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) return toast.error('Enter a valid quantity.');
    mutation.mutate({ sale: selectedSale, quantity: qty, reason });
  }

  const columns = [
    { key: 'returnId', header: 'Return ID', render: (r) => <span className="font-mono text-xs">{r.returnId}</span> },
    { key: 'createdAt', header: 'Date', render: (r) => format(new Date(r.createdAt), 'dd-MMM-yyyy HH:mm') },
    { key: 'sale', header: 'Sale ID', render: (r) => <span className="font-mono text-xs">{r.sale?.saleId}</span> },
    { key: 'product', header: 'Product', render: (r) => (r.product ? `${r.product.design?.name || ''} · ${r.product.productType?.name || ''}` : <span className="italic text-gray-400">Product deleted</span>) },
    { key: 'quantity', header: 'Quantity Returned' },
    { key: 'change', header: 'Stock Change', render: (r) => `${r.previousStock} → ${r.newStock}` },
    { key: 'reason', header: 'Reason', render: (r) => r.reason || '—' },
    { key: 'processedBy', header: 'Processed By', render: (r) => r.processedBy?.name },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => setModalOpen(true)}>Process Return</Button>
      </div>

      <DataTable columns={columns} rows={data?.data} loading={isLoading} emptyTitle="No returns recorded" />

      {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPageChange={setPage} />}

      <Modal
        open={modalOpen} onClose={closeModal} title="Process Return"
        footer={(<><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button icon={Undo2} onClick={handleSubmit} loading={mutation.isPending}>Confirm Return</Button></>)}
      >
        <form onSubmit={handleSubmit}>
          <Field label="Search Sale" hint="Search by Sale ID or SKU">
            <Input value={saleSearch} onChange={(e) => setSaleSearch(e.target.value)} placeholder="e.g. SALE-000001" />
          </Field>
          <Field label="Sale" required>
            <Select value={selectedSale} onChange={(e) => setSelectedSale(e.target.value)}>
              <option value="">Select sale</option>
              {saleOptions?.data?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.saleId} — {s.sku} · Qty Sold: {s.quantity} · Returned: {s.returnedQuantity || 0}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity to Return" required>
            <Input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Reason">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
