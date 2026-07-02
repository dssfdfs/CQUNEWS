from __future__ import annotations

import csv
import io
import json
import os
import secrets
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from PIL import Image

from .config import settings
from .logger import logger
from .models import ExportJob, User, UserProfile, UserSettings


THEME_MODE_OPTIONS = {
    "light": "浅色模式",
    "dark": "深色模式",
}

FONT_SIZE_OPTIONS = {
    "xs": {"label": "小", "value": 12},
    "sm": {"label": "中小", "value": 14},
    "medium": {"label": "中", "value": 16},
    "lg": {"label": "中大", "value": 18},
    "xl": {"label": "大", "value": 22},
}

FONT_SIZE_VALUES = {k: v["value"] for k, v in FONT_SIZE_OPTIONS.items()}

LANGUAGE_OPTIONS = {
    "zh-CN": "简体中文",
    "zh-TW": "繁體中文",
    "en-US": "English (US)",
    "en-GB": "English (UK)",
    "ja-JP": "日本語",
    "ko-KR": "한국어",
}

THEME_PRESETS = [
    {"name": "经典蓝", "value": "#1677ff"},
    {"name": "薄荷绿", "value": "#10b981"},
    {"name": "落日橙", "value": "#f97316"},
    {"name": "玫瑰粉", "value": "#e11d48"},
    {"name": "优雅紫", "value": "#7c3aed"},
    {"name": "墨黑", "value": "#0f172a"},
]


def _mkdir(p: str) -> None:
    Path(p).mkdir(parents=True, exist_ok=True)


def process_avatar(
    file_bytes: bytes,
    original_format: str = "png",
    size: Optional[int] = None,
) -> tuple[bytes, str, int, int]:
    """Resize/compress an uploaded avatar. Returns (output_bytes, fmt, width, height)."""
    size = size or settings.AVATAR_DEFAULT_SIZE
    img = Image.open(io.BytesIO(file_bytes))

    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA") if original_format.lower() == "png" else img.convert("RGB")

    # Crop to square (center)
    width, height = img.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    img = img.crop((left, top, left + side, top + side))

    img = img.resize((size, size), Image.LANCZOS)

    fmt = original_format.lower()
    if fmt not in settings.AVATAR_ALLOWED_FORMATS:
        fmt = "png"
    if fmt == "jpg":
        fmt = "jpeg"

    out = io.BytesIO()
    if fmt in ("jpeg", "png", "webp"):
        img.save(out, format=fmt, quality=85, optimize=True)
    else:
        img.save(out, format="png", optimize=True)
    data = out.getvalue()

    # enforce size cap (auto-compress further)
    if len(data) > settings.AVATAR_MAX_SIZE_BYTES and fmt != "jpeg":
        img.convert("RGB").save(out := io.BytesIO(), format="jpeg", quality=70, optimize=True)
        data = out.getvalue()
        fmt = "jpeg"

    return data, fmt, size, size


def save_avatar_file(user_id: int, file_bytes: bytes, fmt: str) -> tuple[str, int]:
    _mkdir(settings.UPLOAD_DIR)
    user_dir = os.path.join(settings.UPLOAD_DIR, str(user_id))
    _mkdir(user_dir)
    filename = f"{int(time.time())}_{secrets.token_hex(4)}.{fmt}"
    path = os.path.join(user_dir, filename)
    with open(path, "wb") as f:
        f.write(file_bytes)
    return f"/uploads/{user_id}/{filename}", len(file_bytes)


def delete_avatar_file(url: Optional[str]) -> None:
    if not url:
        return
    local_path = Path(settings.UPLOAD_DIR) / url.removeprefix("/uploads/").lstrip("/")
    try:
        if local_path.exists():
            local_path.unlink()
    except Exception as e:  # noqa: BLE001
        logger.warning("Failed to delete avatar %s: %s", local_path, e)


def build_user_export_payload(user: User, profile: UserProfile, settings_row: UserSettings) -> dict:
    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "status": user.status,
            "created_at": user.created_at,
        },
        "profile": {
            "nickname": profile.nickname,
            "avatar_url": profile.avatar_url,
            "bio": profile.bio,
            "gender": profile.gender,
            "birthday": profile.birthday,
        },
        "settings": {
            "theme_mode": settings_row.theme_mode,
            "theme_color": settings_row.theme_color,
            "font_size": settings_row.font_size,
            "language": settings_row.language,
            "timezone": settings_row.timezone,
            "date_format": settings_row.date_format,
            "time_format": settings_row.time_format,
            "number_format": settings_row.number_format,
            "two_factor_enabled": bool(settings_row.two_factor_enabled),
            "notify_system": bool(settings_row.notify_system),
            "notify_message": bool(settings_row.notify_message),
            "notify_marketing": bool(settings_row.notify_marketing),
            "notify_email": bool(settings_row.notify_email),
            "notify_sms": bool(settings_row.notify_sms),
            "notify_in_app": bool(settings_row.notify_in_app),
            "notify_frequency": settings_row.notify_frequency,
        },
    }


def generate_export_file(
    user: User,
    profile: UserProfile,
    settings_row: UserSettings,
    fmt: str = "json",
) -> tuple[str, str, int]:
    """Generate an export file. Returns (absolute_path, filename, size_bytes)."""
    _mkdir(settings.EXPORT_DIR)
    payload = build_user_export_payload(user, profile, settings_row)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"user_{user.id}_export_{ts}.{fmt}"
    path = os.path.join(settings.EXPORT_DIR, filename)

    if fmt == "json":
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
    elif fmt == "csv":
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["section", "key", "value"])
            for section, data in payload.items():
                if isinstance(data, dict):
                    for k, v in data.items():
                        writer.writerow([section, k, v])
                else:
                    writer.writerow([section, "", data])
    else:
        raise ValueError(f"Unsupported export format: {fmt}")

    size = os.path.getsize(path)
    return path, filename, size


def get_export_download_path(filename: str) -> Path:
    safe = os.path.basename(filename)
    return Path(settings.EXPORT_DIR) / safe


def _generate_backup_codes(n: int = 4) -> list[str]:
    return [secrets.token_hex(4).upper() for _ in range(n)]


def enable_2fa_setup_payload(user_id: int, username: str) -> dict:
    import base64

    import pyotp
    import qrcode
    from io import BytesIO

    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    issuer = "CQUNEWS"
    provisioning = totp.provisioning_uri(name=username, issuer_name=issuer)
    img = qrcode.make(provisioning)
    buf = BytesIO()
    img.save(buf, format="PNG")
    qr_data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    backup_codes = _generate_backup_codes()
    return {
        "secret": secret,
        "qr_code_data_url": qr_data_url,
        "backup_codes": backup_codes,
    }


def _verify_2fa_code(secret: str, code: str) -> bool:
    import pyotp

    totp = pyotp.TOTP(secret)
    return bool(totp.verify(code, valid_window=1))


def cleanup_expired_exports() -> int:
    """Delete expired export jobs/files. Returns number deleted."""
    deleted = 0
    now = datetime.utcnow().isoformat()
    for file_path in Path(settings.EXPORT_DIR).glob("user_*_export_*.*"):
        try:
            mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
            if datetime.utcnow() - mtime > timedelta(hours=24):
                file_path.unlink()
                deleted += 1
        except OSError:
            continue
    return deleted
