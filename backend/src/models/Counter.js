import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

export async function nextSequence(name, session = undefined) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return counter.seq;
}

export function formatSequence(prefix, seq, padLength = 6) {
  return `${prefix}-${String(seq).padStart(padLength, '0')}`;
}

export default Counter;
