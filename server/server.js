import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { getDatabase, closeDatabase } from './db.js';
import { createChoreography, getChoreographies, getChoreographyById, updateChoreography, deleteChoreography, searchChoreographies, getLevels, addLevel } from './routes/choreographies.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database
getDatabase();

// Routes
app.post('/api/choreographies', createChoreography);
app.get('/api/choreographies', getChoreographies);
app.get('/api/choreographies/search', searchChoreographies);
app.get('/api/choreographies/:id', getChoreographyById);
app.put('/api/choreographies/:id', updateChoreography);
app.delete('/api/choreographies/:id', deleteChoreography);
app.get('/api/levels', getLevels);
app.post('/api/levels', addLevel);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});
