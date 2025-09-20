import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-red-400 mb-4">403</h1>
          <h2 className="text-3xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-slate-300 text-lg max-w-md mx-auto">
            You don&apos;t have permission to access this resource. Please contact an administrator if you believe this is an error.
          </p>
        </div>

        <div className="space-y-4">
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/">Go Home</Link>
          </Button>
          
          <div>
            <Link 
              href="/auth/signin" 
              className="text-slate-400 hover:text-slate-300 text-sm"
            >
              Sign in with a different account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}