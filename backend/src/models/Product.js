import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true }, // PRD-000001
    ageGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'AgeGroup', required: true },
    design: { type: mongoose.Schema.Types.ObjectId, ref: 'Design', required: true },
    productType: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType', required: true },
    color: { type: mongoose.Schema.Types.ObjectId, ref: 'Color', required: true },

    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    barcode: { type: String, required: true, unique: true }, // Code128 value
    qrCode: { type: String, required: true, unique: true }, // QR payload (== productId)

    openingStock: { type: Number, required: true, default: 0, min: 0 },
    currentStock: { type: Number, required: true, default: 0, min: 0 },
    totalAdded: { type: Number, required: true, default: 0, min: 0 },
    totalSold: { type: Number, required: true, default: 0, min: 0 },

    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    reorderLevel: { type: Number, required: true, default: 10, min: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Enforce the core business rule: one unique inventory record per
// Age Group + Design + Product Type + Color combination.
productSchema.index({ ageGroup: 1, design: 1, productType: 1, color: 1 }, { unique: true });
productSchema.index({ currentStock: 1 });

productSchema.virtual('stockStatus').get(function stockStatus() {
  if (this.currentStock <= 0) return 'OUT_OF_STOCK';
  if (this.currentStock <= this.reorderLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

export default mongoose.model('Product', productSchema);
