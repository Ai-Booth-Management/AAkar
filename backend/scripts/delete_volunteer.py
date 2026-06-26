from sqlmodel import Session, create_engine, select
from app.domain.models.user import User

engine = create_engine('sqlite:///./data/app.db')
with Session(engine) as session:
    user = session.exec(select(User).where(User.email == 'vol.ndcn-b1-01@aakar.gov.in')).first()
    if user:
        session.delete(user)
        session.commit()
        print('User vol.ndcn-b1-01@aakar.gov.in deleted successfully.')
    else:
        print('User not found.')
