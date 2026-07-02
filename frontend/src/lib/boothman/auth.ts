import { cookies } from 'next/headers';
import { prisma } from './prisma';

export async function getUser() {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('session')?.value;

  if (!sessionStr) return null;

  try {
    const session = JSON.parse(sessionStr);
    
    if (session.type === 'ADMIN') {
      const admin = await prisma.admin.findUnique({ where: { id: session.id } });
      return admin ? { ...admin, role: 'ADMIN' } : null;
    }
    
    if (session.type === 'BOOTH') {
      const booth = await prisma.booth.findUnique({ 
        where: { id: session.id },
        include: {
          volunteers: true,
          tasks: true,
        }
      });
      return booth ? { ...booth, role: 'COORDINATOR' } : null;
    }
    
    if (session.type === 'VOLUNTEER') {
      const volunteer = await prisma.volunteer.findUnique({ 
        where: { id: session.id },
        include: { assignedBooth: true }
      });
      return volunteer ? { ...volunteer, role: 'VOLUNTEER' } : null;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

export async function login(type: 'ADMIN' | 'BOOTH' | 'VOLUNTEER', id: number) {
  const cookieStore = await cookies();
  cookieStore.set('session', JSON.stringify({ type, id }));
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
