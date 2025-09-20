'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function UserMenu() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (status === 'loading') {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-20 bg-slate-700 rounded"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex gap-2">
        <Button variant="ghost" asChild>
          <Link href="/auth/signin">Sign In</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/signup">Sign Up</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {session.user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <span className="text-white">{session.user?.name}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-gray-400 border-b border-slate-700">
              {session.user?.email}
              <div className="text-xs text-blue-400 capitalize">{session.user?.role}</div>
            </div>
            
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Profile
            </Link>
            
            {(session.user?.role === 'admin' || session.user?.role === 'editor') && (
              <Link
                href="/admin"
                className="block px-4 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Admin Dashboard
              </Link>
            )}
            
            <button
              onClick={() => {
                setIsOpen(false)
                signOut({ callbackUrl: '/' })
              }}
              className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}