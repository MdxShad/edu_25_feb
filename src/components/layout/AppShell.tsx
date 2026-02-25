'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  Command,
  CreditCard,
  FileText,
  ImageIcon,
  LayoutDashboard,
  Menu,
  PiggyBank,
  Receipt,
  Settings,
  Sparkles,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { signOutAction } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Role = 'SUPER_ADMIN' | 'STAFF' | 'CONSULTANT' | 'AGENT';
type StaffPermission =
  | 'admissionView'
  | 'admissionAdd'
  | 'admissionEdit'
  | 'accountsView'
  | 'expenseAdd'
  | 'reportsView'
  | 'userManage';

export type AppShellUser = {
  id: string;
  userId: string;
  name: string;
  role: Role;
  parentId: string | null;
  permissions: unknown | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: (user: AppShellUser) => boolean;
};

function hasStaffPermission(user: AppShellUser, perm: StaffPermission): boolean {
  if (user.role !== 'STAFF') return false;
  return Array.isArray(user.permissions) && user.permissions.includes(perm);
}

function canAccess(user: AppShellUser, perm: StaffPermission): boolean {
  if (user.role === 'SUPER_ADMIN' || user.role === 'CONSULTANT') return true;
  if (user.role === 'AGENT') return perm === 'admissionView' || perm === 'reportsView';
  return hasStaffPermission(user, perm);
}

const NAV_ITEMS: NavItem[] = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard, show: () => true },
  {
    href: '/app/admissions',
    label: 'Admissions',
    icon: ClipboardList,
    show: (u) => canAccess(u, 'admissionView') || u.role === 'AGENT',
  },
  {
    href: '/app/admissions/new',
    label: 'New Admission',
    icon: FileText,
    show: (u) =>
      u.role === 'SUPER_ADMIN' || u.role === 'CONSULTANT' || canAccess(u, 'admissionAdd'),
  },
  {
    href: '/app/agents',
    label: 'Agents',
    icon: Users,
    show: (u) => u.role === 'SUPER_ADMIN' || u.role === 'CONSULTANT',
  },
  {
    href: '/app/agents/me',
    label: 'My Earnings',
    icon: CreditCard,
    show: (u) => u.role === 'AGENT',
  },
  {
    href: '/app/ledgers/university',
    label: 'University Ledger',
    icon: Building2,
    show: (u) =>
      u.role === 'SUPER_ADMIN' || u.role === 'CONSULTANT' || canAccess(u, 'accountsView'),
  },
  {
    href: '/app/ledgers/agent',
    label: 'Agent Ledger',
    icon: PiggyBank,
    show: (u) =>
      u.role === 'SUPER_ADMIN' ||
      u.role === 'CONSULTANT' ||
      u.role === 'AGENT' ||
      canAccess(u, 'accountsView'),
  },
  {
    href: '/app/ledgers/profit',
    label: 'Profit Ledger',
    icon: BarChart3,
    show: (u) =>
      u.role === 'SUPER_ADMIN' || u.role === 'CONSULTANT' || canAccess(u, 'accountsView'),
  },
  {
    href: '/app/expenses/daily',
    label: 'Daily Expenses',
    icon: Receipt,
    show: (u) => u.role === 'SUPER_ADMIN' || u.role === 'CONSULTANT' || canAccess(u, 'expenseAdd'),
  },
  {
    href: '/app/reports',
    label: 'Reports',
    icon: BookOpen,
    show: (u) =>
      u.role === 'SUPER_ADMIN' ||
      u.role === 'CONSULTANT' ||
      u.role === 'AGENT' ||
      canAccess(u, 'reportsView'),
  },
  {
    href: '/app/posters',
    label: 'Posters',
    icon: ImageIcon,
    show: (u) =>
      u.role === 'SUPER_ADMIN' ||
      u.role === 'CONSULTANT' ||
      u.role === 'AGENT' ||
      canAccess(u, 'reportsView'),
  },
  {
    href: '/app/ai',
    label: 'AI Tools',
    icon: Sparkles,
    show: (u) =>
      process.env.NEXT_PUBLIC_AI_FEATURES_ENABLED === 'true' &&
      (u.role === 'SUPER_ADMIN' ||
        u.role === 'CONSULTANT' ||
        u.role === 'AGENT' ||
        canAccess(u, 'reportsView')),
  },
  {
    href: '/app/admin/universities',
    label: 'Universities',
    icon: Building2,
    show: (u) => u.role === 'SUPER_ADMIN',
  },
  {
    href: '/app/admin/courses',
    label: 'Courses',
    icon: BookOpen,
    show: (u) => u.role === 'SUPER_ADMIN',
  },
  {
    href: '/app/admin/users',
    label: 'Users & Staff',
    icon: Settings,
    show: (u) => u.role === 'SUPER_ADMIN',
  },
  {
    href: '/app/admin/audit',
    label: 'Audit Logs',
    icon: Settings,
    show: (u) => u.role === 'SUPER_ADMIN',
  },
  {
    href: '/app/admin/settings',
    label: 'Admin Settings',
    icon: Settings,
    show: (u) => u.role === 'SUPER_ADMIN',
  },
];

function toLabel(segment: string): string {
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getHeader(pathname: string): {
  title: string;
  breadcrumbs: Array<{ href: string; label: string }>;
} {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{ href: string; label: string }> = [];
  let href = '';

  for (const segment of segments) {
    href += `/${segment}`;
    breadcrumbs.push({ href, label: toLabel(segment) });
  }

  const title = breadcrumbs[breadcrumbs.length - 1]?.label ?? 'Dashboard';
  return { title, breadcrumbs };
}

function NavLink({
  item,
  pathname,
  collapsed,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  const content = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        active ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );

  if (!collapsed) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarNav({
  user,
  pathname,
  collapsed,
  onLinkClick,
}: {
  user: AppShellUser;
  pathname: string;
  collapsed: boolean;
  onLinkClick?: () => void;
}) {
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.filter((item) => item.show(user)).map((item) => (
        <NavLink
          key={item.href}
          item={item}
          pathname={pathname}
          collapsed={collapsed}
          onClick={onLinkClick}
        />
      ))}
    </nav>
  );
}

function CommandPalette({ user }: { user: AppShellUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return NAV_ITEMS.filter((item) => item.show(user)).filter((item) => {
      if (!q) return true;
      return item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q);
    });
  }, [query, user]);

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  React.useEffect(() => {
    setOpen(false);
    setQuery('');
  }, [pathname]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Command className="h-4 w-4" />
        <span className="hidden sm:inline">Quick Actions</span>
        <kbd className="hidden rounded border border-zinc-300 px-1.5 py-0.5 text-xs text-zinc-600 sm:inline">
          Ctrl K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 sm:max-w-xl">
          <DialogHeader className="border-b border-zinc-200 px-4 py-3">
            <DialogTitle>Command Palette</DialogTitle>
            <DialogDescription>Search and jump across CRM modules.</DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <Input
              placeholder="Type a page name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
              {filtered.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    router.push(item.href);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100"
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-zinc-500">{item.href}</span>
                </button>
              ))}
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-zinc-500">No matches found.</div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AppShell({ user, children }: { user: AppShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const value = window.localStorage.getItem('educonnect.sidebar.collapsed');
    setCollapsed(value === '1');
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem('educonnect.sidebar.collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  const { title, breadcrumbs } = getHeader(pathname);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen bg-zinc-100 text-zinc-900">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 hidden border-r border-zinc-200 bg-white/95 backdrop-blur md:flex md:flex-col',
            collapsed ? 'w-[78px]' : 'w-64'
          )}
        >
          <div className="flex h-16 items-center justify-between px-3">
            <Link
              href="/app"
              className={cn('font-semibold tracking-tight', collapsed && 'sr-only')}
            >
              EduConnect CRM
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((v) => !v)}
              aria-label="Toggle sidebar"
            >
              {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
          <Separator />
          <div className="flex-1 overflow-y-auto p-3">
            <SidebarNav user={user} pathname={pathname} collapsed={collapsed} />
          </div>
          <Separator />
          <div className="p-3">
            <div
              className={cn(
                'rounded-md border border-zinc-200 p-3',
                collapsed && 'p-2 text-center'
              )}
            >
              <div className={cn('text-sm font-medium', collapsed && 'sr-only')}>{user.name}</div>
              <div className={cn('text-xs text-zinc-500', collapsed && 'sr-only')}>
                {user.userId} ({user.role})
              </div>
              {!collapsed ? (
                <form action={signOutAction} className="mt-2">
                  <Button type="submit" variant="outline" className="w-full" size="sm">
                    Sign out
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
        </aside>

        <div className={cn('min-h-screen md:pl-64', collapsed && 'md:pl-[78px]')}>
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
              <div className="flex items-center gap-3">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      aria-label="Open menu"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    <div className="flex h-16 items-center px-4">
                      <SheetTitle className="text-base">EduConnect CRM</SheetTitle>
                    </div>
                    <Separator />
                    <div className="p-3">
                      <SidebarNav
                        user={user}
                        pathname={pathname}
                        collapsed={false}
                        onLinkClick={() => setMobileOpen(false)}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                <div>
                  <div className="text-xs text-zinc-500">
                    {breadcrumbs.map((crumb, index) => (
                      <span key={crumb.href}>
                        {index > 0 ? ' / ' : ''}
                        <Link href={crumb.href} className="hover:underline">
                          {crumb.label}
                        </Link>
                      </span>
                    ))}
                  </div>
                  <h1 className="text-base font-semibold text-zinc-900 md:text-lg">{title}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CommandPalette user={user} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      aria-label="User menu"
                    >
                      <UserCircle2 className="h-6 w-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-zinc-500">
                        {user.userId} ({user.role})
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <form action={signOutAction} className="w-full">
                        <button type="submit" className="w-full text-left">
                          Sign out
                        </button>
                      </form>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
