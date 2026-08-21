import mongoose from 'mongoose';
import env from './env.js';

mongoose.set('strictQuery', true);

export async function connectDB() {
  mongoose.connection.on('connected', () => {
    // eslint-disable-next-line no-console
    console.log('[db] MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[db] MongoDB connection error:', err.message);
  });

  await mongoose.connect(env.mongoUri);
  return mongoose.connection;
}

export default connectDB;
