import { Suspense } from 'react'
import { getAllArticles } from '@/lib/db/queries'
import { ArticlesTable } from './ArticlesTable'

interface ArticlesTableWrapperProps {
  page: number
  status: string
  author: string
  search: string
}

export async function ArticlesTableWrapper({ page, status, author, search }: ArticlesTableWrapperProps) {
  // Pre-fetch data on server for initial load
  const result = await getAllArticles({
    page,
    limit: 20,
    status: status === 'all' ? undefined : status as 'draft' | 'published' | 'archived',
    authorId: author === 'all' ? undefined : author,
    search: search || undefined,
  })

  return (
    <Suspense fallback={<div>Loading articles...</div>}>
      <ArticlesTable 
        page={page}
        status={status}
        author={author}
        search={search}
        initialData={result}
      />
    </Suspense>
  )
}