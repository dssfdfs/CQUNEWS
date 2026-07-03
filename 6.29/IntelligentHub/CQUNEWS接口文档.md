# CQUNEWS新闻聚合分析系统接口文档

**v1.0**

---

## 目录

- [一、接口规范说明](#一接口规范说明)
- [二、认证模块接口](#二认证模块接口)
- [三、新闻源管理模块接口](#三新闻源管理模块接口)
- [四、新闻文章管理模块接口](#四新闻文章管理模块接口)
- [五、内容分析模块接口](#五内容分析模块接口)
- [六、数据可视化模块接口](#六数据可视化模块接口)
- [七、用户管理模块接口](#七用户管理模块接口)
- [八、附录](#八附录)

---

## 一、接口规范说明

### 1、基础URL

| 环境 | URL地址 | 说明 |
|------|---------|------|
| 开发环境 | `http://127.0.0.1:8000` | 本地开发测试使用 |
| 测试环境 | `http://10.2.0.247:8081` | 预发布环境（预留） |
| 生产环境 | `https://api.cqunews.com` | 正式生产环境（预留） |

**注意事项**：
- 开发环境下所有接口均支持CORS跨域请求
- 生产环境需要配置Nginx反向代理和HTTPS证书
- 接口响应时间标准：普通接口<2秒，爬虫接口<30秒

---

### 2、接口版本

| 版本 | 路径 | 状态 | 说明 |
|------|------|------|------|
| v1 | `/api/v1` | 当前版本 | 初始版本 |
| v2 | `/api/v2` | 规划中 | 扩展版本 |

---

### 3、请求头（Request Headers）

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| Content-Type | String | 是 | 请求内容类型 | `application/json` |
| Authorization | String | 否 | Bearer Token认证令牌 | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| Accept | String | 否 | 期望的响应内容类型 | `application/json` |
| Accept-Language | String | 否 | 期望的语言 | `zh-CN,zh;q=0.9` |
| User-Agent | String | 否 | 客户端标识 | `CQUNEWS-API-Client/1.0` |
| X-Request-ID | String | 否 | 请求唯一标识（用于日志追踪） | `550e8400-e29b-41d4-a716-446655440000` |
| X-Api-Key | String | 否 | API密钥（部分接口需要） | `your-api-key-here` |

---

### 4、请求参数格式

#### 4.1 路径参数（Path Parameters）

参数放在URL路径中，用于唯一标识资源。

```
GET /sources/{source_id}
GET /articles/{article_id}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| source_id | Integer | 是 | 新闻源ID |
| article_id | Integer | 是 | 文章ID |

#### 4.2 查询参数（Query Parameters）

参数放在URL问号后面，用于分页、过滤等。

```
GET /sources/?skip=0&limit=100&source_type=website
```

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| skip | Integer | 否 | 跳过记录数 | 0 |
| limit | Integer | 否 | 返回记录数上限 | 100 |
| source_type | String | 否 | 新闻源类型筛选 | 全部 |

#### 4.3 请求体参数（Request Body）

POST/PUT/PATCH请求使用JSON格式请求体。

```json
{
  "username": "用户名",
  "password": "密码",
  "email": "邮箱地址"
}
```

---

### 5、响应格式（Response Format）

#### 5.1 通用响应结构

所有接口响应均遵循以下JSON格式：

**成功响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

**分页响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [ ... ],
    "total": 100,
    "skip": 0,
    "limit": 100
  }
}
```

**列表响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": [ ... ]
}
```

#### 5.2 错误响应结构

```json
{
  "code": 400,
  "message": "错误信息描述",
  "detail": "详细错误信息",
  "errors": [
    {
      "field": "username",
      "message": "用户名不能为空"
    }
  ]
}
```

#### 5.3 数据类型规范

| 类型 | 说明 | 示例 |
|------|------|------|
| String | 字符串 | `"username"` |
| Integer | 整数 | `123` |
| Boolean | 布尔值 | `true` / `false` |
| Array | 数组 | `[1, 2, 3]` |
| Object | 对象 | `{"key": "value"}` |
| DateTime | 日期时间（ISO 8601） | `"2024-06-26T10:00:00"` |
| Date | 日期 | `"2024-06-26"` |
| Null | 空值 | `null` |

---

### 6、状态码说明（HTTP Status Codes）

| 状态码 | 名称 | 说明 | 处理建议 |
|--------|------|------|----------|
| 200 | OK | 请求成功 | 正常处理响应数据 |
| 201 | Created | 资源创建成功 | 返回新创建的资源数据 |
| 204 | No Content | 请求成功但无返回内容 | 用于DELETE操作成功 |
| 400 | Bad Request | 请求参数错误 | 检查请求参数格式和内容 |
| 401 | Unauthorized | 未授权/认证失败 | 检查Token是否有效或重新登录 |
| 403 | Forbidden | 权限不足 | 当前用户无权限执行此操作 |
| 404 | Not Found | 资源不存在 | 检查请求的资源ID是否正确 |
| 409 | Conflict | 资源冲突 | 如用户名已存在、重复提交等 |
| 422 | Unprocessable Entity | 请求格式正确但语义错误 | 检查业务逻辑限制 |
| 429 | Too Many Requests | 请求过于频繁 | 降低请求频率 |
| 500 | Internal Server Error | 服务器内部错误 | 稍后重试或联系管理员 |
| 502 | Bad Gateway | 网关错误 | 服务暂时不可用 |
| 503 | Service Unavailable | 服务不可用 | 服务维护中，稍后重试 |

#### 6.1 业务状态码（Application Codes）

| 业务码 | 说明 | HTTP状态码 |
|--------|------|------------|
| 1000 | 登录成功 | 200 |
| 1001 | 注册成功 | 201 |
| 1002 | 密码重置邮件已发送 | 200 |
| 2001 | 新闻源创建成功 | 201 |
| 2002 | 新闻源更新成功 | 200 |
| 2003 | 新闻源删除成功 | 200 |
| 3001 | 文章采集成功 | 200 |
| 3002 | 文章分析完成 | 200 |
| 4001 | 图表数据生成成功 | 200 |
| 5001 | 用户信息更新成功 | 200 |

---

### 7、认证与授权

#### 7.1 认证流程

```
1. 用户登录 → POST /auth/login
2. 服务器验证 → 返回JWT Token
3. 后续请求 → 在Header携带Token
4. 服务器验证Token → 允许/拒绝访问
```

#### 7.2 Token格式

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

#### 7.3 Token payload结构

```json
{
  "sub": "user_id",
  "username": "用户名",
  "role": "user/admin",
  "exp": 1719450000,
  "iat": 1719446400
}
```

#### 7.4 权限说明

| 角色 | 权限说明 |
|------|----------|
| admin | 管理员：可管理所有资源、用户 |
| user | 普通用户：可管理自己的资源 |

---

### 8、分页规范

#### 8.1 分页参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| skip | Integer | 否 | 跳过记录数 | 0 |
| limit | Integer | 否 | 每页记录数 | 100 |

#### 8.2 分页响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],
    "total": 100,
    "skip": 0,
    "limit": 100,
    "has_more": true
  }
}
```

---

### 9、错误处理规范

#### 9.1 错误消息格式

```json
{
  "code": 400,
  "message": "请求参数错误",
  "detail": "username字段不能为空",
  "errors": [
    {
      "field": "username",
      "message": "此字段是必填项"
    }
  ]
}
```

#### 9.2 常见错误消息

| 错误场景 | code | message |
|----------|------|---------|
| 参数为空 | 400 | 参数不能为空 |
| 参数格式错误 | 400 | 参数格式不正确 |
| 缺少必填参数 | 400 | 缺少必填参数: {field} |
| Token过期 | 401 | Token已过期，请重新登录 |
| Token无效 | 401 | 无效的认证令牌 |
| 权限不足 | 403 | 权限不足，无法执行此操作 |
| 资源不存在 | 404 | 指定的资源不存在 |
| 用户名已存在 | 409 | 用户名已被注册 |
| 服务器错误 | 500 | 服务器内部错误 |

---

### 10、数据校验规则

| 字段类型 | 校验规则 |
|----------|----------|
| username | 3-20字符，字母数字下划线 |
| password | 至少6位字符 |
| email | 有效的邮箱格式 |
| url | 有效的URL格式（http/https） |
| phone | 有效的手机号格式 |

---

## 二、认证模块接口

### 1、用户登录

| 项目 | 说明 |
|------|------|
| 编号 | API001 |
| 页面 | 登录页面 |
| 功能描述 | 用户通过用户名密码登录系统，获取认证令牌 |
| 请求URL | POST /api/v1/auth/login |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 校验规则 |
|--------|------|------|------|----------|
| username | String | 是 | 用户名 | 3-20字符 |
| password | String | 是 | 密码 | 至少6位 |

**请求示例：**
```json
{
  "username": "admin",
  "password": "123456"
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| access_token | String | JWT访问令牌 |
| token_type | String | 令牌类型（bearer） |
| expires_in | Integer | 令牌有效期（秒） |
| user_id | Integer | 用户ID |
| username | String | 用户名 |
| role | String | 用户角色 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user_id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**失败响应示例（401 - 用户不存在）：**
```json
{
  "code": 401,
  "message": "用户不存在，请先注册",
  "detail": "用户名未找到，请检查输入或先进行注册"
}
```

**失败响应示例（401 - 密码错误）：**
```json
{
  "code": 401,
  "message": "密码错误",
  "detail": "您输入的密码不正确，请重新输入"
}
```

**失败响应示例（400 - 参数缺失）：**
```json
{
  "code": 400,
  "message": "请求参数错误",
  "detail": "缺少必填参数: username",
  "errors": [
    {
      "field": "username",
      "message": "此字段是必填项"
    }
  ]
}
```

---

### 2、用户注册

| 项目 | 说明 |
|------|------|
| 编号 | API002 |
| 页面 | 注册页面 |
| 功能描述 | 新用户注册账号 |
| 请求URL | POST /api/v1/auth/register |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 校验规则 |
|--------|------|------|------|----------|
| username | String | 是 | 用户名 | 3-20字符，字母数字下划线 |
| password | String | 是 | 密码 | 至少6位字符 |
| email | String | 是 | 邮箱 | 有效邮箱格式 |

**请求示例：**
```json
{
  "username": "newuser",
  "password": "123456",
  "email": "newuser@example.com"
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 用户ID |
| username | String | 用户名 |
| email | String | 邮箱 |
| role | String | 用户角色（默认user） |
| created_at | DateTime | 创建时间 |

**成功响应示例（201）：**
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "id": 2,
    "username": "newuser",
    "email": "newuser@example.com",
    "role": "user",
    "created_at": "2024-06-26T10:00:00"
  }
}
```

**失败响应示例（409 - 用户名已存在）：**
```json
{
  "code": 409,
  "message": "用户名已存在",
  "detail": "该用户名已被注册，请选择其他用户名"
}
```

**失败响应示例（400 - 邮箱格式错误）：**
```json
{
  "code": 400,
  "message": "请求参数错误",
  "detail": "邮箱格式不正确",
  "errors": [
    {
      "field": "email",
      "message": "请输入有效的邮箱地址"
    }
  ]
}
```

---

### 3、忘记密码

| 项目 | 说明 |
|------|------|
| 编号 | API003 |
| 页面 | 登录页面 |
| 功能描述 | 用户申请密码重置，系统发送重置链接到邮箱 |
| 请求URL | POST /api/v1/auth/forgot-password |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 校验规则 |
|--------|------|------|------|----------|
| username | String | 是 | 用户名 | 3-20字符 |

**请求示例：**
```json
{
  "username": "admin"
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| message | String | 操作结果消息 |
| email | String | 邮件发送到的邮箱（模拟显示） |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "密码重置链接已发送",
  "data": {
    "message": "密码重置链接已发送至您的邮箱（模拟）",
    "email": "admin@example.com"
  }
}
```

**失败响应示例（404 - 用户不存在）：**
```json
{
  "code": 404,
  "message": "用户不存在",
  "detail": "未找到该用户名对应的账户"
}
```

---

### 4、密码重置

| 项目 | 说明 |
|------|------|
| 编号 | API004 |
| 页面 | 密码重置页面 |
| 功能描述 | 用户通过邮箱链接重置密码 |
| 请求URL | POST /api/v1/auth/reset-password |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 校验规则 |
|--------|------|------|------|----------|
| token | String | 是 | 重置令牌 | 有效Token |
| new_password | String | 是 | 新密码 | 至少6位字符 |

**请求示例：**
```json
{
  "token": "abcdef123456...",
  "new_password": "newpassword123"
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| message | String | 操作结果消息 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "密码重置成功",
  "data": {
    "message": "您的密码已成功重置"
  }
}
```

**失败响应示例（400 - Token无效）：**
```json
{
  "code": 400,
  "message": "Token无效或已过期",
  "detail": "密码重置链接已失效，请重新申请"
}
```

---

### 5、获取当前用户信息

| 项目 | 说明 |
|------|------|
| 编号 | API005 |
| 页面 | 个人中心 |
| 功能描述 | 获取当前登录用户的详细信息 |
| 请求URL | GET /api/v1/auth/me |
| 完成情况 | 已完成 |

#### 请求头

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer Token |

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 用户ID |
| username | String | 用户名 |
| email | String | 邮箱 |
| role | String | 用户角色 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "created_at": "2024-06-26T09:00:00",
    "updated_at": "2024-06-26T09:00:00"
  }
}
```

**失败响应示例（401 - Token缺失）：**
```json
{
  "code": 401,
  "message": "未授权",
  "detail": "缺少认证令牌，请先登录"
}
```

**失败响应示例（401 - Token无效）：**
```json
{
  "code": 401,
  "message": "Token无效",
  "detail": "无效的认证令牌"
}
```

---

## 三、新闻源管理模块接口

### 1、创建新闻源

| 项目 | 说明 |
|------|------|
| 编号 | API101 |
| 页面 | 新闻源管理 |
| 功能描述 | 创建新的新闻订阅源 |
| 请求URL | POST /api/v1/sources/ |
| 完成情况 | 已完成 |

#### 请求头

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer Token |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 校验规则 |
|--------|------|------|------|----------|
| name | String | 是 | 新闻源名称 | 1-100字符 |
| url | String | 是 | 新闻源URL | 有效URL格式 |
| source_type | String | 是 | 新闻源类型 | website/rss |
| description | String | 否 | 新闻源描述 | 最多500字符 |
| category | String | 否 | 新闻分类 | 有效分类名称 |

**请求示例：**
```json
{
  "name": "新浪新闻",
  "url": "https://news.sina.com.cn",
  "source_type": "website",
  "description": "新浪网新闻中心",
  "category": "国内新闻"
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 新闻源ID |
| name | String | 新闻源名称 |
| url | String | 新闻源URL |
| source_type | String | 新闻源类型 |
| description | String | 新闻源描述 |
| category | String | 新闻分类 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

**成功响应示例（201）：**
```json
{
  "code": 201,
  "message": "新闻源创建成功",
  "data": {
    "id": 1,
    "name": "新浪新闻",
    "url": "https://news.sina.com.cn",
    "source_type": "website",
    "description": "新浪网新闻中心",
    "category": "国内新闻",
    "created_at": "2024-06-26T11:00:00",
    "updated_at": "2024-06-26T11:00:00"
  }
}
```

**失败响应示例（400 - URL格式错误）：**
```json
{
  "code": 400,
  "message": "请求参数错误",
  "detail": "URL格式不正确",
  "errors": [
    {
      "field": "url",
      "message": "请输入有效的URL地址"
    }
  ]
}
```

---

### 2、获取所有新闻源

| 项目 | 说明 |
|------|------|
| 编号 | API102 |
| 页面 | 新闻源列表 |
| 功能描述 | 获取系统中所有新闻源列表 |
| 请求URL | GET /api/v1/sources/ |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| skip | Integer | 否 | 跳过记录数 | 0 |
| limit | Integer | 否 | 返回记录数上限 | 100 |
| source_type | String | 否 | 按类型筛选 | 全部 |
| category | String | 否 | 按分类筛选 | 全部 |

**请求示例：**
```
GET /api/v1/sources/?skip=0&limit=100&source_type=website
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| items | Array | 新闻源列表 |
| total | Integer | 总记录数 |
| skip | Integer | 跳过记录数 |
| limit | Integer | 返回记录数 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "新浪新闻",
        "url": "https://news.sina.com.cn",
        "source_type": "website",
        "description": "新浪网新闻中心",
        "category": "国内新闻",
        "created_at": "2024-06-26T11:00:00",
        "updated_at": "2024-06-26T11:00:00"
      },
      {
        "id": 2,
        "name": "RSS订阅源",
        "url": "https://example.com/rss",
        "source_type": "rss",
        "description": "RSS订阅源",
        "category": "科技",
        "created_at": "2024-06-26T11:00:00",
        "updated_at": "2024-06-26T11:00:00"
      }
    ],
    "total": 2,
    "skip": 0,
    "limit": 100
  }
}
```

---

### 3、获取单个新闻源

| 项目 | 说明 |
|------|------|
| 编号 | API103 |
| 页面 | 新闻源详情 |
| 功能描述 | 根据ID获取新闻源详细信息 |
| 请求URL | GET /api/v1/sources/{source_id} |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| source_id | Integer | 是 | 新闻源ID（路径参数） |

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 新闻源ID |
| name | String | 新闻源名称 |
| url | String | 新闻源URL |
| source_type | String | 新闻源类型 |
| description | String | 新闻源描述 |
| category | String | 新闻分类 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "name": "新浪新闻",
    "url": "https://news.sina.com.cn",
    "source_type": "website",
    "description": "新浪网新闻中心",
    "category": "国内新闻",
    "created_at": "2024-06-26T11:00:00",
    "updated_at": "2024-06-26T11:00:00"
  }
}
```

**失败响应示例（404）：**
```json
{
  "code": 404,
  "message": "资源不存在",
  "detail": "未找到ID为1的新闻源"
}
```

---

### 4、更新新闻源

| 项目 | 说明 |
|------|------|
| 编号 | API104 |
| 页面 | 新闻源管理 |
| 功能描述 | 更新新闻源信息 |
| 请求URL | PUT /api/v1/sources/{source_id} |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| source_id | Integer | 是 | 新闻源ID（路径参数） |

```json
{
  "name": "更新后的名称",
  "url": "https://example.com",
  "source_type": "rss",
  "description": "更新后的描述",
  "category": "科技"
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 新闻源ID |
| name | String | 新闻源名称 |
| url | String | 新闻源URL |
| source_type | String | 新闻源类型 |
| description | String | 新闻源描述 |
| category | String | 新闻分类 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "新闻源更新成功",
  "data": {
    "id": 1,
    "name": "更新后的名称",
    "url": "https://example.com",
    "source_type": "rss",
    "description": "更新后的描述",
    "category": "科技",
    "created_at": "2024-06-26T11:00:00",
    "updated_at": "2024-06-26T12:00:00"
  }
}
```

**失败响应示例（404）：**
```json
{
  "code": 404,
  "message": "资源不存在",
  "detail": "未找到ID为1的新闻源"
}
```

---

### 5、删除新闻源

| 项目 | 说明 |
|------|------|
| 编号 | API105 |
| 页面 | 新闻源管理 |
| 功能描述 | 删除指定的新闻源 |
| 请求URL | DELETE /api/v1/sources/{source_id} |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| source_id | Integer | 是 | 新闻源ID（路径参数） |

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| message | String | 操作结果消息 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "新闻源删除成功",
  "data": {
    "message": "新闻源已成功删除"
  }
}
```

**失败响应示例（404）：**
```json
{
  "code": 404,
  "message": "资源不存在",
  "detail": "未找到ID为1的新闻源"
}
```

---

### 6、采集新闻源内容

| 项目 | 说明 |
|------|------|
| 编号 | API106 |
| 页面 | 新闻源管理 |
| 功能描述 | 手动触发新闻源内容采集 |
| 请求URL | POST /api/v1/sources/{source_id}/collect |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| source_id | Integer | 是 | 新闻源ID（路径参数） |

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| message | String | 操作结果消息 |
| collected_count | Integer | 采集到的文章数量 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "采集完成",
  "data": {
    "message": "新闻采集成功",
    "collected_count": 15
  }
}
```

**失败响应示例（500）：**
```json
{
  "code": 500,
  "message": "采集失败",
  "detail": "采集过程中发生错误，请检查网络连接或新闻源URL是否有效"
}
```

---

## 四、新闻文章管理模块接口

### 1、获取文章列表

| 项目 | 说明 |
|------|------|
| 编号 | API201 |
| 页面 | 文章列表 |
| 功能描述 | 获取系统中的文章列表 |
| 请求URL | GET /api/v1/articles/ |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| skip | Integer | 否 | 跳过记录数 | 0 |
| limit | Integer | 否 | 返回记录数上限 | 100 |
| source_id | Integer | 否 | 按新闻源筛选 | 全部 |
| category | String | 否 | 按分类筛选 | 全部 |
| keyword | String | 否 | 关键词搜索 | 全部 |

**请求示例：**
```
GET /api/v1/articles/?skip=0&limit=20&category=科技
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| items | Array | 文章列表 |
| total | Integer | 总记录数 |
| skip | Integer | 跳过记录数 |
| limit | Integer | 返回记录数 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "文章标题",
        "summary": "文章摘要...",
        "content": "文章正文...",
        "url": "https://example.com/article/1",
        "source_id": 1,
        "source_name": "新浪新闻",
        "author": "作者名",
        "published_at": "2024-06-26T10:00:00",
        "created_at": "2024-06-26T11:00:00"
      }
    ],
    "total": 50,
    "skip": 0,
    "limit": 20
  }
}
```

---

### 2、获取单个文章

| 项目 | 说明 |
|------|------|
| 编号 | API202 |
| 页面 | 文章详情 |
| 功能描述 | 根据ID获取文章详细内容 |
| 请求URL | GET /api/v1/articles/{article_id} |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| article_id | Integer | 是 | 文章ID（路径参数） |

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 文章ID |
| title | String | 文章标题 |
| summary | String | 文章摘要 |
| content | String | 文章正文 |
| url | String | 原文链接 |
| source_id | Integer | 新闻源ID |
| source_name | String | 新闻源名称 |
| author | String | 作者 |
| published_at | DateTime | 发布时间 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "title": "AI技术最新发展趋势",
    "summary": "人工智能技术在2024年迎来新的突破...",
    "content": "随着技术的不断进步，人工智能领域正在经历...",
    "url": "https://tech.example.com/ai-trends-2024",
    "source_id": 1,
    "source_name": "科技资讯",
    "author": "张三",
    "published_at": "2024-06-26T10:00:00",
    "created_at": "2024-06-26T11:00:00",
    "updated_at": "2024-06-26T11:00:00"
  }
}
```

**失败响应示例（404）：**
```json
{
  "code": 404,
  "message": "资源不存在",
  "detail": "未找到ID为1的文章"
}
```

---

### 3、删除文章

| 项目 | 说明 |
|------|------|
| 编号 | API203 |
| 页面 | 文章管理 |
| 功能描述 | 删除指定的文章 |
| 请求URL | DELETE /api/v1/articles/{article_id} |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| article_id | Integer | 是 | 文章ID（路径参数） |

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| message | String | 操作结果消息 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "文章删除成功",
  "data": {
    "message": "文章已成功删除"
  }
}
```

---

## 五、内容分析模块接口

### 1、文本情感分析

| 项目 | 说明 |
|------|------|
| 编号 | API301 |
| 页面 | 文章详情 |
| 功能描述 | 对文章内容进行情感分析 |
| 请求URL | POST /api/v1/analysis/sentiment |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| text | String | 是 | 待分析文本（最大5000字符） |

**请求示例：**
```json
{
  "text": "这家公司的产品非常好用，服务也很棒！"
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| sentiment | String | 情感类别（positive/negative/neutral） |
| score | Float | 情感得分（-1到1） |
| confidence | Float | 置信度（0到1） |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "分析完成",
  "data": {
    "sentiment": "positive",
    "score": 0.85,
    "confidence": 0.92,
    "keywords": ["好", "棒", "服务"]
  }
}
```

---

### 2、关键词提取

| 项目 | 说明 |
|------|------|
| 编号 | API302 |
| 页面 | 文章详情 |
| 功能描述 | 从文章中提取关键词 |
| 请求URL | POST /api/v1/analysis/keywords |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| text | String | 是 | 待分析文本（最大10000字符） |
| top_n | Integer | 否 | 返回关键词数量 | 5 |

**请求示例：**
```json
{
  "text": "人工智能技术在各行各业得到广泛应用...",
  "top_n": 10
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| keywords | Array | 关键词列表 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "分析完成",
  "data": {
    "keywords": [
      {"word": "人工智能", "score": 0.95},
      {"word": "技术", "score": 0.85},
      {"word": "应用", "score": 0.75}
    ]
  }
}
```

---

### 3、文章摘要生成

| 项目 | 说明 |
|------|------|
| 编号 | API303 |
| 页面 | 文章详情 |
| 功能描述 | 生成文章摘要 |
| 请求URL | POST /api/v1/analysis/summary |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| article_id | Integer | 否 | 文章ID |
| text | String | 否 | 文章内容（article_id和text二选一） |
| max_length | Integer | 否 | 摘要最大长度 | 200 |

**请求示例：**
```json
{
  "article_id": 1,
  "max_length": 150
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| summary | String | 生成的摘要 |
| original_length | Integer | 原文长度 |
| summary_length | Integer | 摘要长度 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "摘要生成成功",
  "data": {
    "summary": "本文介绍了人工智能技术的发展趋势和应用前景...",
    "original_length": 2000,
    "summary_length": 120
  }
}
```

---

## 六、数据可视化模块接口

### 1、获取统计概览

| 项目 | 说明 |
|------|------|
| 编号 | API401 |
| 页面 | 数据看板 |
| 功能描述 | 获取系统整体统计数据 |
| 请求URL | GET /api/v1/charts/overview |
| 完成情况 | 已完成 |

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| total_sources | Integer | 新闻源总数 |
| total_articles | Integer | 文章总数 |
| today_articles | Integer | 今日新增文章 |
| sources_by_type | Object | 各类型新闻源数量 |
| articles_by_category | Object | 各分类文章数量 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_sources": 10,
    "total_articles": 500,
    "today_articles": 25,
    "sources_by_type": {
      "website": 6,
      "rss": 4
    },
    "articles_by_category": {
      "科技": 150,
      "体育": 100,
      "娱乐": 120,
      "国内": 130
    }
  }
}
```

---

### 2、获取趋势数据

| 项目 | 说明 |
|------|------|
| 编号 | API402 |
| 页面 | 数据看板 |
| 功能描述 | 获取文章发布时间趋势 |
| 请求URL | GET /api/v1/charts/trends |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| days | Integer | 否 | 查询天数 | 7 |

**请求示例：**
```
GET /api/v1/charts/trends?days=30
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| date | String | 日期 |
| count | Integer | 文章数量 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {"date": "2024-06-20", "count": 30},
    {"date": "2024-06-21", "count": 45},
    {"date": "2024-06-22", "count": 28},
    {"date": "2024-06-23", "count": 52},
    {"date": "2024-06-24", "count": 41},
    {"date": "2024-06-25", "count": 38},
    {"date": "2024-06-26", "count": 25}
  ]
}
```

---

## 七、用户管理模块接口

### 1、获取用户列表

| 项目 | 说明 |
|------|------|
| 编号 | API501 |
| 页面 | 管理员页面 |
| 功能描述 | 获取所有用户列表（仅管理员） |
| 请求URL | GET /api/v1/users/ |
| 完成情况 | 已完成 |

#### 请求头

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer Token（需admin权限） |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| skip | Integer | 否 | 跳过记录数 | 0 |
| limit | Integer | 否 | 返回记录数上限 | 100 |
| role | String | 否 | 按角色筛选 | 全部 |

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| items | Array | 用户列表 |
| total | Integer | 总记录数 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "role": "admin",
        "created_at": "2024-06-26T09:00:00",
        "updated_at": "2024-06-26T09:00:00"
      },
      {
        "id": 2,
        "username": "user1",
        "email": "user1@example.com",
        "role": "user",
        "created_at": "2024-06-26T10:00:00",
        "updated_at": "2024-06-26T10:00:00"
      }
    ],
    "total": 2
  }
}
```

**失败响应示例（403 - 权限不足）：**
```json
{
  "code": 403,
  "message": "权限不足",
  "detail": "只有管理员才能执行此操作"
}
```

---

### 2、获取单个用户

| 项目 | 说明 |
|------|------|
| 编号 | API502 |
| 页面 | 个人中心 |
| 功能描述 | 根据ID获取用户详细信息 |
| 请求URL | GET /api/v1/users/{user_id} |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | Integer | 是 | 用户ID（路径参数） |

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 用户ID |
| username | String | 用户名 |
| email | String | 邮箱 |
| role | String | 用户角色 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 2,
    "username": "user1",
    "email": "user1@example.com",
    "role": "user",
    "created_at": "2024-06-26T10:00:00",
    "updated_at": "2024-06-26T10:00:00"
  }
}
```

---

### 3、更新用户信息

| 项目 | 说明 |
|------|------|
| 编号 | API503 |
| 页面 | 个人中心 |
| 功能描述 | 更新用户信息 |
| 请求URL | PUT /api/v1/users/{user_id} |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | Integer | 是 | 用户ID（路径参数） |

```json
{
  "email": "newemail@example.com"
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 用户ID |
| username | String | 用户名 |
| email | String | 邮箱 |
| role | String | 用户角色 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "用户信息更新成功",
  "data": {
    "id": 2,
    "username": "user1",
    "email": "newemail@example.com",
    "role": "user",
    "created_at": "2024-06-26T10:00:00",
    "updated_at": "2024-06-26T12:00:00"
  }
}
```

---

### 4、删除用户

| 项目 | 说明 |
|------|------|
| 编号 | API504 |
| 页面 | 管理员页面 |
| 功能描述 | 删除指定用户（仅管理员） |
| 请求URL | DELETE /api/v1/users/{user_id} |
| 完成情况 | 已完成 |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | Integer | 是 | 用户ID（路径参数） |

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| message | String | 操作结果消息 |

**成功响应示例（200）：**
```json
{
  "code": 200,
  "message": "用户删除成功",
  "data": {
    "message": "用户已成功删除"
  }
}
```

---

## 八、附录

### 1、数据类型详细说明

#### 1.1 日期时间格式（ISO 8601）

所有日期时间均使用ISO 8601标准格式：

```
YYYY-MM-DDTHH:mm:ss
2024-06-26T10:00:00
```

带时区：
```
2024-06-26T10:00:00+08:00
```

#### 1.2 枚举值说明

**新闻源类型（source_type）：**
| 值 | 说明 |
|----|------|
| website | 网站 |
| rss | RSS订阅 |
| api | API接口 |

**用户角色（role）：**
| 值 | 说明 |
|----|------|
| admin | 管理员 |
| user | 普通用户 |

**情感分析结果（sentiment）：**
| 值 | 说明 |
|----|------|
| positive | 正面 |
| negative | 负面 |
| neutral | 中性 |

---

### 2、接口调用示例

#### 2.1 cURL示例

**用户登录：**
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "123456"}'
```

**获取新闻源列表：**
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/sources/" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 2.2 Python示例

```python
import requests

# 登录
response = requests.post(
    "http://127.0.0.1:8000/api/v1/auth/login",
    json={"username": "admin", "password": "123456"}
)
token = response.json()["data"]["access_token"]

# 获取新闻源列表
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(
    "http://127.0.0.1:8000/api/v1/sources/",
    headers=headers
)
print(response.json())
```

#### 2.3 JavaScript示例

```javascript
// 登录
fetch('http://127.0.0.1:8000/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'admin',
    password: '123456'
  })
})
.then(res => res.json())
.then(data => {
  const token = data.data.access_token;
  // 获取新闻源列表
  return fetch('http://127.0.0.1:8000/api/v1/sources/', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
})
.then(res => res.json())
.then(console.log);
```

---

### 3、错误代码速查表

| HTTP状态码 | 业务码 | 说明 |
|------------|--------|------|
| 200 | 1000 | 登录成功 |
| 200 | 1002 | 密码重置邮件已发送 |
| 200 | 2002 | 新闻源更新成功 |
| 200 | 2003 | 新闻源删除成功 |
| 200 | 3001 | 文章采集成功 |
| 200 | 3002 | 文章分析完成 |
| 200 | 4001 | 图表数据生成成功 |
| 200 | 5001 | 用户信息更新成功 |
| 201 | 1001 | 注册成功 |
| 201 | 2001 | 新闻源创建成功 |
| 400 | - | 请求参数错误 |
| 401 | - | 未授权/Token无效 |
| 403 | - | 权限不足 |
| 404 | - | 资源不存在 |
| 409 | - | 资源冲突（用户名已存在等） |
| 500 | - | 服务器内部错误 |

---

### 4、接口限制说明

| 接口 | 限制类型 | 限制值 | 说明 |
|------|----------|--------|------|
| 登录 | 请求频率 | 10次/分钟 | 超过限制需等待 |
| 注册 | 请求频率 | 5次/分钟 | 防止恶意注册 |
| 文章搜索 | 结果数量 | 最多1000条 | 分页获取 |
| 文本分析 | 文本长度 | 最大5000字符 | 超过需分段 |
| 情感分析 | 请求频率 | 30次/分钟 | 防止滥用 |

---

### 5、版本更新记录

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2024-06-26 | 初始版本，包含基础功能 |

---

**文档编写日期：** 2024-06-26

**联系邮箱：** support@cqunews.com
