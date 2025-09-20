import Link from 'next/link'
import { SignInForm } from '@/components/auth/signin-form'

interface SignInPageProps {
  searchParams: Promise<{
    callbackUrl?: string
    message?: string
  }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-300">Sign in to your New Andalus account</p>
        </div>

        {params.message && (
          <div className="mb-6 text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-md p-3 text-center">
            {params.message}
          </div>
        )}

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-slate-700">
          <SignInForm callbackUrl={params.callbackUrl} />
          
          <div className="mt-6 text-center">
            <p className="text-slate-400">
              Don&apos;t have an account?{' '}
              <Link 
                href="/auth/signup" 
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="text-slate-400 hover:text-slate-300 text-sm"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}