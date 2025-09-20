import { auth } from '@/lib/auth'
import { ArticleEditor } from '@/components/admin/ArticleEditor'
import { getArticleById } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'

interface EditArticlePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { id } = await params
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  const article = await getArticleById(id)

  if (!article) {
    notFound()
  }

  // Check if user can edit this article
  const canEdit = session.user.role === 'admin' || 
                  session.user.role === 'editor' || 
                  article.authorId === session.user.id

  if (!canEdit) {
    redirect('/auth/unauthorized')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Article</h1>
        <p className="text-gray-600 mt-2">
          Make changes to your article and manage its publication status.
        </p>
      </div>

      <ArticleEditor 
        mode="edit"
        article={article as any}
        authorId={session.user.id}
      />
    </div>
  )
}

export async function generateMetadata({ params }: EditArticlePageProps) {
  const { id } = await params
  const article = await getArticleById(id)
  
  return {
    title: article ? `Edit: ${article.title}` : 'Edit Article',
    description: 'Edit article content and settings',
  }
}