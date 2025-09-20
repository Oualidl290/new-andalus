import Link from 'next/link'

import { Plus, Upload, Users, Settings } from 'lucide-react'

export function QuickActions() {
  const actions = [
    {
      title: 'New Article',
      description: 'Create a new article',
      href: '/admin/articles/new',
      icon: Plus,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Upload Media',
      description: 'Add images and files',
      href: '/admin/media',
      icon: Upload,
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Manage Users',
      description: 'Add or edit users',
      href: '/admin/users',
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Settings',
      description: 'Configure your site',
      href: '/admin/settings',
      icon: Settings,
      color: 'bg-gray-50 text-gray-600',
    },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
      </div>
      
      <div className="p-6 space-y-4">
        {actions.map((action) => (
          <Link key={action.title} href={action.href}>
            <div className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className={`p-2 rounded-md ${action.color}`}>
                <action.icon className="w-5 h-5" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {action.title}
                </p>
                <p className="text-xs text-gray-600">
                  {action.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}