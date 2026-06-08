CREATE DATABASE IF NOT EXISTS studiodontho
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE studiodontho;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255) NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  is_guest TINYINT(1) NOT NULL DEFAULT 0,
  decouverte_week_points INT NOT NULL DEFAULT 0,
  decouverte_alltime_points INT NOT NULL DEFAULT 0,
  professionnel_week_points INT NOT NULL DEFAULT 0,
  professionnel_alltime_points INT NOT NULL DEFAULT 0,
  profile_image MEDIUMTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
);

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
);

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
);

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
);
