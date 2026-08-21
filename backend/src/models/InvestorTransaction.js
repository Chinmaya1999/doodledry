import mongoose from 'mongoose';

export const INVESTOR_TXN_TYPES = Object.freeze({
  INVESTMENT: 'INVESTMENT',
  ADDITIONAL_INVESTMENT: 'ADDITIONAL_INVESTMENT',
  WITHDRAWAL: 'WITHDRAWAL',
});

const investorTransactionSchema = new mongoose.Schema(
  {
    investor: { type: mongoose.Schema.Types.ObjectId, ref: 'Investor', required: true },
    type: { type: String, enum: Object.values(INVESTOR_TXN_TYPES), required: true },
    amount: { type: Number, required: true, min: 0 },
    previousBalance: { type: Number, required: true },
    newBalance: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

investorTransactionSchema.index({ investor: 1, createdAt: -1 });

export default mongoose.model('InvestorTransaction', investorTransactionSchema);
