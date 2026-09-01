import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Cartella dove verranno salvate fisicamente le foto caricate
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'portfolio');

// Assicuriamoci che la cartella base esista
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve the uploads folder as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configurazione di Multer per il salvataggio dei file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || 'Uncategorized';
    const catPath = path.join(UPLOADS_DIR, category);
    if (!fs.existsSync(catPath)) {
      fs.mkdirSync(catPath, { recursive: true });
    }
    cb(null, catPath);
  },
  filename: (req, file, cb) => {
    // Generiamo un nome file unico per evitare sovrascritture
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

// 1. GET /api/portfolio (Restituisce categorie e relative immagini)
app.get('/api/portfolio', (req, res) => {
  try {
    const categories = [];
    const imagesByCategory = {};
    
    if (fs.existsSync(UPLOADS_DIR)) {
      const items = fs.readdirSync(UPLOADS_DIR, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          const categoryName = item.name;
          categories.push(categoryName);
          
          const catPath = path.join(UPLOADS_DIR, categoryName);
          const files = fs.readdirSync(catPath);
          const imageUrls = files
            .filter(f => f.match(/\.(jpg|jpeg|png|gif|webp)$/i))
            .map(f => `/uploads/portfolio/${encodeURIComponent(categoryName)}/${encodeURIComponent(f)}`);
            
          // Usiamo un ID normalizzato per la chiave, come fa il frontend
          imagesByCategory[categoryName.toLowerCase().replace(/\s+/g, '')] = imageUrls;
        }
      }
    }
    
    res.json({ categories, imagesByCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore durante la lettura del portfolio' });
  }
});

// 2. POST /api/portfolio/category (Crea una nuova cartella categoria)
app.post('/api/portfolio/category', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome categoria mancante' });
  
  const catPath = path.join(UPLOADS_DIR, name);
  if (!fs.existsSync(catPath)) {
    fs.mkdirSync(catPath, { recursive: true });
    res.json({ success: true, message: 'Categoria creata' });
  } else {
    res.status(400).json({ error: 'Categoria già esistente' });
  }
});

// 3. DELETE /api/portfolio/category/:name (Elimina intera categoria)
app.delete('/api/portfolio/category/:name', (req, res) => {
  const { name } = req.params;
  const catPath = path.join(UPLOADS_DIR, name);
  
  if (fs.existsSync(catPath)) {
    fs.rmSync(catPath, { recursive: true, force: true });
    res.json({ success: true, message: 'Categoria eliminata' });
  } else {
    res.status(404).json({ error: 'Categoria non trovata' });
  }
});

// 4. POST /api/portfolio/upload (Carica una nuova immagine in una categoria)
app.post('/api/portfolio/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });
  res.json({ 
    success: true, 
    url: `/uploads/portfolio/${encodeURIComponent(req.body.category)}/${encodeURIComponent(req.file.filename)}` 
  });
});

// 5. DELETE /api/portfolio/image (Elimina una singola immagine)
app.delete('/api/portfolio/image', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL mancante' });
  
  try {
    const relativePath = decodeURIComponent(url.replace(/^\/uploads\//, ''));
    const absolutePath = path.join(__dirname, 'uploads', relativePath);
    
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      res.json({ success: true, message: 'Immagine eliminata' });
    } else {
      res.status(404).json({ error: 'Immagine non trovata sul server' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore durante l\'eliminazione' });
  }
});

// 6. GET & POST config (Gestione pagina attiva: Chi Siamo / Portfolio)
const CONFIG_FILE = path.join(__dirname, 'uploads', 'config.json');

app.get('/api/config', (req, res) => {
  if (fs.existsSync(CONFIG_FILE)) {
    res.json(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')));
  } else {
    res.json({ pageMode: 'chisiamo' });
  }
});

app.post('/api/config', (req, res) => {
  const config = req.body.config || req.body;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server Node.js per gestione admin in esecuzione sulla porta ${PORT}`);
});
