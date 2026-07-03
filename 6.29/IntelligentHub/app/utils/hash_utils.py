import hashlib


def generate_url_hash(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()