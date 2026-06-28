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
  current_mode VARCHAR(20) NOT NULL DEFAULT 'decouverte',
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
  passed_test TINYINT(1) NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_path_progress (user_id, mode, world_number, path_number),
  INDEX idx_path_progress_user_mode_world (user_id, mode, world_number),
  INDEX idx_path_progress_mode_done_user (mode, is_completed, passed_test, user_id, completed_at)
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
