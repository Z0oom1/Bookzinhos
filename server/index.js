require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const { db, sql, initDB } = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Supabase Storage ─────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
const BUCKET = "bookzinhos";

async function uploadToSupabase(buffer, filename, mimetype) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: mimetype, upsert: true });
  if (error) throw new Error("Supabase upload error: " + error.message);
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return urlData.publicUrl;
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

// ─── Upload (memória temporária para repassar ao Supabase) ────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });


// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h1>🐼 Bookzinhos API</h1>
      <p>O servidor está rodando com sucesso! ✨</p>
      <p style="color: #666;">Use a URL do seu Frontend para acessar o app.</p>
    </div>
  `);
});
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rowToBook(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    description: row.description,
    genre: row.genre,
    rating: row.rating,
    reviewCount: row.review_count,
    isPublic: !!row.is_public,
    coverColor: row.cover_color,
    addedAt: row.added_at,
    // Supabase URLs are stored as full URLs now
    pdfPath: row.pdf_path || null,
    coverImagePath: row.cover_image_path || null,
    isUserBook: !!row.is_user_book,
  };
}

// ─── BOOKS ────────────────────────────────────────────────────────────────────

app.get("/books", async (_req, res) => {
  try {
    const books = await db.query(sql`SELECT * FROM books ORDER BY added_at DESC`);
    const result = await Promise.all(books.map(async (b) => {
      const book = rowToBook(b);
      const notes = await db.query(sql`SELECT rating, feedback as comment FROM notes WHERE book_id = ${b.id}`);
      if (notes.length > 0) {
        book.rating = Math.round(notes.reduce((sum, n) => sum + n.rating, 0) / notes.length);
        book.reviewCount = notes.length;
      }
      book.reviews = notes;
      const [countRow] = await db.query(sql`SELECT COUNT(*) as c FROM book_pages WHERE book_id = ${b.id}`);
      book.pageCount = Number(countRow.c);
      return book;
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/books/:id", async (req, res) => {
  try {
    const [row] = await db.query(sql`SELECT * FROM books WHERE id = ${req.params.id}`);
    if (!row) return res.status(404).json({ error: "Livro não encontrado" });
    const book = rowToBook(row);
    const notes = await db.query(sql`SELECT rating, feedback as comment FROM notes WHERE book_id = ${row.id}`);
    if (notes.length > 0) {
      book.rating = Math.round(notes.reduce((sum, n) => sum + n.rating, 0) / notes.length);
      book.reviewCount = notes.length;
    }
    book.reviews = notes;
    const pageRows = await db.query(sql`SELECT content FROM book_pages WHERE book_id = ${row.id} ORDER BY page_num`);
    book.pages = pageRows.map((r) => r.content);
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/books", upload.fields([{ name: "pdf", maxCount: 1 }, { name: "cover", maxCount: 1 }]), async (req, res) => {
  try {
    const { title, author, description, genre, isPublic, coverColor } = req.body;
    if (!title) return res.status(400).json({ error: "Título é obrigatório" });

    const id = `user-${Date.now()}`;
    const pdfFile = req.files?.pdf?.[0];
    const coverFile = req.files?.cover?.[0];

    let pdfUrl = null;
    let coverUrl = null;

    if (pdfFile) {
      const pdfName = `pdfs/${id}-${Date.now()}.pdf`;
      pdfUrl = await uploadToSupabase(pdfFile.buffer, pdfName, "application/pdf");
    }
    if (coverFile) {
      const coverName = `covers/${id}-${Date.now()}.jpg`;
      coverUrl = await uploadToSupabase(coverFile.buffer, coverName, coverFile.mimetype);
    }

    await db.query(sql`
      INSERT INTO books (id,title,author,description,genre,rating,review_count,is_public,cover_color,added_at,pdf_path,cover_image_path,is_user_book)
      VALUES (${id},${title},${author || ""},${description || ""},${genre || "Outros"},0,0,${isPublic === "false" ? 0 : 1},${coverColor || "lavender-mint"},${Date.now()},${pdfUrl},${coverUrl},1)
    `);

    const [bookRow] = await db.query(sql`SELECT * FROM books WHERE id = ${id}`);
    const book = rowToBook(bookRow);
    book.reviews = [];
    book.pages = [];
    res.status(201).json(book);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/books/:id", upload.fields([{ name: "cover", maxCount: 1 }]), async (req, res) => {
  try {
    const { title, author, description, genre, isPublic, coverColor } = req.body;
    const coverFile = req.files?.cover?.[0];
    // Build update parts
    const [existing] = await db.query(sql`SELECT * FROM books WHERE id = ${req.params.id}`);
    if (!existing) return res.status(404).json({ error: "Livro não encontrado" });
    const newCoverPath = coverFile ? coverFile.path : existing.cover_image_path;
    await db.query(sql`
      UPDATE books SET
        title=${title || existing.title},
        author=${author ?? existing.author},
        description=${description ?? existing.description},
        genre=${genre || existing.genre},
        is_public=${isPublic === "false" ? 0 : 1},
        cover_color=${coverColor || existing.cover_color},
        cover_image_path=${newCoverPath}
      WHERE id=${req.params.id}
    `);
    const [updated] = await db.query(sql`SELECT * FROM books WHERE id = ${req.params.id}`);
    const book = rowToBook(updated);
    book.reviews = await db.query(sql`SELECT username, rating, comment FROM book_reviews WHERE book_id = ${req.params.id}`);
    book.pages = (await db.query(sql`SELECT content FROM book_pages WHERE book_id = ${req.params.id} ORDER BY page_num`)).map(r => r.content);
    res.json(book);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/books/:id/cover", upload.fields([{ name: "cover", maxCount: 1 }]), async (req, res) => {
  try {
    const coverFile = req.files?.cover?.[0];
    if (!coverFile) return res.status(400).json({ error: "Arquivo de capa obrigatório" });
    // Delete old cover if exists
    const [row] = await db.query(sql`SELECT cover_image_path FROM books WHERE id = ${req.params.id}`);
    if (row?.cover_image_path && fs.existsSync(row.cover_image_path)) fs.unlinkSync(row.cover_image_path);
    await db.query(sql`UPDATE books SET cover_image_path=${coverFile.path} WHERE id=${req.params.id}`);
    res.json({ coverImagePath: `/uploads/${path.basename(coverFile.path)}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/books/:id", async (req, res) => {
  try {
    const [row] = await db.query(sql`SELECT pdf_path, cover_image_path FROM books WHERE id = ${req.params.id}`);
    if (!row) return res.status(404).json({ error: "Livro não encontrado" });
    if (row.pdf_path && fs.existsSync(row.pdf_path)) fs.unlinkSync(row.pdf_path);
    if (row.cover_image_path && fs.existsSync(row.cover_image_path)) fs.unlinkSync(row.cover_image_path);
    await db.query(sql`DELETE FROM books WHERE id = ${req.params.id}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AUTH ───────────────────────────────────────────────────────────────────────

app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [user] = await db.query(sql`SELECT * FROM users WHERE username = ${username} COLLATE NOCASE AND password = ${password}`);
    if (!user) return res.status(401).json({ error: "Usuário ou senha incorretos." });
    res.json({ username: user.username, bio: user.bio, avatar: user.avatar, shelf: user.shelf ? JSON.parse(user.shelf) : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
    const [existing] = await db.query(sql`SELECT * FROM users WHERE username = ${username} COLLATE NOCASE`);
    if (existing) return res.status(400).json({ error: "Este usuário já existe." });
    await db.query(sql`INSERT INTO users (username, password, bio, avatar) VALUES (${username}, ${password}, 'Apaixonada por histórias que transformam', '🐼')`);
    res.status(201).json({ username, bio: 'Apaixonada por histórias que transformam', avatar: '🐼', shelf: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/auth/me", async (req, res) => {
  try {
    const { bio, avatar, shelf } = req.body;
    const username = req.headers['x-user-id'];
    if (!username) return res.status(401).json({ error: "Não autorizado" });
    await db.query(sql`UPDATE users SET bio=${bio}, avatar=${avatar}, shelf=${JSON.stringify(shelf)} WHERE username=${username} COLLATE NOCASE`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SOCIAL & CHAT ────────────────────────────────────────────────────────────

app.get("/users", async (req, res) => {
  try {
    const rows = await db.query(sql`SELECT username, bio, avatar, pandinhas FROM users`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/users/:username", async (req, res) => {
  try {
    const [row] = await db.query(sql`SELECT username, bio, avatar, shelf, pandinhas FROM users WHERE username = ${req.params.username} COLLATE NOCASE`);
    if (!row) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ username: row.username, bio: row.bio, avatar: row.avatar, shelf: row.shelf ? JSON.parse(row.shelf) : [], pandinhas: row.pandinhas });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/chat/:otherUser", async (req, res) => {
  try {
    const me = req.headers['x-user-id'];
    const other = req.params.otherUser;
    const messages = await db.query(sql`SELECT * FROM chat_messages WHERE (sender = ${me} AND receiver = ${other} COLLATE NOCASE) OR (sender = ${other} COLLATE NOCASE AND receiver = ${me}) ORDER BY created_at ASC`);
    
    // Marcar como lidas
    await db.query(sql`UPDATE chat_messages SET is_read = 1 WHERE receiver = ${me} AND sender = ${other} COLLATE NOCASE AND is_read = 0`);
    
    const [nick] = await db.query(sql`SELECT nickname FROM nicknames WHERE from_user = ${me} AND to_user = ${other} COLLATE NOCASE`);
    res.json({ messages, nickname: nick ? nick.nickname : null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/chat/:otherUser", async (req, res) => {
  try {
    const me = req.headers['x-user-id'];
    const other = req.params.otherUser;
    const { content, sharedBookId } = req.body;
    
    await db.query(sql`INSERT INTO chat_messages (sender, receiver, content, shared_book_id, created_at) VALUES (${me}, ${other}, ${content}, ${sharedBookId || null}, ${Date.now()})`);
    
    if (sharedBookId) {
      await db.query(sql`INSERT INTO book_recommendations (sender, receiver, book_id) VALUES (${me}, ${other}, ${sharedBookId})`);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/chat/nickname/:otherUser", async (req, res) => {
  try {
    const me = req.headers['x-user-id'];
    const other = req.params.otherUser;
    const { nickname } = req.body;
    
    const [existing] = await db.query(sql`SELECT 1 FROM nicknames WHERE from_user = ${me} AND to_user = ${other} COLLATE NOCASE`);
    if (existing) {
      await db.query(sql`UPDATE nicknames SET nickname = ${nickname} WHERE from_user = ${me} AND to_user = ${other} COLLATE NOCASE`);
    } else {
      await db.query(sql`INSERT INTO nicknames (from_user, to_user, nickname) VALUES (${me}, ${other}, ${nickname})`);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/status", async (req, res) => {
  try {
    const [status] = await db.query(sql`SELECT * FROM global_status WHERE id = 1`);
    res.json(status);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/status", async (req, res) => {
  try {
    const username = req.headers['x-user-id'];
    const { content, emote } = req.body;
    if (!username) return res.status(401).json({ error: "Não autorizado" });
    
    console.log(`[Status] Atualização solicitada por ${username}: "${content}" ${emote}`);

    // Tenta atualizar. Se não existir (0 rows affected), insere.
    await db.query(sql`INSERT OR REPLACE INTO global_status (id, username, content, emote, updated_at) VALUES (1, ${username}, ${content}, ${emote}, ${Date.now()})`);
    
    const [newStatus] = await db.query(sql`SELECT * FROM global_status WHERE id = 1`);
    res.json(newStatus);
  } catch (err) { 
    console.error("[Status Error]:", err);
    res.status(500).json({ error: err.message }); 
  }
});

app.get("/notifications", async (req, res) => {
  try {
    const me = req.headers['x-user-id'];
    if (!me) return res.json({ unreadCount: 0 });
    const [count] = await db.query(sql`SELECT COUNT(*) as c FROM chat_messages WHERE receiver = ${me} AND is_read = 0`);
    
    // Retorna a contagem agrupada por sender para a tela de chat principal
    const senders = await db.query(sql`SELECT sender, COUNT(*) as c FROM chat_messages WHERE receiver = ${me} AND is_read = 0 GROUP BY sender`);
    const details = {};
    for (const row of senders) details[row.sender] = Number(row.c);
    
    res.json({ unreadCount: Number(count.c), details });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PROGRESS ─────────────────────────────────────────────────────────────────

app.get("/progress", async (req, res) => {
  try {
    const username = req.headers['x-user-id'] || 'Caio';
    const rows = await db.query(sql`SELECT * FROM reading_progress WHERE username = ${username}`);
    res.json(rows.map((r) => ({
      bookId: r.book_id, currentPage: r.current_page, totalPages: r.total_pages,
      progress: r.progress, status: r.status, startedAt: r.started_at, lastReadAt: r.last_read_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/progress/:bookId", async (req, res) => {
  try {
    const username = req.headers['x-user-id'] || 'Caio';
    const [row] = await db.query(sql`SELECT * FROM reading_progress WHERE book_id = ${req.params.bookId} AND username = ${username}`);
    if (!row) return res.status(404).json({ error: "Sem progresso" });
    res.json({ bookId: row.book_id, currentPage: row.current_page, totalPages: row.total_pages, progress: row.progress, status: row.status, startedAt: row.started_at, lastReadAt: row.last_read_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/progress/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const { currentPage, totalPages, progress, status } = req.body;
    const username = req.headers['x-user-id'] || 'Caio';
    const [existing] = await db.query(sql`SELECT 1 FROM reading_progress WHERE book_id = ${bookId} AND username = ${username}`);
    if (existing) {
      await db.query(sql`UPDATE reading_progress SET current_page=${currentPage},total_pages=${totalPages},progress=${progress},status=${status},last_read_at=${Date.now()} WHERE book_id=${bookId} AND username=${username}`);
    } else {
      const t = Date.now();
      await db.query(sql`INSERT INTO reading_progress (username,book_id,current_page,total_pages,progress,status,started_at,last_read_at) VALUES (${username},${bookId},${currentPage},${totalPages},${progress},${status},${t},${t})`);
    }

    if (status === 'finalizado') {
      const pendingRecs = await db.query(sql`SELECT sender FROM book_recommendations WHERE receiver = ${username} COLLATE NOCASE AND book_id = ${bookId} AND completed = 0`);
      for (const rec of pendingRecs) {
        await db.query(sql`UPDATE users SET pandinhas = pandinhas + 1 WHERE username IN (${username}, ${rec.sender}) COLLATE NOCASE`);
      }
      if (pendingRecs.length > 0) {
        await db.query(sql`UPDATE book_recommendations SET completed = 1 WHERE receiver = ${username} COLLATE NOCASE AND book_id = ${bookId}`);
      }
    }

    const [updated] = await db.query(sql`SELECT * FROM reading_progress WHERE book_id = ${bookId} AND username = ${username}`);
    res.json({ bookId: updated.book_id, currentPage: updated.current_page, totalPages: updated.total_pages, progress: updated.progress, status: updated.status, startedAt: updated.started_at, lastReadAt: updated.last_read_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── NOTES ────────────────────────────────────────────────────────────────────

app.get("/notes", async (req, res) => {
  try {
    const username = req.headers['x-user-id'] || 'Caio';
    const rows = await db.query(sql`SELECT * FROM notes WHERE username = ${username} ORDER BY created_at DESC`);
    res.json(rows.map((r) => ({ id: r.id, bookId: r.book_id, date: r.date_label, feedback: r.feedback, rating: r.rating, createdAt: r.created_at })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/notes/book/:bookId", async (req, res) => {
  try {
    const username = req.headers['x-user-id'] || 'Caio';
    const rows = await db.query(sql`SELECT * FROM notes WHERE book_id = ${req.params.bookId} AND username = ${username} ORDER BY created_at DESC`);
    res.json(rows.map((r) => ({ id: r.id, bookId: r.book_id, date: r.date_label, feedback: r.feedback, rating: r.rating, createdAt: r.created_at })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/notes", async (req, res) => {
  try {
    const { bookId, feedback, rating } = req.body;
    const username = req.headers['x-user-id'] || 'Caio';
    if (!bookId || !feedback || rating == null)
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    const now = new Date();
    const dateLabel = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const id = `note-${Date.now()}`;
    await db.query(sql`INSERT INTO notes (id,username,book_id,date_label,feedback,rating,created_at) VALUES (${id},${username},${bookId},${dateLabel},${feedback},${rating},${Date.now()})`);
    res.status(201).json({ id, bookId, date: dateLabel, feedback, rating, createdAt: Date.now() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/notes/:id", async (req, res) => {
  try {
    const username = req.headers['x-user-id'] || 'Caio';
    await db.query(sql`DELETE FROM notes WHERE id = ${req.params.id} AND username = ${username}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SAVED ────────────────────────────────────────────────────────────────────

app.get("/saved", async (req, res) => {
  try {
    const username = req.headers['x-user-id'] || 'Caio';
    const rows = await db.query(sql`SELECT book_id FROM saved_books WHERE username = ${username} ORDER BY saved_at DESC`);
    res.json(rows.map((r) => r.book_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/saved/:bookId", async (req, res) => {
  try {
    const username = req.headers['x-user-id'] || 'Caio';
    await db.query(sql`INSERT OR IGNORE INTO saved_books (username,book_id,saved_at) VALUES (${username},${req.params.bookId},${Date.now()})`);
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/saved/:bookId", async (req, res) => {
  try {
    const username = req.headers['x-user-id'] || 'Caio';
    await db.query(sql`DELETE FROM saved_books WHERE book_id = ${req.params.bookId} AND username = ${username}`);
    res.json({ saved: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REVIEWS ─────────────────────────────────────────────────────────────────

app.post("/books/:id/reviews", async (req, res) => {
  try {
    const { username, rating, comment } = req.body;
    if (!username || !comment || rating == null)
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    await db.query(sql`INSERT INTO book_reviews (book_id,username,rating,comment) VALUES (${req.params.id},${username},${rating},${comment})`);
    const [stats] = await db.query(sql`SELECT AVG(rating) as avg, COUNT(*) as cnt FROM book_reviews WHERE book_id = ${req.params.id}`);
    await db.query(sql`UPDATE books SET rating=${Math.round(stats.avg * 10) / 10},review_count=${Number(stats.cnt)} WHERE id=${req.params.id}`);
    res.status(201).json({ username, rating, comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STATS ────────────────────────────────────────────────────────────────────

app.get("/stats", async (req, res) => {
  try {
    const username = req.headers['x-user-id'] || 'Caio';
    const [finished] = await db.query(sql`SELECT COUNT(*) as c FROM reading_progress WHERE status='finalizado' AND username=${username}`);
    const [reading] = await db.query(sql`SELECT COUNT(*) as c FROM reading_progress WHERE status='lendo' AND username=${username}`);
    const [notesCount] = await db.query(sql`SELECT COUNT(*) as c FROM notes WHERE username=${username}`);
    res.json({ finished: Number(finished.c), reading: Number(reading.c), notesCount: Number(notesCount.c) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  await initDB();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🐼 Books da Helo — Servidor rodando!`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/health\n`);
  });
}

start().catch((err) => {
  console.error("Erro ao iniciar servidor:", err);
  process.exit(1);
});
