-- 用户表新增account_status字段
ALTER TABLE user ADD COLUMN account_status TEXT DEFAULT 'active' NOT NULL;

-- 创建验证码表
CREATE TABLE IF NOT EXISTS email_verification_code (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- 创建新闻收藏表
CREATE TABLE IF NOT EXISTS user_favorite_news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    news_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, news_id),
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (news_id) REFERENCES news(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_email_verification_code_email ON email_verification_code(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_code_expires_at ON email_verification_code(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_favorite_news_user_id ON user_favorite_news(user_id);

-- 更新现有数据
UPDATE user SET account_status = status;
UPDATE news SET review_status = 'published' WHERE review_status = 'approved';

-- 添加评论审核状态字段
ALTER TABLE news ADD COLUMN audit_status INTEGER DEFAULT 0 NOT NULL;
UPDATE news SET audit_status = 1 WHERE review_status = 'published';
UPDATE news SET audit_status = 0 WHERE review_status = 'pending' OR review_status = 'rejected';