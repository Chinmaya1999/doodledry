import mongoose from 'mongoose';

export const TRANSACTION_TYPES = Object.freeze({
  STOCK_IN: 'STOCK_IN',
  SALE: 'SALE',
  STOCK_ADJUSTMENT: 'STOCK_ADJUSTMENT',
  STOCK_RETURN: 'STOCK_RETURN',
  DAMAGE: 'DAMAGE',
  LOSS: 'LOSS',
});

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, enum: Object.values(TRANSACTION_TYPES), required: true },
    quantity: { type: Number, required: true }, // signed: +in, -out
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, default: '' }, // Damaged / Lost / Defective / Other
    notes: { type: String, default: '' },
    reference: {
      refType: { type: String, enum: ['SALE', 'RETURN', 'MANUAL'], default: 'MANUAL' },
      refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ product: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });
inventoryTransactionSchema.index({ createdAt: -1 });

export default mongoose.model('InventoryTransaction', inventoryTransactionSchema);
