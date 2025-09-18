# How to use project
1.install npm
```bash
  npm init -y 
```
2.install package
```bash
  npm i express mysql2 dotenv nodemon bcrypt ejs cookie-parser jsonwebtoken 
```
3.Import Database 

4.env file 

DATABASE = * 

DATABASE_HOST = * 

DATABASE_USER = * 

DATABASE_PASSWORD = * 

JWT_SECRET = * 

5.script in package.json "start": "nodemon app.js"
 
6.npm start

-- ใช้งาน DB
CREATE DATABASE IF NOT EXISTS novelweb;
USE novelweb;

-- Users
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,        
    username VARCHAR(50) NOT NULL UNIQUE,    
    email VARCHAR(100) NOT NULL UNIQUE,      
    password VARCHAR(255) NOT NULL,          
    birthday DATE,
    coins INT DEFAULT 0,                          
    is_premium BOOLEAN DEFAULT FALSE,   -- 👈 เพิ่ม flag premium
    premium_expire DATE DEFAULT NULL,   -- 👈 วันหมดอายุ premium (ถ้ามี)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Novels
CREATE TABLE novels ( 
    novel_id INT AUTO_INCREMENT PRIMARY KEY,           
    title VARCHAR(100) NOT NULL,                 
    user_id INT NOT NULL,                      
    author_name VARCHAR(100) NOT NULL,           
    category VARCHAR(50),                        
    cover_url VARCHAR(500),                       
    description TEXT,                           
    content LONGTEXT,                            
    is_adult BOOLEAN DEFAULT FALSE,              
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) 
);

-- Chapters (แก้ไขให้ครบ field ตามที่แจ้ง)
CREATE TABLE chapters (
    chapter_id INT AUTO_INCREMENT PRIMARY KEY,
    novel_id INT NOT NULL,
    chapter_number INT NOT NULL,
    chapter_name VARCHAR(255) NOT NULL,
    content LONGTEXT,
    is_adult BOOLEAN DEFAULT FALSE,
    cost INT DEFAULT 0, -- 0 = ฟรี, >0 = ใช้ coin, premium user อ่านฟรี
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(novel_id) ON DELETE CASCADE
);

-- User Progress
CREATE TABLE user_progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    novel_id INT,
    chapter_number INT,
    unlocked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id),   
    FOREIGN KEY (novel_id) REFERENCES novels(novel_id) 
);

-- Comments
CREATE TABLE comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    chapter_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Coin Payments
CREATE TABLE coin_payments (
    coin_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('earn','spend') NOT NULL,  
    method ENUM('bath_to_coin','coin_to_premium','coin_to_chapter') NOT NULL,
    amount_coin INT NOT NULL,  
    amount_bath DECIMAL(10,2) DEFAULT 0.00, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) 
);	
CREATE TABLE chapter_likes (
    like_id INT AUTO_INCREMENT PRIMARY KEY,
    chapter_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (chapter_id, user_id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
