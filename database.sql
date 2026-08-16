CREATE DATABASE IF NOT EXISTS radius CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE radius;

CREATE TABLE users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 role ENUM('user','admin') NOT NULL DEFAULT 'user',
 phone VARCHAR(30) NULL,
 location VARCHAR(190) NULL,
 latitude DECIMAL(10,7) NULL,
 longitude DECIMAL(10,7) NULL,
 profile_image VARCHAR(255) NULL,
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_users_active(is_active)
) ENGINE=InnoDB;

CREATE TABLE listings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 title VARCHAR(180) NOT NULL,
 description TEXT NOT NULL,
 category VARCHAR(80) NOT NULL,
 brand VARCHAR(100) NULL,
 item_condition ENUM('new','excellent','good','fair','poor') NOT NULL,
 price DECIMAL(12,2) NOT NULL,
 location VARCHAR(190) NOT NULL,
 latitude DECIMAL(10,7) NULL,
 longitude DECIMAL(10,7) NULL,
 status ENUM('pending','approved','removed','flagged') NOT NULL DEFAULT 'pending',
 availability_status ENUM('available','reserved','sold','withdrawn') NOT NULL DEFAULT 'available',
 fraud_score DECIMAL(5,2) NULL,
 trust_status ENUM('safe','low_risk','suspicious','high_risk') NULL,
 fraud_checked TINYINT(1) NOT NULL DEFAULT 0,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_listing_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_listing_public(status,availability_status,created_at),
 INDEX idx_listing_user_state(user_id,status,availability_status),
 INDEX idx_listing_category(category),
 INDEX idx_listing_geo(latitude,longitude)
) ENGINE=InnoDB;

CREATE TABLE listing_images (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 listing_id BIGINT UNSIGNED NOT NULL,
 image_path VARCHAR(255) NOT NULL,
 image_hash VARCHAR(64) NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_image_listing FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE,
 INDEX idx_image_hash(image_hash)
) ENGINE=InnoDB;

CREATE TABLE reports (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 listing_id BIGINT UNSIGNED NOT NULL,
 reporter_id BIGINT UNSIGNED NOT NULL,
 reason ENUM('Scam','Fake product','Suspicious price','Reused image','Prohibited item','Misleading description','Other') NOT NULL,
 description TEXT NULL,
 status ENUM('open','reviewed','dismissed') NOT NULL DEFAULT 'open',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_at TIMESTAMP NULL,
 CONSTRAINT fk_report_listing FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE,
 CONSTRAINT fk_report_user FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
 UNIQUE KEY uq_report_once(listing_id,reporter_id)
) ENGINE=InnoDB;

CREATE TABLE conversations (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 listing_id BIGINT UNSIGNED NOT NULL,
 buyer_id BIGINT UNSIGNED NOT NULL,
 seller_id BIGINT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_conv_listing FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE,
 CONSTRAINT fk_conv_buyer FOREIGN KEY(buyer_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT fk_conv_seller FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE,
 UNIQUE KEY uq_conversation(listing_id,buyer_id,seller_id)
) ENGINE=InnoDB;

CREATE TABLE messages (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 conversation_id BIGINT UNSIGNED NOT NULL,
 sender_id BIGINT UNSIGNED NOT NULL,
 message TEXT NOT NULL,
 is_read TINYINT(1) NOT NULL DEFAULT 0,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_msg_conv FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
 CONSTRAINT fk_msg_sender FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_message_conv_id(conversation_id,id),
 INDEX idx_message_unread(conversation_id,is_read,sender_id)
) ENGINE=InnoDB;

CREATE TABLE trade_requests (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 listing_id BIGINT UNSIGNED NOT NULL,
 buyer_id BIGINT UNSIGNED NOT NULL,
 seller_id BIGINT UNSIGNED NOT NULL,
 status ENUM('requested','accepted','rejected','cancelled','completed') NOT NULL DEFAULT 'requested',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_trade_listing FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE,
 CONSTRAINT fk_trade_buyer FOREIGN KEY(buyer_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT fk_trade_seller FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_trade_listing_status(listing_id,status),
 INDEX idx_trade_users(buyer_id,seller_id,status)
) ENGINE=InnoDB;

CREATE TABLE reviews (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 trade_id BIGINT UNSIGNED NOT NULL,
 reviewer_id BIGINT UNSIGNED NOT NULL,
 reviewed_user_id BIGINT UNSIGNED NOT NULL,
 rating TINYINT UNSIGNED NOT NULL,
 comment TEXT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_review_trade FOREIGN KEY(trade_id) REFERENCES trade_requests(id) ON DELETE CASCADE,
 CONSTRAINT fk_review_author FOREIGN KEY(reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT fk_review_target FOREIGN KEY(reviewed_user_id) REFERENCES users(id) ON DELETE CASCADE,
 UNIQUE KEY uq_trade_reviewer(trade_id,reviewer_id),
 CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE fraud_predictions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 listing_id BIGINT UNSIGNED NOT NULL,
 fraud_score DECIMAL(5,2) NOT NULL,
 image_score DECIMAL(5,2) NOT NULL,
 price_score DECIMAL(5,2) NOT NULL,
 seller_score DECIMAL(5,2) NOT NULL,
 text_score DECIMAL(5,2) NOT NULL,
 policy_score DECIMAL(5,2) NOT NULL,
 model_name VARCHAR(120) NOT NULL,
 model_version VARCHAR(60) NOT NULL,
 explanation TEXT NOT NULL,
 feature_snapshot JSON NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_prediction_listing FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE,
 INDEX idx_prediction_listing_created(listing_id,created_at),
 INDEX idx_prediction_score(fraud_score,created_at)
) ENGINE=InnoDB;

CREATE TABLE price_data (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 category VARCHAR(80) NOT NULL,
 brand VARCHAR(100) NULL,
 item_condition VARCHAR(30) NOT NULL,
 price DECIMAL(12,2) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Demo users: password is RadiusDemo123!
INSERT INTO users(name,email,password_hash,role,location,latitude,longitude) VALUES
('RADIUS Admin','admin@radius.test','$2y$10$XHVYIYEHeM60NEuCpEu1uu8LwLNZGhL4cOBnbzXQp2Ow2dY.KFAwa','admin','Dhaka',23.8103000,90.4125000),
('Demo Seller','seller@radius.test','$2y$10$XHVYIYEHeM60NEuCpEu1uu8LwLNZGhL4cOBnbzXQp2Ow2dY.KFAwa','user','Badda, Dhaka',23.7806000,90.4267000);
