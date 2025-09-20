'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SimpleSelect as Select } from '@/components/ui/select'
import { X, UserPlus } from 'lucide-react'

interface CreateUserButtonProps {
  children: React.ReactNode
}

interface CreateUserFormData {
  name: string
  email: string
  password: string
  role: 'admin' | 'editor' | 'reader'
}

export function CreateUserButton({ children }: CreateUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CreateUserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'editor'
  })
  const [errors, setErrors] = useState<Partial<CreateUserFormData>>({})

  const handleClick = () => {
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'editor'
    })
    setErrors({})
  }

  const validateForm = () => {
    const newErrors: Partial<CreateUserFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create user')
      }

      // Success - close modal and refresh page
      handleClose()
      window.location.reload()
    } catch (error) {
      console.error('Error creating user:', error)
      alert(error instanceof Error ? error.message : 'Failed to create user')
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: keyof CreateUserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <>
      <div onClick={handleClick}>
        {children}
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isLoading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="Enter full name"
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="Enter email address"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  placeholder="Enter password (min 6 characters)"
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => updateFormData('role', value as 'admin' | 'editor' | 'reader')}
                >
                  <option value="reader">Reader</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.role === 'admin' && 'Full access to all features'}
                  {formData.role === 'editor' && 'Can create and manage articles'}
                  {formData.role === 'reader' && 'Read-only access'}
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}