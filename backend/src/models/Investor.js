import mongoose from 'mongoose';

const investorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
    investmentAmount: { type: Number, required: true, min: 0, default: 0 }, // running balance
    investmentDate: { type: Date, required: true, default: Date.now },
    ownershipPercentage: { type: Number, min: 0, max: 100, default: 0 },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

investorSchema.index({ name: 1 });
investorSchema.index({ status: 1 });

export default mongoose.model('Investor', investorSchema);
