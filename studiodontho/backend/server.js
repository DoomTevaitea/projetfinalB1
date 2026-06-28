const express = require("express");
const session = require("express-session");
const MySQLSessionStore = require("express-mysql-session")(session);
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 12;
const dbTimezone = process.env.DB_TIMEZONE || "+02:00";
const isProduction = process.env.NODE_ENV === "production";
const discoveryWorldOneLessonKeysByPath = {
  2: ["m1c2l1", "m1c2l2", "m1c2l3"],
  3: ["m1c3l1", "m1c3l2", "m1c3l3"],
  4: ["m1c4l1", "m1c4l2", "m1c4l3"],
  5: ["m1c5l3"]
};
const discoveryWorldOneLessonPages = Object.values(discoveryWorldOneLessonKeysByPath)
  .flatMap((lessonKeys) => lessonKeys.map((lessonKey) => `/${lessonKey}p1.html`));

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin"
  }
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Trop de tentatives. Reessaie dans quelques minutes."
  }
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

const localDevOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5501",
  "http://127.0.0.1:5501"
]);

if (!isProduction) {
  localDevOrigins.add("null");
}

const sessionStore = new MySQLSessionStore({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "studiodontho",
  port: Number(process.env.DB_PORT) || 3306,
  clearExpired: true,
  checkExpirationInterval: 1000 * 60 * 15,
  expiration: 1000 * 60 * 60 * 2,
  createDatabaseTable: true,
  schema: {
    tableName: "user_sessions",
    columnNames: {
      session_id: "session_id",
      expires: "expires",
      data: "data"
    }
  }
});

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && localDevOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(session({
  name: "studiodontho.sid",
  secret: process.env.SESSION_SECRET || "dev_secret_change_me",
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  proxy: isProduction,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 2
  }
}));

const proToolsLessonKey = "1m1c1l1";
const proToolsCourseLessonKey = "1m1c1l2";
const proToolsTestLessonKey = "1m1c1l3";
const proDiagnosticQuizLessonKey = "1m1c2l1";
const proDiagnosticCourseLessonKey = "1m1c2l2";
const proDiagnosticFinalLessonKey = "1m1c2l3";
const proClassificationQuizLessonKey = "1m1c3l1";
const proClassificationCourseLessonKey = "1m1c3l2";
const proClassificationTestLessonKey = "1m1c3l3";
const proDamTechniqueLessonKeys = ["1m1c4l1", "1m1c4l2", "1m1c4l3"];
const proWorldFinalTestLessonKey = "1m1c5l3";
const proQuizPages = Array.from({ length: 28 }, (_, index) => `/${proToolsLessonKey}p${index + 1}.html`);
const proToolsCoursePages = [`/${proToolsCourseLessonKey}p1.html`];
const proToolsTestPages = [`/${proToolsTestLessonKey}p1.html`];
const proDiagnosticQuizPages = Array.from({ length: 10 }, (_, index) => `/${proDiagnosticQuizLessonKey}p${index + 1}.html`);
const proDiagnosticCoursePages = [`/${proDiagnosticCourseLessonKey}p1.html`, `/${proDiagnosticCourseLessonKey}p2.html`];
const proDiagnosticFinalPages = [`/${proDiagnosticFinalLessonKey}p1.html`];
const proClassificationPages = [
  `/${proClassificationQuizLessonKey}p1.html`,
  `/${proClassificationCourseLessonKey}p1.html`,
  `/${proClassificationTestLessonKey}p1.html`
];
const proDamTechniquePages = [
  "/1m1c4l1p1.html",
  "/1m1c4l2p1.html",
  "/1m1c4l3p1.html",
  "/1m1c4l3p2.html"
];
const proWorldFinalTestPages = [`/${proWorldFinalTestLessonKey}p1.html`];

const protectedMobilePages = [
  "/profilmobil.html",
  "/classementmobil.html",
  "/coursmobil.html",
  "/entrainementmobil.html",
  "/cheminmobil.html",
  "/m1c1l1p1.html",
  "/m1c1l1p2.html",
  "/m1c1l2p1.html",
  "/m1c1l2p2.html",
  "/m1c1l2p3.html",
  "/m1c1l2p4.html",
  "/m1c1l3p1.html",
  ...discoveryWorldOneLessonPages,
  ...proQuizPages,
  ...proToolsCoursePages,
  ...proToolsTestPages,
  ...proDiagnosticQuizPages,
  ...proDiagnosticCoursePages,
  ...proDiagnosticFinalPages,
  ...proClassificationPages,
  ...proDamTechniquePages,
  ...proWorldFinalTestPages
];
const frontendDir = path.join(__dirname, "..", "frontend");
const publicDir = path.join(frontendDir, "public");
const imageDir = path.join(frontendDir, "img");

function requireLoggedUserPage(req, res, next) {
  if (req.session.user) {
    return next();
  }

  res.redirect("/page1mobil.html");
}

function requireLoggedUserApi(req, res, next) {
  if (req.session.user) {
    return next();
  }

  res.status(401).json({ message: "Connexion requise." });
}

app.get("/", (req, res) => {
  res.redirect("/page1mobil.html");
});

app.get(protectedMobilePages, requireLoggedUserPage, (req, res) => {
  res.sendFile(path.join(publicDir, path.basename(req.path)));
});

app.use(express.static(publicDir));
app.use("/img", express.static(imageDir));

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "studiodontho",
  port: Number(process.env.DB_PORT) || 3306,
  charset: "utf8mb4",
  timezone: dbTimezone,
  waitForConnections: true,
  connectionLimit: 10
});

db.on("connection", (connection) => {
  connection.query("SET time_zone = ?", [dbTimezone], (err) => {
    if (err) {
      console.error("Erreur timezone MySQL :", err.message);
    }
  });
});

const pointsPerCompletedPath = 10;
const progressModes = ["decouverte", "professionnel"];
const progressWorlds = [1, 2, 3];
const progressPaths = [1, 2, 3, 4, 5];

function emptyPointSummary() {
  return {
    decouverte: 0,
    professionnel: 0
  };
}

async function getUserPointSummary(userId, executor = db) {
  const [[points]] = await executor.execute(
    `SELECT
       COALESCE(SUM(CASE
         WHEN mode = 'decouverte'
          AND is_completed = 1
          AND passed_test = 1
         THEN 1 ELSE 0 END), 0) * ? AS decouverte,
       COALESCE(SUM(CASE
         WHEN mode = 'professionnel'
          AND is_completed = 1
          AND passed_test = 1
         THEN 1 ELSE 0 END), 0) * ? AS professionnel
     FROM path_progress
     WHERE user_id = ?`,
    [
      pointsPerCompletedPath,
      pointsPerCompletedPath,
      userId
    ]
  );

  return {
    decouverte: Number(points.decouverte) || 0,
    professionnel: Number(points.professionnel) || 0
  };
}

function getModePoints(pointSummary, mode) {
  return pointSummary?.[mode] || emptyPointSummary()[mode];
}

async function initializeDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prenom VARCHAR(100) NOT NULL,
      email VARCHAR(255) NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      is_guest TINYINT(1) NOT NULL DEFAULT 0,
      current_mode VARCHAR(20) NOT NULL DEFAULT 'decouverte',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.execute("ALTER TABLE users MODIFY email VARCHAR(255) NULL");
  await db.execute("ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL");
  await addColumnIfMissing("users", "is_guest", "TINYINT(1) NOT NULL DEFAULT 0");
  await addColumnIfMissing("users", "current_mode", "VARCHAR(20) NOT NULL DEFAULT 'decouverte'");
  await db.execute("ALTER TABLE users MODIFY current_mode VARCHAR(20) NOT NULL DEFAULT 'decouverte'");
  await db.execute("UPDATE users SET current_mode = 'decouverte' WHERE current_mode NOT IN ('decouverte', 'professionnel')");
  await addColumnIfMissing("users", "profile_image", "MEDIUMTEXT NULL");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS path_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      mode VARCHAR(20) NOT NULL,
      world_number TINYINT UNSIGNED NOT NULL,
      path_number TINYINT UNSIGNED NOT NULL,
      is_completed TINYINT(1) NOT NULL DEFAULT 0,
      passed_test TINYINT(1) NOT NULL DEFAULT 0,
      completed_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_path_progress (user_id, mode, world_number, path_number),
      INDEX idx_path_progress_user_mode_world (user_id, mode, world_number),
      INDEX idx_path_progress_mode_done_user (mode, is_completed, passed_test, user_id, completed_at)
    )
  `);
  await addColumnIfMissing("path_progress", "is_completed", "TINYINT(1) NOT NULL DEFAULT 0");
  await addColumnIfMissing("path_progress", "passed_test", "TINYINT(1) NOT NULL DEFAULT 0");
  await db.execute("ALTER TABLE path_progress MODIFY is_completed TINYINT(1) NOT NULL DEFAULT 0");
  await db.execute("ALTER TABLE path_progress MODIFY passed_test TINYINT(1) NOT NULL DEFAULT 0");
  await db.execute("ALTER TABLE path_progress MODIFY completed_at TIMESTAMP NULL DEFAULT NULL");
  await addIndexIfMissing(
    "path_progress",
    "idx_path_progress_mode_done_user",
    "CREATE INDEX idx_path_progress_mode_done_user ON path_progress (mode, is_completed, passed_test, user_id, completed_at)"
  );

  await db.execute("DROP TABLE IF EXISTS world_progress");

  await db.execute(`
    UPDATE path_progress
    SET passed_test = 1
    WHERE is_completed = 1
      AND passed_test = 0
  `);

  await seedProgressRowsForExistingUsers();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_password_reset_user_id (user_id),
      INDEX idx_password_reset_expires_at (expires_at)
    )
  `);

}

async function addColumnIfMissing(tableName, columnName, definition) {
  const [columns] = await db.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );

  if (columns.length === 0) {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function addIndexIfMissing(tableName, indexName, createStatement) {
  const [indexes] = await db.execute(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [tableName, indexName]
  );

  if (indexes.length === 0) {
    await db.execute(createStatement);
  }
}

async function seedProgressRowsForUser(userId, executor = db) {
  for (const mode of progressModes) {
    for (const worldNumber of progressWorlds) {
      for (const pathNumber of progressPaths) {
        await executor.execute(
          `INSERT IGNORE INTO path_progress (user_id, mode, world_number, path_number, is_completed, passed_test, completed_at)
           VALUES (?, ?, ?, ?, 0, 0, NULL)`,
          [userId, mode, worldNumber, pathNumber]
        );
      }
    }
  }
}

async function seedProgressRowsForExistingUsers() {
  const [users] = await db.execute("SELECT id FROM users");

  for (const user of users) {
    await seedProgressRowsForUser(user.id);
  }
}

function cleanEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidName(name) {
  return /^[\p{L}][\p{L} '-]{1,99}$/u.test(name);
}

function isValidEmail(email) {
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) && email.length <= 255;
}

function normalizeMode(mode) {
  return mode === "professionnel" ? "professionnel" : "decouverte";
}

function publicUser(user, pointSummary = emptyPointSummary()) {
  return {
    id: user.id,
    prenom: user.prenom,
    email: user.email || null,
    isGuest: Boolean(user.is_guest ?? user.isGuest),
    profileImage: user.profile_image || user.profileImage || null,
    currentMode: normalizeMode(user.current_mode || user.currentMode),
    points: pointSummary
  };
}

function getLeaderboardMode(query) {
  const mode = query.mode === "professionnel" ? "professionnel" : "decouverte";

  return mode;
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createResetUrl(token) {
  const baseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`;
  return `${baseUrl}/reset-password.html?token=${encodeURIComponent(token)}`;
}

function createMailTransport() {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  const auth = process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD || ""
      }
    : undefined;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth
  });
}

async function sendPasswordResetEmail(email, resetUrl) {
  const transporter = createMailTransport();

  if (!transporter) {
    console.log("Lien de reinitialisation pour le developpement :");
    console.log(resetUrl);
    return;
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || "Studiodontho <no-reply@studiodontho.local>",
    to: email,
    subject: "Reinitialisation de ton mot de passe Studiodontho",
    text: `Clique sur ce lien pour reinitialiser ton mot de passe : ${resetUrl}`
  });
}

async function createPasswordResetForUser(user) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);

  await db.execute(
    "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
    [user.id]
  );

  await db.execute(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))",
    [user.id, tokenHash]
  );

  await sendPasswordResetEmail(user.email, createResetUrl(token));
}

app.get("/api/test-db", async (req, res) => {
  if (isProduction) {
    return res.sendStatus(404);
  }

  try {
    const [results] = await db.execute("SELECT 1 + 1 AS resultat");
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

app.get("/api/leaderboard", requireLoggedUserApi, async (req, res) => {
  const mode = getLeaderboardMode(req.query);

  try {
    const [users] = await db.execute(`
      SELECT
        users.id,
        users.prenom,
        users.profile_image,
        COUNT(path_progress.id) * ${pointsPerCompletedPath} AS points
      FROM users
      LEFT JOIN path_progress
        ON path_progress.user_id = users.id
       AND path_progress.mode = ?
       AND path_progress.is_completed = 1
       AND path_progress.passed_test = 1
      WHERE is_guest = 0
      GROUP BY users.id, users.prenom, users.profile_image
      ORDER BY points DESC, users.prenom ASC
      LIMIT 20
    `, [mode]);
    let currentUserRank = null;

    if (req.session.user && !req.session.user.isGuest) {
      const [[currentUser]] = await db.execute(
        `SELECT
           users.id,
           users.prenom,
           COUNT(path_progress.id) * ${pointsPerCompletedPath} AS points
         FROM users
         LEFT JOIN path_progress
           ON path_progress.user_id = users.id
          AND path_progress.mode = ?
          AND path_progress.is_completed = 1
          AND path_progress.passed_test = 1
         WHERE users.id = ?
           AND users.is_guest = 0
         GROUP BY users.id, users.prenom
         LIMIT 1`,
        [mode, req.session.user.id]
      );

      if (currentUser) {
        const [[rankResult]] = await db.execute(
          `SELECT COUNT(*) + 1 AS user_rank
           FROM (
             SELECT
               users.id,
               users.prenom,
               COUNT(path_progress.id) * ${pointsPerCompletedPath} AS points
             FROM users
             LEFT JOIN path_progress
               ON path_progress.user_id = users.id
              AND path_progress.mode = ?
              AND path_progress.is_completed = 1
              AND path_progress.passed_test = 1
             WHERE users.is_guest = 0
             GROUP BY users.id, users.prenom
           ) ranked_users
           WHERE ranked_users.points > ?
              OR (ranked_users.points = ? AND ranked_users.prenom < ?)`,
          [mode, currentUser.points, currentUser.points, currentUser.prenom]
        );

        currentUserRank = {
          rank: Number(rankResult.user_rank),
          points: Number(currentUser.points) || 0
        };
      }
    }

    res.json({
      mode,
      currentUserRank,
      users: users.map((user) => ({
        id: user.id,
        prenom: user.prenom,
        profileImage: user.profile_image || null,
        points: Number(user.points) || 0
      }))
    });
  } catch (err) {
    console.error("Erreur leaderboard :", err.message);
    res.status(500).json({ message: "Erreur serveur pendant le chargement du classement." });
  }
});

app.get("/api/path-progress", requireLoggedUserApi, async (req, res) => {
  const mode = req.query.mode === "professionnel" ? "professionnel" : "decouverte";
  const worldNumber = Number(req.query.world);

  if (!Number.isInteger(worldNumber) || worldNumber < 1 || worldNumber > 3) {
    return res.status(400).json({ message: "Monde invalide." });
  }

  try {
    const [paths] = await db.execute(
      `SELECT path_number
       FROM path_progress
       WHERE user_id = ?
         AND mode = ?
         AND world_number = ?
         AND is_completed = 1
         AND passed_test = 1
       ORDER BY path_number ASC`,
      [req.session.user.id, mode, worldNumber]
    );
    const completedPaths = paths.map((pathRow) => Number(pathRow.path_number));

    const [worlds] = await db.execute(
      `SELECT world_number
       FROM path_progress
       WHERE user_id = ?
         AND mode = ?
         AND path_number BETWEEN 1 AND 5
         AND is_completed = 1
         AND passed_test = 1
       GROUP BY world_number
       HAVING COUNT(DISTINCT path_number) = 5
       ORDER BY world_number ASC`,
      [req.session.user.id, mode]
    );
    const points = getModePoints(await getUserPointSummary(req.session.user.id), mode);

    res.json({
      mode,
      world: worldNumber,
      completedPaths,
      completedWorlds: worlds.map((world) => Number(world.world_number)),
      points
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant le chargement de la progression." });
  }
});

app.post("/api/register", authLimiter, async (req, res) => {
  const prenom = String(req.body.prenom || "").trim();
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || "");
  const currentMode = normalizeMode(req.body.mode || req.body.currentMode);

  if (!isValidName(prenom)) {
    return res.status(400).json({
      message: "Le prenom peut contenir seulement des lettres, espaces, apostrophes et tirets."
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Adresse email invalide." });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caracteres." });
  }

  try {
    const [existingUsers] = await db.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Un compte existe deja avec cet email." });
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);
    const [result] = await db.execute(
      "INSERT INTO users (prenom, email, password_hash, is_guest, current_mode) VALUES (?, ?, ?, 0, ?)",
      [prenom, email, passwordHash, currentMode]
    );

    await seedProgressRowsForUser(result.insertId);
    req.session.user = publicUser(
      { id: result.insertId, prenom, email, is_guest: 0, profile_image: null, current_mode: currentMode },
      emptyPointSummary()
    );
    res.status(201).json({
      message: "Compte cree avec succes.",
      user: req.session.user
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant la creation du compte." });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!isValidEmail(email) || password.length === 0) {
    return res.status(400).json({ message: "Email ou mot de passe incorrect." });
  }

  try {
    const [users] = await db.execute(
      `SELECT id, prenom, email, password_hash, is_guest, profile_image, current_mode
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect." });
    }

    const user = users[0];

    if (!user.password_hash) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect." });
    }

    const pointSummary = await getUserPointSummary(user.id);

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        return res.status(500).json({ message: "Erreur serveur pendant la connexion." });
      }

      req.session.user = publicUser(user, pointSummary);
      res.json({
        message: "Connexion reussie.",
        user: req.session.user
      });
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant la connexion." });
  }
});

app.post("/api/guest", authLimiter, async (req, res) => {
  const prenom = String(req.body.prenom || "").trim();
  const currentMode = normalizeMode(req.body.mode || req.body.currentMode);

  if (!isValidName(prenom)) {
    return res.status(400).json({
      message: "Le prenom peut contenir seulement des lettres, espaces, apostrophes et tirets."
    });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO users (prenom, email, password_hash, is_guest, current_mode) VALUES (?, NULL, NULL, 1, ?)",
      [prenom, currentMode]
    );

    await seedProgressRowsForUser(result.insertId);
    req.session.user = publicUser(
      {
        id: result.insertId,
        prenom,
        email: null,
        is_guest: 1,
        profile_image: null,
        current_mode: currentMode
      },
      emptyPointSummary()
    );

    res.status(201).json({
      message: "Compte invite cree avec succes.",
      user: req.session.user
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant la connexion invite." });
  }
});

app.post("/api/forgot-password", authLimiter, async (req, res) => {
  const email = cleanEmail(req.body.email);
  const genericMessage = "Si un compte correspond a cette adresse, un lien de reinitialisation sera envoye.";

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Adresse email invalide." });
  }

  try {
    const [users] = await db.execute(
      "SELECT id, email FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length > 0) {
      await createPasswordResetForUser(users[0]);
    }

    res.json({ message: genericMessage });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant la demande de reinitialisation." });
  }
});

app.post("/api/profile-password-reset", requireLoggedUserApi, authLimiter, async (req, res) => {
  try {
    const [users] = await db.execute(
      "SELECT id, email, is_guest FROM users WHERE id = ? LIMIT 1",
      [req.session.user.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Connexion requise." });
    }

    const user = users[0];

    if (user.is_guest || !user.email) {
      return res.status(400).json({ message: "Un compte invite ne peut pas recevoir de lien de reinitialisation." });
    }

    await createPasswordResetForUser(user);
    res.json({ message: "Lien de reinitialisation envoye a ton adresse email." });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant la demande de reinitialisation." });
  }
});

app.post("/api/profile-name", requireLoggedUserApi, async (req, res) => {
  const prenom = String(req.body.prenom || "").trim();

  if (!isValidName(prenom)) {
    return res.status(400).json({
      message: "Le nom peut contenir seulement des lettres, espaces, apostrophes et tirets."
    });
  }

  try {
    const [result] = await db.execute(
      "UPDATE users SET prenom = ? WHERE id = ?",
      [prenom, req.session.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(401).json({ message: "Connexion requise." });
    }

    req.session.user = {
      ...req.session.user,
      prenom
    };

    res.json({
      message: "Nom modifie avec succes.",
      user: req.session.user
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant la modification du nom." });
  }
});

app.post("/api/profile-photo", requireLoggedUserApi, async (req, res) => {
  const profileImage = String(req.body.profileImage || "").trim();

  if (
    profileImage.length > 700000 ||
    !/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(profileImage)
  ) {
    return res.status(400).json({ message: "Photo de profil invalide ou trop lourde." });
  }

  try {
    const [result] = await db.execute(
      "UPDATE users SET profile_image = ? WHERE id = ?",
      [profileImage, req.session.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(401).json({ message: "Connexion requise." });
    }

    req.session.user = {
      ...req.session.user,
      profileImage
    };

    res.json({
      message: "Photo de profil ajoutee.",
      user: req.session.user
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant l'ajout de la photo." });
  }
});

app.post("/api/profile-mode", requireLoggedUserApi, async (req, res) => {
  const currentMode = normalizeMode(req.body.mode || req.body.currentMode);

  try {
    const [result] = await db.execute(
      "UPDATE users SET current_mode = ? WHERE id = ?",
      [currentMode, req.session.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(401).json({ message: "Connexion requise." });
    }

    req.session.user = {
      ...req.session.user,
      currentMode
    };

    res.json({
      message: "Mode sauvegarde.",
      user: req.session.user
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant le changement de mode." });
  }
});

app.post("/api/path-progress/complete", requireLoggedUserApi, async (req, res) => {
  const mode = req.body.mode === "professionnel" ? "professionnel" : "decouverte";
  const worldNumber = Number(req.body.world);
  const pathNumber = Number(req.body.pathNumber);
  const passedTest = req.body.testPassed === true || req.body.testPassed === "true";

  if (
    !Number.isInteger(worldNumber) ||
    worldNumber < 1 ||
    worldNumber > 3 ||
    !Number.isInteger(pathNumber) ||
    pathNumber < 1 ||
    pathNumber > 5
  ) {
    return res.status(400).json({ message: "Progression invalide." });
  }

  if (!passedTest) {
    return res.status(403).json({ message: "Terminer toutes les lecons." });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await seedProgressRowsForUser(req.session.user.id, connection);

    if (pathNumber > 1) {
      const [[previousPath]] = await connection.execute(
        `SELECT is_completed, passed_test
         FROM path_progress
         WHERE user_id = ?
           AND mode = ?
           AND world_number = ?
           AND path_number = ?
         LIMIT 1`,
        [req.session.user.id, mode, worldNumber, pathNumber - 1]
      );

      if (!previousPath || !previousPath.is_completed || !previousPath.passed_test) {
        await connection.rollback();
        return res.status(403).json({ message: "Termine le lvl precedent avant de valider celui-ci." });
      }
    }

    const [pathResult] = await connection.execute(
      `UPDATE path_progress
       SET is_completed = 1,
           passed_test = 1,
           completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
       WHERE user_id = ?
         AND mode = ?
         AND world_number = ?
         AND path_number = ?
         AND (is_completed = 0 OR passed_test = 0)`,
      [req.session.user.id, mode, worldNumber, pathNumber]
    );
    const newPathCount = pathResult.affectedRows > 0 ? 1 : 0;

    const [[afterResult]] = await connection.execute(
      `SELECT COUNT(*) AS completed_count
       FROM path_progress
       WHERE user_id = ?
         AND mode = ?
         AND world_number = ?
         AND path_number BETWEEN 1 AND 5
         AND is_completed = 1
         AND passed_test = 1`,
      [req.session.user.id, mode, worldNumber]
    );
    const completedAfter = Number(afterResult.completed_count) || 0;
    const worldCompleted = completedAfter >= 5;

    const pointsEarned = newPathCount * pointsPerCompletedPath;
    const pointsResult = getModePoints(await getUserPointSummary(req.session.user.id, connection), mode);

    await connection.commit();

    res.json({
      message: pointsEarned > 0 ? "Progression sauvegardee." : "Progression deja sauvegardee.",
      mode,
      world: worldNumber,
      pathNumber,
      completedCount: completedAfter,
      newPathCount,
      worldCompleted,
      pointsEarned,
      points: pointsResult
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: "Erreur serveur pendant la sauvegarde de la progression." });
  } finally {
    connection.release();
  }
});

app.post("/api/reset-password", authLimiter, async (req, res) => {
  const token = String(req.body.token || "").trim();
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({ message: "Lien de reinitialisation invalide." });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caracteres." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Les deux mots de passe ne correspondent pas." });
  }

  try {
    const tokenHash = hashResetToken(token);
    const [tokens] = await db.execute(
      `SELECT password_reset_tokens.id, password_reset_tokens.user_id
       FROM password_reset_tokens
       WHERE password_reset_tokens.token_hash = ?
         AND password_reset_tokens.used_at IS NULL
         AND password_reset_tokens.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ message: "Lien invalide ou expire." });
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);

    await db.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, tokens[0].user_id]
    );

    await db.execute(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?",
      [tokens[0].id]
    );

    res.json({ message: "Mot de passe reinitialise avec succes." });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant la reinitialisation." });
  }
});

app.get("/api/me", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ connected: false });
  }

  try {
    const [users] = await db.execute(
      `SELECT id, prenom, email, is_guest, profile_image, current_mode
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.session.user.id]
    );

    if (users.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ connected: false });
    }

    req.session.user = publicUser(users[0], await getUserPointSummary(users[0].id));
    res.json({
      connected: true,
      user: req.session.user
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant le chargement du profil." });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Erreur serveur pendant la deconnexion." });
    }

    res.clearCookie("studiodontho.sid");
    res.json({ message: "Deconnexion reussie." });
  });
});

app.listen(port, async () => {
  try {
    await db.execute("SELECT 1");
    await initializeDatabase();
    console.log("Connecte a la base MySQL studiodontho");
  } catch (err) {
    console.error("Erreur de connexion MySQL :", err.message);
  }

  console.log(`Serveur lance sur http://localhost:${port}`);
});
