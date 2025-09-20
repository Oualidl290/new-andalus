import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PerformanceDashboard } from '@/components/admin/PerformanceDashboard'

export default async function PerformancePage() {
  const session = await auth()

  // Only admins can access performance monitoring
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/admin')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Monitoring</h1>
        <p className="text-gray-600 mt-2">
          Monitor application performance, database queries, and user experience metrics.
        </p>
      </div>

      <PerformanceDashboard />
    </div>
  )
}

export const metadata = {
  title: 'Performance Monitoring - Admin Dashboard',
  description: 'Monitor application performance and metrics',
}