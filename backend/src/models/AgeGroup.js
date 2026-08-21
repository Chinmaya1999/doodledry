import mongoose from 'mongoose';

const ageGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ageGroupSchema.index({ name: 1 });

export default mongoose.model('AgeGroup', ageGroupSchema);
