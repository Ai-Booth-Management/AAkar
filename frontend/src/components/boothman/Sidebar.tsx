'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  CheckSquare, 
  FileText, 
  Megaphone,
  LogOut,
  UserCircle,
  MessageSquare
} from 'lucide-react';
import { logoutAction } from '@/app/boothman/actions';

interface SidebarProps {
  role: 'ADMIN' | 'COORDINATOR' | 'VOLUNTEER';
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const getLinks = () => {
    switch(role) {
      case 'ADMIN':
        return [
          { href: '/boothman/admin', icon: LayoutDashboard, label: 'Overview' },
          { href: '/boothman/admin/volunteers', icon: Users, label: 'Volunteers' },
          { href: '/boothman/admin/booths', icon: MapPin, label: 'Booths' },
          { href: '/boothman/admin/reports', icon: FileText, label: 'Reports' },
          { href: '/boothman/admin/announcements', icon: Megaphone, label: 'Announcements' },
        ];
      case 'COORDINATOR':
        return [
          { href: '/boothman/coordinator', icon: LayoutDashboard, label: 'Booth Status' },
          { href: '/boothman/coordinator/profile', icon: UserCircle, label: 'Booth Profile' },
          { href: '/boothman/coordinator/hub', icon: MessageSquare, label: 'Intel Hub' },
          { href: '/boothman/coordinator/volunteers', icon: Users, label: 'My Volunteers' },
          { href: '/boothman/coordinator/tasks', icon: CheckSquare, label: 'Tasks' },
          { href: '/boothman/coordinator/campaigns', icon: Megaphone, label: 'Campaigns' },
          { href: '/boothman/coordinator/reports', icon: FileText, label: 'Reports' },
        ];
      case 'VOLUNTEER':
        return [
          { href: '/boothman/volunteer', icon: LayoutDashboard, label: 'Dashboard' },
          { href: '/boothman/volunteer/tasks', icon: CheckSquare, label: 'My Tasks' },
          { href: '/boothman/volunteer/reports', icon: FileText, label: 'Submit Report' },
        ];
    }
  };

  const links = getLinks();

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div className="logo">B</div>
          <span className="brand-name">Boothman</span>
        </div>
        
        <nav className="sidebar-nav">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={`nav-item ${isActive ? 'active' : ''}`}>
                <Icon strokeWidth={2.5} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-6">
        <form action={logoutAction}>
          <button type="submit" className="w-full flex items-center gap-3.5 px-4 py-3 text-[11px] font-extrabold text-white/60 hover:text-white transition-colors uppercase tracking-widest rounded-md hover:bg-white/10">
            <LogOut size={20} strokeWidth={2.5} />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
