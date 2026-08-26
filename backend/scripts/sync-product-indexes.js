import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import Product from '../src/models/Product.js';

async function main() {
  await connectDB();
  console.log('[before] indexes:', JSON.stringify(await Product.collection.indexes(), null, 2));
  const result = await Product.syncIndexes();
  console.log('[syncIndexes result]', result);
  console.log('[after] indexes:', JSON.stringify(await Product.collection.indexes(), null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
