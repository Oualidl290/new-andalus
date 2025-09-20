import { auth } from '@/lib/auth'
import { DashboardStats } from '@/components/admin/DashboardStats'
import { RecentArticles } from '@/components/admin/RecentArticles'
import { QuickActions } from '@/components/admin/QuickActions'

export default async function AdminDashboard() {
  const session = await auth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session?.user?.name}
        </h1>
        <p className="text-gray-600 mt-2">
          Here&apos;s what&apos;s happening with your content today.
        </p>
      </div>

      <DashboardStats />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentArticles />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Admin Dashboard - New Andalus',
  description: 'Content management dashboard for New Andalus editorial platform',
}