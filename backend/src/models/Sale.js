import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
  {
    saleId: { type: String, required: true, unique: true }, // SALE-000001
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    ageGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'AgeGroup', required: true },
    design: { type: mongoose.Schema.Types.ObjectId, ref: 'Design', required: true },
    productType: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType', required: true },
    color: { type: mongoose.Schema.Types.ObjectId, ref: 'Color', required: true },

    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    previousStock: { type: Number, required: true },
    remainingStock: { type: Number, required: true },

    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    soldAt: { type: Date, default: Date.now },

    paymentMethod: { type: String, enum: ['CASH', 'CARD', 'UPI', 'OTHER'], default: 'CASH' },
    notes: { type: String, default: '' },

    returnedQuantity: { type: Number, default: 0, min: 0 },

    idempotencyKey: { type: String, default: null },
  },
  { timestamps: true }
);

saleSchema.index({ soldAt: -1 });
saleSchema.index({ product: 1, soldAt: -1 });
saleSchema.index({ ageGroup: 1 });
saleSchema.index({ design: 1 });
saleSchema.index({ productType: 1 });
saleSchema.index({ color: 1 });
saleSchema.index({ sku: 1 });
saleSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

export default mongoose.model('Sale', saleSchema);
