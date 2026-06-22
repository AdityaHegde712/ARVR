import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import chatHandler from './chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = 3001;

// Middleware
app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  })
);
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────

/** Health check */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/** Get all products */
app.get('/api/products', (_req, res) => {
  try {
    const catalogPath = path.resolve(__dirname, '../src/data/catalog.json');
    const data = readFileSync(catalogPath, 'utf-8');
    const products = JSON.parse(data);
    res.json(products);
  } catch (error) {
    console.error('Error reading catalog:', error);
    res.status(500).json({ error: 'Failed to read product catalog' });
  }
});

/** Get a single product by ID */
app.get('/api/products/:id', (req, res) => {
  try {
    const catalogPath = path.resolve(__dirname, '../src/data/catalog.json');
    const data = readFileSync(catalogPath, 'utf-8');
    const products = JSON.parse(data);
    const product = products.find((p: { id: string }) => p.id === req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error reading catalog:', error);
    res.status(500).json({ error: 'Failed to read product catalog' });
  }
});

/** OpenAI chat proxy */
app.post('/api/chat', chatHandler);

// ─── Start server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🧑‍💻 ARVR Backend Server running on http://localhost:${PORT}`);
  console.log(
    `🔑 OpenAI API key ${process.env.OPENAI_API_KEY ? 'is set ✓' : 'is NOT set ✗'}`
  );
});
