PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    content TEXT,
    category VARCHAR(100),
    source VARCHAR(100),
    original_url VARCHAR(1000) NOT NULL UNIQUE,
    published_at VARCHAR(32),
    views INTEGER DEFAULT 0,
    is_trending INTEGER DEFAULT 0,
    crawl_status INTEGER DEFAULT 0,
    quality_score INTEGER DEFAULT 0,
    review_status VARCHAR(16) DEFAULT 'pending',
    review_note VARCHAR(500),
    reviewed_by INTEGER,
    reviewed_at VARCHAR(32),
    created_at VARCHAR(32),
    updated_at VARCHAR(32),
    INDEX idx_news_category (category),
    INDEX idx_news_source (source),
    INDEX idx_news_original_url (original_url),
    INDEX idx_news_review_status (review_status)
);

CREATE TABLE IF NOT EXISTS crawlsource (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    enabled INTEGER DEFAULT 1,
    last_crawl_at VARCHAR(32),
    created_at VARCHAR(32)
);

CREATE TABLE IF NOT EXISTS crawllog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    source_name VARCHAR(100),
    status VARCHAR(32) NOT NULL,
    total INTEGER DEFAULT 0,
    success INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    error_msg TEXT,
    duration_ms INTEGER,
    created_at VARCHAR(32),
    INDEX idx_crawllog_source_id (source_id)
);

CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(128) NOT NULL UNIQUE,
    phone VARCHAR(32),
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(16) DEFAULT 'active',
    last_login_at VARCHAR(32),
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    INDEX idx_user_username (username),
    INDEX idx_user_email (email),
    INDEX idx_user_phone (phone)
);

CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    nickname VARCHAR(64),
    avatar_url VARCHAR(500),
    bio VARCHAR(500),
    gender VARCHAR(8),
    birthday VARCHAR(16),
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    INDEX idx_user_profile_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_profile_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nickname VARCHAR(64),
    avatar_url VARCHAR(500),
    bio VARCHAR(500),
    changed_field VARCHAR(32) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_user_profile_history_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    theme_mode VARCHAR(16) DEFAULT 'light',
    theme_color VARCHAR(16) DEFAULT '#1677ff',
    font_size VARCHAR(16) DEFAULT 'medium',
    language VARCHAR(16) DEFAULT 'zh-CN',
    timezone VARCHAR(64) DEFAULT 'Asia/Shanghai',
    date_format VARCHAR(16) DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(8) DEFAULT '24h',
    number_format VARCHAR(16) DEFAULT 'zh-CN',
    two_factor_enabled INTEGER DEFAULT 0,
    two_factor_secret VARCHAR(128),
    two_factor_backup_codes VARCHAR(500),
    notify_system INTEGER DEFAULT 1,
    notify_message INTEGER DEFAULT 1,
    notify_marketing INTEGER DEFAULT 0,
    notify_email INTEGER DEFAULT 1,
    notify_sms INTEGER DEFAULT 0,
    notify_in_app INTEGER DEFAULT 1,
    notify_frequency VARCHAR(16) DEFAULT 'realtime',
    storage_used_bytes INTEGER DEFAULT 0,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    INDEX idx_user_settings_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ip_address VARCHAR(64),
    device VARCHAR(128),
    location VARCHAR(128),
    user_agent VARCHAR(500),
    status VARCHAR(16) DEFAULT 'success',
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_login_history_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category VARCHAR(32) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    is_read INTEGER DEFAULT 0,
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_notification_user_id (user_id),
    INDEX idx_notification_category (category),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(64) NOT NULL,
    target VARCHAR(128),
    detail TEXT,
    ip_address VARCHAR(64),
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_audit_log_user_id (user_id),
    INDEX idx_audit_log_action (action),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS export_job (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    format VARCHAR(16) NOT NULL,
    status VARCHAR(16) DEFAULT 'pending',
    file_path VARCHAR(500),
    file_size INTEGER DEFAULT 0,
    expires_at VARCHAR(32),
    created_at VARCHAR(32) NOT NULL,
    completed_at VARCHAR(32),
    INDEX idx_export_job_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(128) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_superuser INTEGER DEFAULT 0,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    INDEX idx_admin_user_username (username),
    INDEX idx_admin_user_email (email)
);

CREATE TABLE IF NOT EXISTS user_behavior (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action_type VARCHAR(32) NOT NULL,
    target_id INTEGER,
    extra_data TEXT,
    timestamp VARCHAR(32) NOT NULL,
    INDEX idx_user_behavior_user_id (user_id),
    INDEX idx_user_behavior_action_type (action_type),
    INDEX idx_user_behavior_target_id (target_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(128) NOT NULL UNIQUE,
    value TEXT DEFAULT '',
    description VARCHAR(500),
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    INDEX idx_system_config_key (key)
);

CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    contact_info VARCHAR(255),
    status VARCHAR(16) DEFAULT 'pending',
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_feedback_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO admin_user (username, email, hashed_password, is_superuser, created_at, updated_at) VALUES (
    'admin',
    'admin@cqunews.com',
    '$2b$12$EixZaYbB.rK4fl8x2q7Meu6Q6D2V6f59qX5Q5eQ5E5L5K5J5H5G5F5E5D5C5B5A5958575655545352515049484746454443424140393837363534333231302928272625242322212019181716151413121110090807060504030201',
    1,
    '2024-01-01T00:00:00Z',
    '2024-01-01T00:00:00Z'
);

INSERT OR IGNORE INTO system_config (key, value, description, created_at, updated_at) VALUES (
    'default_api_key',
    '',
    '默认API密钥',
    '2024-01-01T00:00:00Z',
    '2024-01-01T00:00:00Z'
);