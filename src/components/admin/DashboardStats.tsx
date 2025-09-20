import { FileText, Eye, TrendingUp } from 'lucide-react'
import { getDashboardStats } from '@/lib/db/queries'

export async function DashboardStats() {
  const stats = await getDashboardStats()

  const statCards = [
    {
      title: 'Total Articles',
      value: stats.totalArticles,
      change: '+12%',
      changeType: 'positive' as const,
      icon: FileText,
    },
    {
      title: 'Published',
      value: stats.publishedArticles,
      change: '+8%',
      changeType: 'positive' as const,
      icon: Eye,
    },
    {
      title: 'Draft Articles',
      value: stats.draftArticles,
      change: '+3%',
      changeType: 'positive' as const,
      icon: FileText,
    },
    {
      title: 'Total Views',
      value: stats.totalViews || 0,
      change: '+23%',
      changeType: 'positive' as const,
      icon: TrendingUp,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => (
        <div
          key={stat.title}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <stat.icon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span
              className={`text-sm font-medium ${
                stat.changeType === 'positive'
                  ? 'text-green-600'
                  : stat.changeType === 'negative'
                  ? 'text-red-600'
                  : 'text-gray-600'
              }`}
            >
              {stat.change}
            </span>
            <span className="text-sm text-gray-600 ml-2">from last month</span>
          </div>
        </div>
      ))}
    </div>
  )
}