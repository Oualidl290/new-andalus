import Link from 'next/link'
import { FileX, Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ArticleNotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-4">
        <div className="mb-8">
          <FileX className="w-24 h-24 text-gray-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Article Not Found</h1>
          <p className="text-gray-600">
            The article you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Back to Homepage
              </Button>
            </Link>
            <Link href="/articles">
              <Button variant="outline" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Browse Articles
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-gray-500">
            Or try searching for what you&apos;re looking for using the search bar above.
          </p>
        </div>
      </div>
    </div>
  )
}