'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/boothman/prisma';
import { login, logout, getUser } from '@/lib/boothman/auth';

export async function loginAction(formData: FormData) {
  const phone = formData.get('phone') as string;
  const password = formData.get('password') as string;
  
  if (!phone || !password) {
    return { error: 'Phone and password are required' };
  }
  
  // Check Admin first
  const admin = await prisma.admin.findUnique({ where: { phone } });
  if (admin && admin.password === password) {
    await login('ADMIN', admin.id);
    redirect('/boothman/admin');
  }

  return { error: 'Invalid credentials' };
}

export async function boothLoginAction(formData: FormData) {
  const partNumber = formData.get('partNumber') as string;
  const password = formData.get('password') as string;
  
  if (!partNumber || !password) {
    return { error: 'Part Number and Password are required' };
  }
  
  const booth = await prisma.booth.findUnique({
    where: { partNumber }
  });
  
  if (!booth || booth.password !== password) {
    return { error: 'Invalid Booth Part Number or Password' };
  }
  
  await login('BOOTH', booth.id);
  
  redirect('/boothman/coordinator');
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

export async function getAvailableBoothsAction() {
  const booths = await prisma.booth.findMany({
    select: { id: true, name: true, partNumber: true },
    orderBy: { partNumber: 'asc' }
  });
  return booths;
}

export async function logoutAction() {
  await logout();
  redirect('/boothman');
}

export async function createTaskAction(formData: FormData) {
  const user = await getUser();
  if (user?.role !== 'COORDINATOR') {
    return { error: 'Unauthorized' };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const assigneeId = formData.get('assigneeId') as string;
  const boothId = user.id;

  if (!title || !description) {
    return { error: 'Title and description are required' };
  }

  await prisma.task.create({
    data: {
      title,
      description,
      status: 'TODO',
      boothId: boothId,
      assigneeId: assigneeId ? parseInt(assigneeId) : null
    }
  });

  return { success: true };
}

export async function updateTaskStatusAction(taskId: number, status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED') {
  const user = await getUser();
  if (user?.role !== 'VOLUNTEER' && user?.role !== 'COORDINATOR') {
    return { error: 'Unauthorized' };
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: 'Not found' };

  if (user.role === 'VOLUNTEER' && task.assigneeId !== user.id) {
    return { error: 'Unauthorized' };
  }
  if (user.role === 'COORDINATOR' && task.boothId !== user.id) {
    return { error: 'Unauthorized' };
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status }
  });

  return { success: true };
}

export async function assignCampaignTaskAction(boothId: number, assigneeId: number, houseNo: string) {
  const user = await getUser();
  if (user?.role !== 'COORDINATOR' || user.id !== boothId) {
    return { error: 'Unauthorized' };
  }

  if (!assigneeId || !houseNo) {
    return { error: 'Assignee and House Number are required' };
  }

  await prisma.task.create({
    data: {
      title: `Door-to-door Campaign: House #${houseNo}`,
      description: `Promote the party and distribute material at house #${houseNo}.`,
      status: 'TODO',
      boothId: boothId,
      assigneeId: assigneeId
    }
  });

  return { success: true };
}
