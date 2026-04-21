require("dotenv").config();
const path = require("path");
const fs = require("fs");
const createDatabase = require("@databases/sqlite").default;
const sql = require("@databases/sqlite").sql;

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");

const DB_PATH = path.join(DATA_DIR, "bookdahelo.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = createDatabase(DB_PATH);

// ─── Schema ───────────────────────────────────────────────────────────────────

async function initDB() {
  await db.query(sql`PRAGMA foreign_keys = ON`);
  await db.query(sql`PRAGMA journal_mode = WAL`);

  await db.query(sql`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY COLLATE NOCASE,
      password TEXT NOT NULL,
      bio TEXT,
      avatar TEXT,
      shelf TEXT,
      pandinhas INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.query(sql`INSERT OR IGNORE INTO users (username, password, bio, avatar) VALUES ('Caio', '1234', 'Apaixonado por histórias que transformam', '🐼')`);
  await db.query(sql`INSERT OR IGNORE INTO users (username, password, bio, avatar) VALUES ('Helo', '1234', 'Apaixonada por histórias que transformam', '🎀')`);

  await db.query(sql`
    CREATE TABLE IF NOT EXISTS books (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      author       TEXT NOT NULL DEFAULT '',
      description  TEXT NOT NULL DEFAULT '',
      genre        TEXT NOT NULL DEFAULT 'Outros',
      rating       REAL NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      is_public    INTEGER NOT NULL DEFAULT 1,
      cover_color  TEXT NOT NULL DEFAULT 'lavender-mint',
      added_at     INTEGER NOT NULL,
      pdf_path     TEXT,
      is_user_book INTEGER NOT NULL DEFAULT 0,
      cover_image_path TEXT
    )
  `);

  await db.query(sql`
    CREATE TABLE IF NOT EXISTS book_reviews (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      username   TEXT NOT NULL,
      rating     REAL NOT NULL,
      comment    TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    )
  `);

  await db.query(sql`
    CREATE TABLE IF NOT EXISTS book_pages (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id  TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      page_num INTEGER NOT NULL,
      content  TEXT NOT NULL
    )
  `);

  await db.query(sql`
    CREATE TABLE IF NOT EXISTS reading_progress (
      username     TEXT NOT NULL,
      book_id      TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      current_page INTEGER NOT NULL DEFAULT 0,
      total_pages  INTEGER NOT NULL DEFAULT 1,
      progress     REAL NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'lendo',
      started_at   INTEGER NOT NULL,
      last_read_at INTEGER NOT NULL,
      PRIMARY KEY (username, book_id)
    )
  `);

  await db.query(sql`
    CREATE TABLE IF NOT EXISTS notes (
      id         TEXT PRIMARY KEY,
      username   TEXT NOT NULL,
      book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      date_label TEXT NOT NULL,
      feedback   TEXT NOT NULL,
      rating     REAL NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  await db.query(sql`
    CREATE TABLE IF NOT EXISTS saved_books (
      username TEXT NOT NULL,
      book_id  TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      saved_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      PRIMARY KEY (username, book_id)
    )
  `);

  await db.query(sql`
    CREATE TABLE IF NOT EXISTS nicknames (
      from_user TEXT NOT NULL,
      to_user TEXT NOT NULL,
      nickname TEXT NOT NULL,
      PRIMARY KEY (from_user, to_user)
    )
  `);

  await db.query(sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT NOT NULL,
      receiver TEXT NOT NULL,
      content TEXT NOT NULL,
      shared_book_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  await db.query(sql`
    CREATE TABLE IF NOT EXISTS book_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT NOT NULL,
      receiver TEXT NOT NULL,
      book_id TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.query(sql`
    CREATE TABLE IF NOT EXISTS global_status (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      content TEXT NOT NULL,
      emote TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Initialize status if empty (always runs to be safe)
  try {
    await db.query(sql`INSERT OR IGNORE INTO global_status (id, username, content, emote, updated_at) VALUES (1, 'Sistema', 'Bem-vindos ao Books da Helo! ✨', '🐼', ${Date.now()})`);
  } catch (err) {
    console.error("Erro ao inicializar status:", err);
  }

  // Migration: add auth and users to existing tables
  try {
    const tableInfo = await db.query(sql`PRAGMA table_info(reading_progress)`);
    if (!tableInfo.some(c => c.name === 'username')) {
      console.log("Realizando migração para multi-usuários...");
      
      // Inserir usuários padrão
      await db.query(sql`INSERT OR IGNORE INTO users (username, password, bio, avatar) VALUES ('Caio', '1234', 'Apaixonado por histórias que transformam', '🐼')`);
      await db.query(sql`INSERT OR IGNORE INTO users (username, password, bio, avatar) VALUES ('Helo', '1234', 'Apaixonada por histórias que transformam', '🎀')`);

      // Migrar reading_progress
      await db.query(sql`CREATE TABLE reading_progress_new (
        username     TEXT NOT NULL,
        book_id      TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        current_page INTEGER NOT NULL DEFAULT 0,
        total_pages  INTEGER NOT NULL DEFAULT 1,
        progress     REAL NOT NULL DEFAULT 0,
        status       TEXT NOT NULL DEFAULT 'lendo',
        started_at   INTEGER NOT NULL,
        last_read_at INTEGER NOT NULL,
        PRIMARY KEY (username, book_id)
      )`);
      await db.query(sql`INSERT INTO reading_progress_new SELECT 'Caio', * FROM reading_progress`);
      await db.query(sql`DROP TABLE reading_progress`);
      await db.query(sql`ALTER TABLE reading_progress_new RENAME TO reading_progress`);

      // Migrar saved_books
      await db.query(sql`CREATE TABLE saved_books_new (
        username TEXT NOT NULL,
        book_id  TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        saved_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
        PRIMARY KEY (username, book_id)
      )`);
      await db.query(sql`INSERT INTO saved_books_new SELECT 'Caio', * FROM saved_books`);
      await db.query(sql`DROP TABLE saved_books`);
      await db.query(sql`ALTER TABLE saved_books_new RENAME TO saved_books`);

      // Migrar notes
      await db.query(sql`CREATE TABLE notes_new (
        id         TEXT PRIMARY KEY,
        username   TEXT NOT NULL,
        book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        date_label TEXT NOT NULL,
        feedback   TEXT NOT NULL,
        rating     REAL NOT NULL,
        created_at INTEGER NOT NULL
      )`);
      await db.query(sql`INSERT INTO notes_new SELECT id, 'Caio', book_id, date_label, feedback, rating, created_at FROM notes`);
      await db.query(sql`DROP TABLE notes`);
      await db.query(sql`ALTER TABLE notes_new RENAME TO notes`);
      
      console.log("Migração concluída com sucesso.");
    }
  } catch (err) {
    console.log("Migration check complete or skipped.");
  }

  // Migration: pandinhas
  try {
    const tableInfo = await db.query(sql`PRAGMA table_info(users)`);
    if (!tableInfo.some(c => c.name === 'pandinhas')) {
      await db.query(sql`ALTER TABLE users ADD COLUMN pandinhas INTEGER NOT NULL DEFAULT 0`);
      console.log("Migração de pandinhas concluída.");
    }
  } catch (err) {}

  // Garante que os usuários padrão existam
  try {
    await db.query(sql`INSERT OR IGNORE INTO users (username, password, bio, avatar) VALUES ('Caio', '1234', 'Apaixonado por histórias que transformam', '🐼')`);
    await db.query(sql`INSERT OR IGNORE INTO users (username, password, bio, avatar) VALUES ('Helo', '1234', 'Apaixonada por histórias que transformam', '🎀')`);
  } catch (err) {}
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seedData() {
  const seedBooks = [
    { id: "1", title: "A Paciente Silenciosa", author: "Alex Michaelides", description: "Alicia Berenson é uma pintora famosa que mata seu marido com cinco tiros no rosto e, desde então, nunca mais disse uma palavra.", genre: "Suspense", rating: 5, review_count: 1243, cover_color: "lavender-mint" },
    { id: "2", title: "É Assim que Acaba", author: "Colleen Hoover", description: "Lily Bloom está em Boston para realizar seu sonho de abrir sua própria floricultura.", genre: "Romance", rating: 5, review_count: 2156, cover_color: "peach-lavender" },
    { id: "3", title: "Daisy Jones & The Six", author: "Taylor Jenkins Reid", description: "A ascensão e queda de uma banda de rock icônica dos anos 70, narrada em formato de documentário.", genre: "Ficção", rating: 4, review_count: 987, cover_color: "mint-sky" },
    { id: "4", title: "Verity", author: "Colleen Hoover", description: "Lowen Ashby aceita terminar a série de sucesso de Verity Crawford. Mas ao revirar os manuscritos, ela encontra um capítulo que nunca deveria ter sido lido.", genre: "Suspense", rating: 5, review_count: 1876, cover_color: "blush-lavender" },
    { id: "5", title: "O Conto da Aia", author: "Margaret Atwood", description: "Uma distopia poderosa sobre controle e resistência. Em Gilead, mulheres férteis são forçadas a ser Aias.", genre: "Distopia", rating: 5, review_count: 3241, cover_color: "peach-mint" },
    { id: "6", title: "Mulheres que Correm com os Lobos", author: "Clarissa Pinkola Estés", description: "Uma jornada profunda ao inconsciente feminino através de mitos e contos de fada.", genre: "Autoconhecimento", rating: 4, review_count: 2098, cover_color: "lemon-peach" },
    { id: "7", title: "O Poder do Hábito", author: "Charles Duhigg", description: "Como os hábitos funcionam e como podemos transformar nossas vidas mudando ciclos de gatilho, rotina e recompensa.", genre: "Desenvolvimento", rating: 4, review_count: 4512, cover_color: "sky-mint" },
    { id: "8", title: "Sapiens", author: "Yuval Noah Harari", description: "Uma breve história da humanidade que explora como o Homo sapiens se tornou a espécie dominante do planeta.", genre: "História", rating: 5, review_count: 6789, cover_color: "lavender-peach" },
  ];

  for (const b of seedBooks) {
    await db.query(sql`INSERT INTO books (id,title,author,description,genre,rating,review_count,is_public,cover_color,added_at,is_user_book) VALUES (${b.id},${b.title},${b.author},${b.description},${b.genre},${b.rating},${b.review_count},1,${b.cover_color},${Date.now()},0)`);
  }

  const pages = {
    "1": ["Alicia Berenson tinha trinta e três anos quando matou o marido. Ele se chamava Gabriel Berenson, era fotógrafo de moda.", "Naquela noite de verão em particular, Gabriel voltou para casa mais tarde que o normal. Alicia estava na cozinha.", "Ela se virou e deu cinco tiros no rosto dele. E depois nunca mais falou uma única palavra.", "O silêncio de Alicia era tão ensurdecedor quanto os tiros. Tornou-se mundialmente famosa."],
    "2": ["Lily Bloom cresceu observando seu pai destruir sua mãe, noite após noite. Ela jurou que nunca se permitiria estar nessa posição.", "Boston parecia um recomeço. Uma floricultura, um apartamento novo, e a sensação de que desta vez seria diferente.", "Ryle Kincaid entrou em sua vida como uma tempestade — bonito, intenso, irresistível.", "O amor não deveria doer. Mas às vezes, quando você ama demais, esquece que merece algo melhor."],
    "3": ["Todo mundo sabe quem foi Daisy Jones. Todo mundo sabe a música. Mas ninguém sabe realmente o que aconteceu.", "Ela tinha dezoito anos quando o Whisky a Go Go a colocou no palco pela primeira vez.", "Billy Dunne era casado, comprometido, tentando manter sua vida unida enquanto a banda explodia.", "O álbum Aurora foi lançado em 1977. Três meses depois, a banda se desfez para sempre."],
    "4": ["Eu não devia estar lendo isso. O manuscrito estava escondido entre papéis antigos.", "Verity Crawford era uma autora brilhante. Seu marido, Jeremy, era ainda mais brilhante.", "As páginas descreviam coisas horríveis. Seriam confissões reais ou apenas ficção?", "No fim, nunca mais conseguiria confiar em ninguém da mesma forma."],
    "5": ["Offred é o nome que me deram. O nome anterior não importa mais.", "Gilead foi construído sobre os escombros dos Estados Unidos. Sobre nós, as mulheres.", "Toda noite, rezo para que isso termine. Todo dia, finjo que acredito que é Deus que quis assim.", "Mas há resistência. Pequena, frágil, perigosíssima."],
    "6": ["Dentro de cada mulher existe uma vida selvagem. Uma psique instintiva.", "Contamos histórias para curar. Os contos de fada não são apenas entretenimento."],
    "7": ["Toda manhã, Eugene Pauly acordava sem saber quem era. Mas conseguia fazer o café.", "Os hábitos nunca desaparecem realmente. Ficam gravados nas estruturas do nosso cérebro."],
    "8": ["Há cerca de 13,5 bilhões de anos, matéria, energia, tempo e espaço surgiram no Big Bang.", "Durante mais de 2 milhões de anos, os humanos foram criaturas sem grande importância.", "A Revolução Cognitiva aconteceu há cerca de 70 mil anos.", "O segredo do sucesso humano é a nossa capacidade de criar e acreditar em ficções."],
  };

  for (const [bookId, bookPages] of Object.entries(pages)) {
    for (let i = 0; i < bookPages.length; i++) {
      await db.query(sql`INSERT INTO book_pages (book_id,page_num,content) VALUES (${bookId},${i},${bookPages[i]})`);
    }
  }

  const reviews = [
    { book_id: "1", username: "Maria", rating: 5, comment: "Impossível parar de ler!" },
    { book_id: "1", username: "João", rating: 4, comment: "Final surpreendente" },
    { book_id: "2", username: "Ana", rating: 5, comment: "Chorei muito!" },
    { book_id: "4", username: "Fernanda", rating: 5, comment: "Não consegui dormir!" },
    { book_id: "5", username: "Sofia", rating: 5, comment: "Assustadoramente atual" },
    { book_id: "8", username: "Rafael", rating: 5, comment: "Livro que muda perspectivas" },
  ];

  for (const r of reviews) {
    await db.query(sql`INSERT INTO book_reviews (book_id,username,rating,comment) VALUES (${r.book_id},${r.username},${r.rating},${r.comment})`);
  }

  const progressData = [
    { book_id: "1", current_page: 1, total_pages: 4, progress: 65, status: "lendo" },
    { book_id: "2", current_page: 1, total_pages: 4, progress: 42, status: "lendo" },
    { book_id: "3", current_page: 2, total_pages: 4, progress: 78, status: "lendo" },
    { book_id: "4", current_page: 3, total_pages: 4, progress: 100, status: "finalizado" },
    { book_id: "5", current_page: 3, total_pages: 4, progress: 100, status: "finalizado" },
    { book_id: "6", current_page: 0, total_pages: 2, progress: 23, status: "pausado" },
    { book_id: "7", current_page: 1, total_pages: 2, progress: 56, status: "pausado" },
  ];

  for (const p of progressData) {
    const t = Date.now();
    await db.query(sql`INSERT INTO reading_progress (book_id,current_page,total_pages,progress,status,started_at,last_read_at) VALUES (${p.book_id},${p.current_page},${p.total_pages},${p.progress},${p.status},${t},${t})`);
  }

  const notesData = [
    { id: "n1", book_id: "1", date_label: "10/04", feedback: "Começando... muito interessante", rating: 4 },
    { id: "n2", book_id: "1", date_label: "15/04", feedback: "Plot twist incrível!", rating: 5 },
    { id: "n3", book_id: "2", date_label: "08/04", feedback: "Personagens muito reais", rating: 5 },
  ];

  for (const n of notesData) {
    await db.query(sql`INSERT INTO notes (id,book_id,date_label,feedback,rating,created_at) VALUES (${n.id},${n.book_id},${n.date_label},${n.feedback},${n.rating},${Date.now()})`);
  }

  for (const id of ["4", "5"]) {
    await db.query(sql`INSERT INTO saved_books (book_id,saved_at) VALUES (${id},${Date.now()})`);
  }

  console.log("✅ Banco de dados populado com dados iniciais");
}

module.exports = { db, sql, initDB };
