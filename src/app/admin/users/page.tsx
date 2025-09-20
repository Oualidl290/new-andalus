import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { UsersTable } from '@/components/admin/UsersTable'
import { CreateUserButton } from '@/components/admin/CreateUserButton'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'

interface SearchParams {
  page?: string
  role?: string
  search?: string
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()

  // Only admins can access user management
  if (session?.user?.role !== 'admin') {
    redirect('/admin')
  }

  const params = await searchParams
  const page = Number(params.page) || 1
  const role = params.role || 'all'
  const search = params.search || ''

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-2">
            Manage user accounts and permissions.
          </p>
        </div>
        <CreateUserButton>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </CreateUserButton>
      </div>

      <Suspense fallback={<div>Loading users...</div>}>
        <UsersTable 
          page={page}
          role={role}
          search={search}
        />
      </Suspense>
    </div>
  )
}

export const metadata = {
  title: 'Users - Admin Dashboard',
  description: 'Manage user accounts and permissions',
}