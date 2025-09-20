'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  FileText, 
  Image, 
  Users, 
  Settings,
  BarChart3,
  Activity
} from 'lucide-react'

interface AdminSidebarProps {
  userRole: string
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    roles: ['admin', 'editor'],
  },
  {
    name: 'Articles',
    href: '/admin/articles',
    icon: FileText,
    roles: ['admin', 'editor'],
  },
  {
    name: 'Media',
    href: '/admin/media',
    icon: Image,
    roles: ['admin', 'editor'],
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    name: 'Performance',
    href: '/admin/performance',
    icon: Activity,
    roles: ['admin'],
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    roles: ['admin', 'editor'],
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    roles: ['admin'],
  },
]

export function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname()

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  )

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <Link href="/admin" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">NA</span>
          </div>
          <span className="font-semibold text-gray-900">New Andalus</span>
        </Link>
      </div>

      <nav className="px-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href || 
                          (item.href !== '/admin' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <Link
          href="/"
          className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
        >
          ← Back to Site
        </Link>
      </div>
    </div>
  )
}