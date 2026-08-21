import mongoose from 'mongoose';

const returnSchema = new mongoose.Schema(
  {
    returnId: { type: String, required: true, unique: true }, // RTN-000001
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reason: { type: String, default: '' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

returnSchema.index({ sale: 1 });
returnSchema.index({ createdAt: -1 });

export default mongoose.model('Return', returnSchema);
