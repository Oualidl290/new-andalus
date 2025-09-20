import { Suspense } from 'react'
import { ArticlesTableWrapper } from '@/components/admin/ArticlesTableWrapper'
import { ArticlesFilters } from '@/components/admin/ArticlesFilters'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface SearchParams {
  page?: string
  status?: string
  author?: string
  search?: string
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const status = params.status || 'all'
  const author = params.author || 'all'
  const search = params.search || ''

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Articles</h1>
          <p className="text-gray-600 mt-2">
            Manage your content and track publishing status.
          </p>
        </div>
        <Link href="/admin/articles/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        </Link>
      </div>

      <ArticlesFilters 
        currentStatus={status}
        currentAuthor={author}
        currentSearch={search}
      />

      <Suspense fallback={<div>Loading articles...</div>}>
        <ArticlesTableWrapper 
          page={page}
          status={status}
          author={author}
          search={search}
        />
      </Suspense>
    </div>
  )
}

export const metadata = {
  title: 'Articles - Admin Dashboard',
  description: 'Manage articles and content',
}