# 📚 Novel Website Project

A **Novel Website** built with **Node.js, Express, MySQL, Bootstrap 5**, and **JWT Authentication**.  
This project is designed to support both **Readers** and **Writers** with a complete **coin system**, **premium subscription**, and **chatbot Q&A**.  

---

## 🚀 Features

- 👤 User authentication with **JWT + Cookie**  
- 📖 Writer can **publish novels and chapters**  
- 🪙 **Coin system** (earn & spend)  
- ⭐ **Premium subscription** with expiry date  
- 💬 **Comment system** on chapters  
- ❤️ **Like system** for chapters  
- 📊 **User progress tracking** (unlocked chapters)  
- 🤖 **Chatbot Q&A** (future update)  
- 🎨 **Bootstrap 5 frontend** with responsive design  

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express  
- **Frontend**: EJS + Bootstrap 5  
- **Database**: MySQL (Workbench)  
- **Authentication**: JWT + Cookies  
- **Utilities**: dotenv, bcrypt, nodemon  

---

## ⚙️ Installation & Usage

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/NovelApp.git
cd novel-website
```

### 2. Install npm
```bash
npm init -y
```

### 3. Install Dependencies
```bash
npm i express mysql2 dotenv nodemon bcrypt ejs cookie-parser jsonwebtoken
```

### 4. Configure `.env`
Create a `.env` file in the root directory:
```env
DATABASE = novelweb
DATABASE_HOST = localhost
DATABASE_USER = root
DATABASE_PASSWORD = your_password
JWT_SECRET = your_secret
```

### 5. Add script in `package.json`
```json
"scripts": {
  "start": "nodemon app.js"
}
```

### 6. Run the project
```bash
npm start
```

Server should now be running on:  
👉 `http://localhost:3000`

---

## 🗄️ Database Schema

### Create Database
```sql
CREATE DATABASE IF NOT EXISTS novelweb;
USE novelweb;
```

### Users
```sql
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,        
    username VARCHAR(50) NOT NULL UNIQUE,    
    email VARCHAR(100) NOT NULL UNIQUE,      
    password VARCHAR(255) NOT NULL,          
    birthday DATE,
    coins INT DEFAULT 0,                          
    is_premium BOOLEAN DEFAULT FALSE,   
    premium_expire DATE DEFAULT NULL,   
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Novels
```sql
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
```

### Chapters
```sql
CREATE TABLE chapters (
    chapter_id INT AUTO_INCREMENT PRIMARY KEY,
    novel_id INT NOT NULL,
    chapter_number INT NOT NULL,
    chapter_name VARCHAR(255) NOT NULL,
    content LONGTEXT,
    is_adult BOOLEAN DEFAULT FALSE,
    cost INT DEFAULT 0, -- 0 = free, >0 = coin, premium user = free
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(novel_id) ON DELETE CASCADE
);
```

### User Progress
```sql
CREATE TABLE user_progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    novel_id INT,
    chapter_number INT,
    unlocked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id),   
    FOREIGN KEY (novel_id) REFERENCES novels(novel_id) 
);
```

### Comments
```sql
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

```

### Coin Payments
```sql
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
```

### Chapter Likes
```sql
CREATE TABLE chapter_likes (
    like_id INT AUTO_INCREMENT PRIMARY KEY,
    chapter_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (chapter_id, user_id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

---

## 📌 Features Roadmap

- [x] User authentication (JWT + Cookies)  
- [x] Novel + Chapter CRUD  
- [x] Coin system & payments  
- [x] Premium subscription  
- [x] Chapter likes & comments  
- [x] Chatbot integration (Q&A)  
- [ ] Payment Gateway Integration
- [ ] Email OTP Verification 

---

## 👨‍💻 Dev
- ✍️ Spice 50% / Parit 50%
- 📧 xkhunbumrung@gmail.com / parit.ru@ku.th

📅 **Last Update:** 2025-09-19  
