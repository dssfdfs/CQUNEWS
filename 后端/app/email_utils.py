from __future__ import annotations

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from .config import settings
from .logger import logger


def send_email(
    to_email: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None,
) -> bool:
    try:
        if not settings.SMTP_HOST or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
            logger.warning("SMTP not configured, skipping email send")
            return False

        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        if html_body:
            msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Email sent successfully to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_password_reset_email(to_email: str, token: str) -> bool:
    subject = "CQUNEWS - 密码重置请求"
    
    reset_url = f"http://localhost:5173/reset-password?token={token}&email={to_email}"
    
    body = f"""您好，

您收到这封邮件是因为您请求重置CQUNEWS账号的密码。

请点击以下链接重置密码：
{reset_url}

该链接有效期为1小时，请尽快完成重置。

如果您没有请求重置密码，请忽略此邮件，您的密码不会被更改。

祝好，
CQUNEWS团队
"""
    
    html_body = f"""<div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">CQUNEWS</h1>
    </div>
    <div style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <h2 style="color: #333; margin-top: 0;">密码重置请求</h2>
        <p style="color: #666; line-height: 1.6;">您好，</p>
        <p style="color: #666; line-height: 1.6;">您收到这封邮件是因为您请求重置CQUNEWS账号的密码。</p>
        <div style="margin: 20px 0;">
            <a href="{reset_url}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">点击重置密码</a>
        </div>
        <p style="color: #666; line-height: 1.6;">或者复制以下链接到浏览器中打开：</p>
        <p style="color: #666; font-family: monospace; word-break: break-all; line-height: 1.6;">{reset_url}</p>
        <p style="color: #999; font-size: 14px; margin-top: 20px;">该链接有效期为1小时，请尽快完成重置。</p>
    </div>
    <div style="margin-top: 20px; text-align: center; color: #999; font-size: 14px;">
        <p>如果您没有请求重置密码，请忽略此邮件，您的密码不会被更改。</p>
        <p>祝好，CQUNEWS团队</p>
    </div>
</div>"""
    
    return send_email(to_email, subject, body, html_body)


def send_verification_code_email(to_email: str, code: str) -> bool:
    subject = "CQUNEWS - 验证码"
    
    body = f"""您好，

您的CQUNEWS验证码是：

{code}

该验证码有效期为5分钟，请尽快使用。

如果您没有进行此操作，请忽略此邮件。

祝好，
CQUNEWS团队
"""
    
    html_body = f"""<div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">CQUNEWS</h1>
    </div>
    <div style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <h2 style="color: #333; margin-top: 0;">验证码</h2>
        <p style="color: #666; line-height: 1.6;">您好，</p>
        <p style="color: #666; line-height: 1.6;">您的CQUNEWS验证码是：</p>
        <div style="margin: 20px 0; text-align: center;">
            <span style="display: inline-block; padding: 16px 32px; background: #fff; border: 2px solid #667eea; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea;">{code}</span>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 20px;">该验证码有效期为5分钟，请尽快使用。</p>
    </div>
    <div style="margin-top: 20px; text-align: center; color: #999; font-size: 14px;">
        <p>如果您没有进行此操作，请忽略此邮件。</p>
        <p>祝好，CQUNEWS团队</p>
    </div>
</div>"""
    
    return send_email(to_email, subject, body, html_body)