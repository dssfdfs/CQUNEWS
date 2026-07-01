CREATE DATABASE IF NOT EXISTS cqunews DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cqunews;

CREATE TABLE IF NOT EXISTS user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(100) NOT NULL COMMENT '密码',
    mobile VARCHAR(20) COMMENT '手机号',
    email VARCHAR(100) COMMENT '邮箱',
    status TINYINT DEFAULT 1 COMMENT '状态 0禁用 1启用',
    is_del TINYINT DEFAULT 0 COMMENT '是否删除 0否 1是',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

CREATE TABLE IF NOT EXISTS history_task (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    original_content TEXT NOT NULL COMMENT '原始新闻内容',
    summary TEXT COMMENT '生成的摘要',
    titles TEXT COMMENT '生成的标题(JSON)',
    entities TEXT COMMENT '抽取的实体(JSON)',
    fact_check_result TEXT COMMENT '事实校验结果(JSON)',
    status TINYINT DEFAULT 1 COMMENT '状态 0处理中 1完成',
    is_del TINYINT DEFAULT 0 COMMENT '是否删除 0否 1是',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='历史任务表';

INSERT INTO user (username, password, mobile, status) VALUES ('admin', 'admin123', '13800138000', 1);
