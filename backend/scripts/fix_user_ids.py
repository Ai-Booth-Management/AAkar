from sqlmodel import Session, create_engine, select
from app.domain.models.user import User

engine = create_engine('sqlite:///./data/app.db')
with Session(engine) as session:
    users = session.exec(select(User).where(User.booth_id == 'ND-CN-B1')).all()
    for u in users:
        u.booth_id = 'DL_ND_CP_B1'
        session.add(u)
    session.commit()
    print(f'Updated {len(users)} users to use DL_ND_CP_B1.')

    # Also handle the Mandal Manager just in case
    mandal_users = session.exec(select(User).where(User.mandal_id == 'ND-CN')).all()
    for u in mandal_users:
        u.mandal_id = 'DL_ND_CP'
        session.add(u)
    session.commit()
    print(f'Updated {len(mandal_users)} mandal managers to use DL_ND_CP.')
