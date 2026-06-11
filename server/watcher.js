const fs = require("fs");
const path = require("path");

const WATCH_DIR = process.env.LIVROS_DIR || path.resolve(__dirname, "../Livros");
const COVER_COLORS = ["sky-mint", "lavender-mint", "peach-lavender", "blush-lavender", "mint-sky", "peach-mint", "lemon-peach", "lavender-peach"];

// In-memory lock to prevent race conditions during concurrent watch events
const importingFiles = new Set();

function parseBookFilename(filename) {
  // Remove extension
  const base = filename.replace(/\.pdf$/i, "").trim();
  
  let title = "";
  let author = "";

  // Try splitting by hyphen first
  if (base.includes(" - ")) {
    const parts = base.split(" - ");
    title = parts[0].trim();
    author = parts[1].trim();
  } else if (base.includes(" -")) {
    const parts = base.split(" -");
    title = parts[0].trim();
    author = parts[1].trim();
  } else if (base.includes("- ")) {
    const parts = base.split("- ");
    title = parts[0].trim();
    author = parts[1].trim();
  } else {
    // Match known authors (case-insensitive) if no hyphen exists
    const knownAuthors = ["Freida McFadden", "Rebecca Ross", "Ali Hazelwood"];
    let matched = false;
    for (const kAuthor of knownAuthors) {
      const index = base.toLowerCase().lastIndexOf(kAuthor.toLowerCase());
      if (index !== -1) {
        title = base.substring(0, index).trim();
        author = kAuthor;
        matched = true;
        break;
      }
    }
    if (!matched) {
      title = base;
      author = "";
    }
  }

  // Adjust specific mis-parsed cases (e.g. "Até o Último de Nós Freida - McFadden" split by "-")
  if (title.toLowerCase().endsWith("freida") && author.toLowerCase() === "mcfadden") {
    title = title.substring(0, title.toLowerCase().lastIndexOf("freida")).trim();
    author = "Freida McFadden";
  }

  return { title, author };
}

async function importPdfFile(filePath, db, sql, PORT, uploadFileToCloud) {
  const filename = path.basename(filePath);
  if (importingFiles.has(filename)) return;
  importingFiles.add(filename);

  try {
    const { title, author } = parseBookFilename(filename);

    if (!title) {
      console.log(`[Watcher] Ignorando arquivo sem título legível: ${filename}`);
      return;
    }

    // Check if the book already exists in DB (same title and author, case-insensitive)
    const [existing] = await db.query(sql`
      SELECT id FROM books 
      WHERE LOWER(TRIM(title)) = LOWER(TRIM(${title})) 
        AND LOWER(TRIM(author)) = LOWER(TRIM(${author}))
    `);

    if (existing) {
      // Already imported
      return;
    }

    console.log(`[Watcher] Novo livro detectado: "${title}" por "${author || "Desconhecido"}"`);

    const id = `imported-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const cloudFilename = `pdfs/imported-${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Read file buffer
    const fileBuffer = fs.readFileSync(filePath);

    // Upload to cloud (S3/Supabase) or fallback to local uploads folder
    const pdfUrl = await uploadFileToCloud(fileBuffer, cloudFilename, "application/pdf");
    const coverColor = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)];

    // Insert into books table
    await db.query(sql`
      INSERT INTO books (id, title, author, description, genre, rating, review_count, is_public, cover_color, added_at, pdf_path, cover_image_path, is_user_book)
      VALUES (${id}, ${title}, ${author}, '', 'Outros', 0, 0, 1, ${coverColor}, ${Date.now()}, ${pdfUrl}, NULL, 1)
    `);

    // Add to saved books list (Quero Ler) for all existing users in DB + 'anonymous' (default for not logged in)
    const users = await db.query(sql`SELECT username FROM users`);
    const usernames = users.map(u => u.username);
    if (!usernames.some(u => u.toLowerCase() === "anonymous")) {
      usernames.push("anonymous");
    }
    for (const username of usernames) {
      await db.query(sql`INSERT OR IGNORE INTO saved_books (username, book_id, saved_at) VALUES (${username}, ${id}, ${Date.now()})`);
    }

    console.log(`[Watcher] Livro "${title}" importado com sucesso! (ID: ${id})`);
  } catch (err) {
    console.error(`[Watcher] Erro ao importar livro ${filename}:`, err);
  } finally {
    importingFiles.delete(filename);
  }
}

function initWatcher(db, sql, PORT, uploadFileToCloud) {
  // Ensure watch folder exists
  if (!fs.existsSync(WATCH_DIR)) {
    console.log(`[Watcher] Criando diretório de monitoramento: ${WATCH_DIR}`);
    fs.mkdirSync(WATCH_DIR, { recursive: true });
  } else {
    console.log(`[Watcher] Monitorando pasta de Livros em: ${WATCH_DIR}`);
  }

  // Initial Scan
  fs.readdir(WATCH_DIR, (err, files) => {
    if (err) {
      console.error("[Watcher] Erro ao ler pasta de livros:", err);
      return;
    }
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith(".pdf"));
    console.log(`[Watcher] Varredura inicial: ${pdfFiles.length} arquivos PDF encontrados.`);
    
    // Process sequentially on startup
    (async () => {
      for (const file of pdfFiles) {
        const filePath = path.join(WATCH_DIR, file);
        await importPdfFile(filePath, db, sql, PORT, uploadFileToCloud);
      }
    })();
  });

  // Watch for new files
  let watchTimeout = null;
  fs.watch(WATCH_DIR, (eventType, filename) => {
    if (filename && filename.toLowerCase().endsWith(".pdf")) {
      // Debounce the watch event to let the file copy finish completely
      if (watchTimeout) clearTimeout(watchTimeout);
      watchTimeout = setTimeout(async () => {
        const filePath = path.join(WATCH_DIR, filename);
        if (fs.existsSync(filePath)) {
          await importPdfFile(filePath, db, sql, PORT, uploadFileToCloud);
        }
      }, 1000); // Wait 1s for file write to stabilize
    }
  });
}

module.exports = { initWatcher };
