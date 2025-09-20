import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Check if user is authenticated and has admin/editor role
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/admin')
  }

  if (!['admin', 'editor'].includes(session.user.role)) {
    redirect('/auth/unauthorized')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader user={session.user} />
      <div className="flex">
        <AdminSidebar userRole={session.user.role} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}