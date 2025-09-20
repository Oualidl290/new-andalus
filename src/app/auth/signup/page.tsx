import Link from 'next/link'
import { SignUpForm } from '@/components/auth/signup-form'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Join New Andalus</h1>
          <p className="text-slate-300">Create your account to start publishing</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-slate-700">
          <SignUpForm />
          
          <div className="mt-6 text-center">
            <p className="text-slate-400">
              Already have an account?{' '}
              <Link 
                href="/auth/signin" 
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Sign in
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