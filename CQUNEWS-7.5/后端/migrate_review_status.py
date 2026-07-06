from app.database import News, Session, engine

def migrate_review_status():
    with Session(engine) as db:
        pending_count = len(db.exec(
            News.__table__.select().where(News.review_status == "pending")
        ).all())
        
        published_count = len(db.exec(
            News.__table__.select().where(News.review_status == "published")
        ).all())
        
        rejected_count = len(db.exec(
            News.__table__.select().where(News.review_status == "rejected")
        ).all())
        
        print(f"迁移前统计：")
        print(f"  pending: {pending_count}")
        print(f"  published: {published_count}")
        print(f"  rejected: {rejected_count}")
        print(f"  总计: {pending_count + published_count + rejected_count}")
        
        if pending_count > 0:
            from sqlmodel import update
            
            stmt = update(News).where(News.review_status == "pending").values(review_status="published")
            result = db.exec(stmt)
            db.commit()
            
            print(f"\n已将 {result.rowcount} 条待审核新闻批量更新为已发布状态")
            
            pending_after = len(db.exec(
                News.__table__.select().where(News.review_status == "pending")
            ).all())
            
            published_after = len(db.exec(
                News.__table__.select().where(News.review_status == "published")
            ).all())
            
            print(f"\n迁移后统计：")
            print(f"  pending: {pending_after}")
            print(f"  published: {published_after}")
            print(f"  rejected: {rejected_count}")
        else:
            print("\n没有待迁移的数据")

if __name__ == "__main__":
    migrate_review_status()