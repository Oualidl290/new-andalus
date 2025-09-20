import { auth } from '@/lib/auth'
import { ArticleEditor } from '@/components/admin/ArticleEditor'
import { redirect } from 'next/navigation'

export default async function NewArticlePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create New Article</h1>
        <p className="text-gray-600 mt-2">
          Write and publish your content with our rich text editor.
        </p>
      </div>

      <ArticleEditor 
        mode="create"
        authorId={session.user.id}
      />
    </div>
  )
}

export const metadata = {
  title: 'New Article - Admin Dashboard',
  description: 'Create a new article',
}