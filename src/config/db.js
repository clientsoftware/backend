import mongoose from 'mongoose';

/**
 * Connect to MongoDB Atlas (or local) via MONGODB_URI.
 * If connection fails and ALLOW_MEMORY_DB is not false, fall back to
 * mongodb-memory-server so local UI development still works.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  mongoose.set('strictQuery', true);

  if (uri) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
      return { mode: 'atlas-or-local' };
    } catch (err) {
      console.warn(`MongoDB URI connection failed: ${err.message}`);
      if (process.env.ALLOW_MEMORY_DB === 'false') throw err;
      console.warn('Falling back to in-memory MongoDB (dev only)...');
    }
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  const memUri = mongod.getUri('coppermart');
  await mongoose.connect(memUri);
  console.log('MongoDB Memory Server connected (data resets on restart)');
  console.log('Tip: set MONGODB_URI in backend/.env to your Atlas string for persistent data.');
  return { mode: 'memory', mongod };
}
