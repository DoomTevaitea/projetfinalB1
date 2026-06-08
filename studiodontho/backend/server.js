const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 12;
const dbTimezone = process.env.DB_TIMEZONE || "+02:00";

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

const localDevOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5501",
  "http://127.0.0.1:5501",
  "null"
]);

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
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 2
  }
}));

const protectedMobilePages = [
  "/profilmobil.html",
  "/classementmobil.html",
  "/coursmobil.html",
  "/entrainementmobil.html",
  "/cheminmobil.html",
  "/m1c1l1p1.html",
  "/m1c1l1p2.html",
  "/m1c1l1p3.html",
  "/m1c1l1p4.html",
  "/m1c1l1p5.html",
  "/m1c1l1p6.html"
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

const leaderboardColumns = {
  decouverte: {
    week: "decouverte_week_points",
    alltime: "decouverte_alltime_points"
  },
  professionnel: {
    week: "professionnel_week_points",
    alltime: "professionnel_alltime_points"
  }
};
const progressModes = ["decouverte", "professionnel"];
const progressWorlds = [1, 2, 3];
const progressPaths = [1, 2, 3, 4, 5];

async function initializeDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prenom VARCHAR(100) NOT NULL,
      email VARCHAR(255) NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      is_guest TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.execute("ALTER TABLE users MODIFY email VARCHAR(255) NULL");
  await db.execute("ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL");
  await addColumnIfMissing("users", "is_guest", "TINYINT(1) NOT NULL DEFAULT 0");
  await addColumnIfMissing("users", "decouverte_week_points", "INT NOT NULL DEFAULT 0");
  await addColumnIfMissing("users", "decouverte_alltime_points", "INT NOT NULL DEFAULT 0");
  await addColumnIfMissing("users", "professionnel_week_points", "INT NOT NULL DEFAULT 0");
  await addColumnIfMissing("users", "professionnel_alltime_points", "INT NOT NULL DEFAULT 0");
  await addColumnIfMissing("users", "profile_image", "MEDIUMTEXT NULL");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS path_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      mode VARCHAR(20) NOT NULL,
      world_number TINYINT UNSIGNED NOT NULL,
      path_number TINYINT UNSIGNED NOT NULL,
      is_completed TINYINT(1) NOT NULL DEFAULT 0,
      completed_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_path_progress (user_id, mode, world_number, path_number),
      INDEX idx_path_progress_user_mode_world (user_id, mode, world_number)
    )
  `);
  await addColumnIfMissing("path_progress", "is_completed", "TINYINT(1) NOT NULL DEFAULT 1");
  await db.execute("ALTER TABLE path_progress MODIFY completed_at TIMESTAMP NULL DEFAULT NULL");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS world_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      mode VARCHAR(20) NOT NULL,
      world_number TINYINT UNSIGNED NOT NULL,
      is_completed TINYINT(1) NOT NULL DEFAULT 0,
      points_awarded TINYINT(1) NOT NULL DEFAULT 0,
      completed_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_world_progress (user_id, mode, world_number)
    )
  `);
  await addColumnIfMissing("world_progress", "is_completed", "TINYINT(1) NOT NULL DEFAULT 1");
  await addColumnIfMissing("world_progress", "points_awarded", "TINYINT(1) NOT NULL DEFAULT 1");
  await db.execute("ALTER TABLE world_progress MODIFY completed_at TIMESTAMP NULL DEFAULT NULL");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      mode VARCHAR(20) NOT NULL,
      world_number TINYINT UNSIGNED NOT NULL,
      path_number TINYINT UNSIGNED NOT NULL,
      lesson_key VARCHAR(60) NOT NULL,
      is_completed TINYINT(1) NOT NULL DEFAULT 0,
      completed_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_lesson_progress (user_id, mode, world_number, path_number, lesson_key),
      INDEX idx_lesson_progress_user_path (user_id, mode, world_number, path_number)
    )
  `);

  await db.execute(`
    INSERT IGNORE INTO world_progress (user_id, mode, world_number, is_completed, points_awarded, completed_at)
    SELECT user_id, mode, world_number, 1, 0, MIN(completed_at)
    FROM path_progress
    WHERE path_number BETWEEN 1 AND 5
      AND is_completed = 1
    GROUP BY user_id, mode, world_number
    HAVING COUNT(DISTINCT path_number) = 5
  `);
  await db.execute(`
    UPDATE world_progress
    JOIN (
      SELECT user_id, mode, world_number, MIN(completed_at) AS first_completed_at
      FROM path_progress
      WHERE path_number BETWEEN 1 AND 5
        AND is_completed = 1
      GROUP BY user_id, mode, world_number
      HAVING COUNT(DISTINCT path_number) = 5
    ) completed_worlds
      ON completed_worlds.user_id = world_progress.user_id
     AND completed_worlds.mode = world_progress.mode
     AND completed_worlds.world_number = world_progress.world_number
    SET world_progress.is_completed = 1,
        world_progress.completed_at = COALESCE(world_progress.completed_at, completed_worlds.first_completed_at)
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

async function seedProgressRowsForUser(userId, executor = db) {
  for (const mode of progressModes) {
    for (const worldNumber of progressWorlds) {
      await executor.execute(
        `INSERT IGNORE INTO world_progress (user_id, mode, world_number, is_completed, points_awarded, completed_at)
         VALUES (?, ?, ?, 0, 0, NULL)`,
        [userId, mode, worldNumber]
      );

      for (const pathNumber of progressPaths) {
        await executor.execute(
          `INSERT IGNORE INTO path_progress (user_id, mode, world_number, path_number, is_completed, completed_at)
           VALUES (?, ?, ?, ?, 0, NULL)`,
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

function publicUser(user) {
  return {
    id: user.id,
    prenom: user.prenom,
    email: user.email || null,
    isGuest: Boolean(user.is_guest ?? user.isGuest),
    profileImage: user.profile_image || user.profileImage || null,
    points: {
      decouverte: {
        week: Number(user.decouverte_week_points) || 0,
        alltime: Number(user.decouverte_alltime_points) || 0
      },
      professionnel: {
        week: Number(user.professionnel_week_points) || 0,
        alltime: Number(user.professionnel_alltime_points) || 0
      }
    }
  };
}

function getLeaderboardConfig(query) {
  const mode = query.mode === "professionnel" ? "professionnel" : "decouverte";
  const period = query.period === "alltime" ? "alltime" : "week";

  return {
    mode,
    period,
    pointsColumn: leaderboardColumns[mode][period]
  };
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
  try {
    const [results] = await db.execute("SELECT 1 + 1 AS resultat");
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

app.get("/api/leaderboard", requireLoggedUserApi, async (req, res) => {
  const { mode, period, pointsColumn } = getLeaderboardConfig(req.query);

  try {
    const [users] = await db.execute(`
      SELECT id, prenom, profile_image, ${pointsColumn} AS points
      FROM users
      WHERE is_guest = 0
      ORDER BY ${pointsColumn} DESC, prenom ASC
      LIMIT 20
    `);
    let currentUserRank = null;

    if (req.session.user && !req.session.user.isGuest) {
      const [[currentUser]] = await db.execute(
        `SELECT id, prenom, ${pointsColumn} AS points FROM users WHERE id = ? AND is_guest = 0 LIMIT 1`,
        [req.session.user.id]
      );

      if (currentUser) {
        const [[rankResult]] = await db.execute(
          `SELECT COUNT(*) + 1 AS user_rank
           FROM users
           WHERE is_guest = 0
             AND (
               ${pointsColumn} > ?
               OR (${pointsColumn} = ? AND prenom < ?)
             )`,
          [currentUser.points, currentUser.points, currentUser.prenom]
        );

        currentUserRank = {
          rank: Number(rankResult.user_rank),
          points: Number(currentUser.points) || 0
        };
      }
    }

    res.json({
      mode,
      period,
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
  const columns = leaderboardColumns[mode];

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
       ORDER BY path_number ASC`,
      [req.session.user.id, mode, worldNumber]
    );
    const [worlds] = await db.execute(
      `SELECT world_number
       FROM world_progress
       WHERE user_id = ?
         AND mode = ?
         AND is_completed = 1
       ORDER BY world_number ASC`,
      [req.session.user.id, mode]
    );
    const [[points]] = await db.execute(
      `SELECT ${columns.week} AS week_points,
              ${columns.alltime} AS alltime_points
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.session.user.id]
    );

    res.json({
      mode,
      world: worldNumber,
      completedPaths: paths.map((path) => Number(path.path_number)),
      completedWorlds: worlds.map((world) => Number(world.world_number)),
      weekPoints: Number(points.week_points) || 0,
      alltimePoints: Number(points.alltime_points) || 0
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant le chargement de la progression." });
  }
});

app.get("/api/lesson-progress", requireLoggedUserApi, async (req, res) => {
  const mode = req.query.mode === "professionnel" ? "professionnel" : "decouverte";
  const worldNumber = Number(req.query.world);
  const pathNumber = Number(req.query.pathNumber);

  if (
    !Number.isInteger(worldNumber) ||
    worldNumber < 1 ||
    worldNumber > 3 ||
    !Number.isInteger(pathNumber) ||
    pathNumber < 1 ||
    pathNumber > 5
  ) {
    return res.status(400).json({ message: "Progression de lecon invalide." });
  }

  try {
    const [lessons] = await db.execute(
      `SELECT lesson_key
       FROM lesson_progress
       WHERE user_id = ?
         AND mode = ?
         AND world_number = ?
         AND path_number = ?
         AND is_completed = 1
       ORDER BY completed_at ASC`,
      [req.session.user.id, mode, worldNumber, pathNumber]
    );

    res.json({
      mode,
      world: worldNumber,
      pathNumber,
      completedLessons: lessons.map((lesson) => lesson.lesson_key)
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant le chargement des lecons." });
  }
});

app.post("/api/register", async (req, res) => {
  const prenom = String(req.body.prenom || "").trim();
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || "");

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
      "INSERT INTO users (prenom, email, password_hash, is_guest) VALUES (?, ?, ?, 0)",
      [prenom, email, passwordHash]
    );

    await seedProgressRowsForUser(result.insertId);
    req.session.user = publicUser({ id: result.insertId, prenom, email, is_guest: 0, profile_image: null });
    res.status(201).json({
      message: "Compte cree avec succes.",
      user: req.session.user
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant la creation du compte." });
  }
});

app.post("/api/login", async (req, res) => {
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!isValidEmail(email) || password.length === 0) {
    return res.status(400).json({ message: "Email ou mot de passe incorrect." });
  }

  try {
    const [users] = await db.execute(
      `SELECT id, prenom, email, password_hash, is_guest, profile_image,
              decouverte_week_points, decouverte_alltime_points,
              professionnel_week_points, professionnel_alltime_points
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

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        return res.status(500).json({ message: "Erreur serveur pendant la connexion." });
      }

      req.session.user = publicUser(user);
      res.json({
        message: "Connexion reussie.",
        user: req.session.user
      });
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant la connexion." });
  }
});

app.post("/api/guest", async (req, res) => {
  const prenom = String(req.body.prenom || "").trim();

  if (!isValidName(prenom)) {
    return res.status(400).json({
      message: "Le prenom peut contenir seulement des lettres, espaces, apostrophes et tirets."
    });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO users (prenom, email, password_hash, is_guest) VALUES (?, NULL, NULL, 1)",
      [prenom]
    );

    await seedProgressRowsForUser(result.insertId);
    req.session.user = publicUser({
      id: result.insertId,
      prenom,
      email: null,
      is_guest: 1,
      profile_image: null
    });

    res.status(201).json({
      message: "Compte invite cree avec succes.",
      user: req.session.user
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant la connexion invite." });
  }
});

app.post("/api/forgot-password", async (req, res) => {
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

app.post("/api/profile-password-reset", requireLoggedUserApi, async (req, res) => {
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

app.post("/api/lesson-progress/complete", requireLoggedUserApi, async (req, res) => {
  const mode = req.body.mode === "professionnel" ? "professionnel" : "decouverte";
  const worldNumber = Number(req.body.world);
  const pathNumber = Number(req.body.pathNumber);
  const lessonKey = String(req.body.lessonKey || "").trim();

  if (
    !Number.isInteger(worldNumber) ||
    worldNumber < 1 ||
    worldNumber > 3 ||
    !Number.isInteger(pathNumber) ||
    pathNumber < 1 ||
    pathNumber > 5 ||
    !/^[a-z0-9_-]{1,60}$/i.test(lessonKey)
  ) {
    return res.status(400).json({ message: "Progression de lecon invalide." });
  }

  try {
    await db.execute(
      `INSERT INTO lesson_progress
         (user_id, mode, world_number, path_number, lesson_key, is_completed, completed_at)
       VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         is_completed = 1,
         completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)`,
      [req.session.user.id, mode, worldNumber, pathNumber, lessonKey]
    );

    res.json({
      message: "Lecon sauvegardee.",
      mode,
      world: worldNumber,
      pathNumber,
      lessonKey
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur pendant la sauvegarde de la lecon." });
  }
});

app.post("/api/path-progress/complete", requireLoggedUserApi, async (req, res) => {
  const mode = req.body.mode === "professionnel" ? "professionnel" : "decouverte";
  const worldNumber = Number(req.body.world);
  const pathNumber = Number(req.body.pathNumber);
  const contextPaths = Array.isArray(req.body.completedPaths)
    ? [...new Set(req.body.completedPaths.map(Number))]
        .filter((completedPath) => Number.isInteger(completedPath) && completedPath >= 1 && completedPath <= 5)
        .sort((a, b) => a - b)
    : [];

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

  const connection = await db.getConnection();
  const columns = leaderboardColumns[mode];

  try {
    await connection.beginTransaction();
    await seedProgressRowsForUser(req.session.user.id, connection);

    for (const completedPath of contextPaths.filter((completedPath) => completedPath !== pathNumber)) {
      await connection.execute(
        `UPDATE path_progress
         SET is_completed = 1,
             completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
         WHERE user_id = ?
           AND mode = ?
           AND world_number = ?
           AND path_number = ?
           AND is_completed = 0`,
        [req.session.user.id, mode, worldNumber, completedPath]
      );
    }

    const [pathResult] = await connection.execute(
      `UPDATE path_progress
       SET is_completed = 1,
           completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
       WHERE user_id = ?
         AND mode = ?
         AND world_number = ?
         AND path_number = ?
         AND is_completed = 0`,
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
         AND is_completed = 1`,
      [req.session.user.id, mode, worldNumber]
    );
    const completedAfter = Number(afterResult.completed_count) || 0;
    let worldCompleted = false;

    if (completedAfter >= 5) {
      const [worldResult] = await connection.execute(
        `UPDATE world_progress
         SET is_completed = 1,
             points_awarded = 1,
             completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
         WHERE user_id = ?
           AND mode = ?
           AND world_number = ?
           AND points_awarded = 0`,
        [req.session.user.id, mode, worldNumber]
      );

      worldCompleted = worldResult.affectedRows > 0;
    }

    const pointsEarned = newPathCount * 10 + (worldCompleted ? 30 : 0);

    if (pointsEarned > 0) {
      await connection.execute(
        `UPDATE users
         SET ${columns.week} = ${columns.week} + ?,
             ${columns.alltime} = ${columns.alltime} + ?
         WHERE id = ?`,
        [pointsEarned, pointsEarned, req.session.user.id]
      );
    }

    const [[pointsResult]] = await connection.execute(
      `SELECT ${columns.week} AS week_points,
              ${columns.alltime} AS alltime_points
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.session.user.id]
    );

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
      weekPoints: Number(pointsResult.week_points) || 0,
      alltimePoints: Number(pointsResult.alltime_points) || 0
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: "Erreur serveur pendant la sauvegarde de la progression." });
  } finally {
    connection.release();
  }
});

app.post("/api/path-progress/sync-world", requireLoggedUserApi, async (req, res) => {
  const mode = req.body.mode === "professionnel" ? "professionnel" : "decouverte";
  const worldNumber = Number(req.body.world);
  const completedPaths = Array.isArray(req.body.completedPaths)
    ? [...new Set(req.body.completedPaths.map(Number))]
        .filter((pathNumber) => Number.isInteger(pathNumber) && pathNumber >= 1 && pathNumber <= 5)
        .sort((a, b) => a - b)
    : [];

  if (!Number.isInteger(worldNumber) || worldNumber < 1 || worldNumber > 3 || completedPaths.length < 5) {
    return res.status(400).json({ message: "Progression du monde invalide." });
  }

  const connection = await db.getConnection();
  const columns = leaderboardColumns[mode];

  try {
    await connection.beginTransaction();
    await seedProgressRowsForUser(req.session.user.id, connection);

    for (const pathNumber of completedPaths) {
      await connection.execute(
        `UPDATE path_progress
         SET is_completed = 1,
             completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
         WHERE user_id = ?
           AND mode = ?
           AND world_number = ?
           AND path_number = ?
           AND is_completed = 0`,
        [req.session.user.id, mode, worldNumber, pathNumber]
      );
    }

    const [[afterResult]] = await connection.execute(
      `SELECT COUNT(*) AS completed_count
       FROM path_progress
       WHERE user_id = ?
         AND mode = ?
         AND world_number = ?
         AND path_number BETWEEN 1 AND 5
         AND is_completed = 1`,
      [req.session.user.id, mode, worldNumber]
    );
    const completedCount = Number(afterResult.completed_count) || 0;
    let pointsEarned = 0;
    let worldCompleted = false;

    if (completedCount >= 5) {
      const [worldResult] = await connection.execute(
        `UPDATE world_progress
         SET is_completed = 1,
             points_awarded = 1,
             completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
         WHERE user_id = ?
           AND mode = ?
           AND world_number = ?
           AND points_awarded = 0`,
        [req.session.user.id, mode, worldNumber]
      );

      worldCompleted = worldResult.affectedRows > 0;
      pointsEarned = worldCompleted ? 30 : 0;
    }

    if (pointsEarned > 0) {
      await connection.execute(
        `UPDATE users
         SET ${columns.week} = ${columns.week} + ?,
             ${columns.alltime} = ${columns.alltime} + ?
         WHERE id = ?`,
        [pointsEarned, pointsEarned, req.session.user.id]
      );
    }

    const [[pointsResult]] = await connection.execute(
      `SELECT ${columns.week} AS week_points,
              ${columns.alltime} AS alltime_points
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.session.user.id]
    );

    await connection.commit();

    res.json({
      message: pointsEarned > 0 ? "Bonus monde sauvegarde." : "Monde deja synchronise.",
      mode,
      world: worldNumber,
      completedCount,
      worldCompleted,
      pointsEarned,
      weekPoints: Number(pointsResult.week_points) || 0,
      alltimePoints: Number(pointsResult.alltime_points) || 0
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: "Erreur serveur pendant la synchronisation du monde." });
  } finally {
    connection.release();
  }
});

app.post("/api/reset-password", async (req, res) => {
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
      `SELECT id, prenom, email, is_guest, profile_image,
              decouverte_week_points, decouverte_alltime_points,
              professionnel_week_points, professionnel_alltime_points
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.session.user.id]
    );

    if (users.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ connected: false });
    }

    req.session.user = publicUser(users[0]);
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
