import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BarChart3, TrendingUp, Users, Eye } from 'lucide-react'

export default async function AnalyticsPage() {
  const session = await auth()

  if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
    redirect('/admin')
  }

  // Mock analytics data
  const analyticsData = {
    pageViews: {
      total: 12543,
      change: '+23%',
      trend: 'up' as const
    },
    uniqueVisitors: {
      total: 8921,
      change: '+18%',
      trend: 'up' as const
    },
    avgSessionDuration: {
      total: '3m 42s',
      change: '+12%',
      trend: 'up' as const
    },
    bounceRate: {
      total: '34.2%',
      change: '-5%',
      trend: 'down' as const
    }
  }

  const topArticles = [
    { title: 'Getting Started with Next.js', views: 1234, change: '+15%' },
    { title: 'Modern CSS Techniques', views: 987, change: '+8%' },
    { title: 'JavaScript Best Practices', views: 756, change: '+22%' },
    { title: 'React Performance Tips', views: 654, change: '+5%' },
    { title: 'TypeScript Guide', views: 543, change: '+12%' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">
          Track your content performance and audience engagement.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Page Views</p>
              <p className="text-3xl font-bold text-gray-900">{analyticsData.pageViews.total.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm font-medium text-green-600">
              {analyticsData.pageViews.change}
            </span>
            <span className="text-sm text-gray-600 ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Visitors</p>
              <p className="text-3xl font-bold text-gray-900">{analyticsData.uniqueVisitors.total.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm font-medium text-green-600">
              {analyticsData.uniqueVisitors.change}
            </span>
            <span className="text-sm text-gray-600 ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Session</p>
              <p className="text-3xl font-bold text-gray-900">{analyticsData.avgSessionDuration.total}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm font-medium text-green-600">
              {analyticsData.avgSessionDuration.change}
            </span>
            <span className="text-sm text-gray-600 ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bounce Rate</p>
              <p className="text-3xl font-bold text-gray-900">{analyticsData.bounceRate.total}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm font-medium text-green-600">
              {analyticsData.bounceRate.change}
            </span>
            <span className="text-sm text-gray-600 ml-2">from last month</span>
          </div>
        </div>
      </div>

      {/* Top Articles */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Performing Articles</h3>
          <p className="text-sm text-gray-600 mt-1">Most viewed articles in the last 30 days</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {topArticles.map((article, index) => (
            <div key={index} className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{article.title}</h4>
                  <p className="text-sm text-gray-600">{article.views.toLocaleString()} views</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-green-600">{article.change}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <BarChart3 className="w-6 h-6 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">Analytics Integration</h3>
            <p className="text-sm text-blue-700 mt-1">
              This is a demo analytics dashboard. In production, you would integrate with services like 
              Google Analytics, Plausible, or other analytics providers to get real visitor data and insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Analytics - Admin Dashboard',
  description: 'View content performance and audience analytics',
}