import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { seedDatabase } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (_req, res) => {
  res.json({ success: true, data: { service: 'CopperMart API' }, message: 'CopperMart Backend is running' });
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { service: 'CopperMart API' }, message: 'OK' });
});

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`CopperMart API → http://localhost:${PORT}`);
    console.log(`Health check  → http://localhost:${PORT}/api/health`);
    console.log(`Admin login   → admin@coppermart.app / admin123`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  console.error(
    '\nSet MONGODB_URI in backend/.env to your MongoDB Atlas connection string.\nExample: mongodb+srv://user:pass@cluster0.xxx.mongodb.net/coppermart\n'
  );
  process.exit(1);
});
