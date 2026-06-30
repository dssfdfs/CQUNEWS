from app.database import engine, Base
from app.models.user import User
from app.models.history import History


def init_db():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()