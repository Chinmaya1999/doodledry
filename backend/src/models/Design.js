import mongoose from 'mongoose';

const designSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    image: { type: String, default: '' },
    description: { type: String, trim: true, default: '' },
    isSolid: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

designSchema.index({ name: 'text' });

export default mongoose.model('Design', designSchema);
