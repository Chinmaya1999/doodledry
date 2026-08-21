import mongoose from 'mongoose';

const colorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    hexCode: { type: String, trim: true, default: '' }, // e.g. #DC2626, used for a visual swatch
    description: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

colorSchema.index({ name: 1 });

export default mongoose.model('Color', colorSchema);
