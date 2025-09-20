'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface ImageMetadata {
  url: string
  alt: string
  width: number
  height: number
}

interface ImageUploadDialogProps {
  onUpload?: (image: ImageMetadata) => void
  children: React.ReactNode
}

export function ImageUploadDialog({ onUpload, children }: ImageUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [altText, setAltText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size must be less than 5MB')
      return
    }

    setIsUploading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to server
      const uploadedUrl = await uploadImageToServer(file)
      
      if (uploadedUrl && onUpload) {
        onUpload({
          url: uploadedUrl,
          alt: altText,
          width: 800, // Default width
          height: 600 // Default height
        })
        resetDialog()
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // Upload image to server
  const uploadImageToServer = async (file: File): Promise<string> => {
    const { uploadImage } = await import('@/lib/utils/upload')
    return uploadImage(file)
  }

  const resetDialog = () => {
    setIsOpen(false)
    setPreview(null)
    setAltText('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!isOpen) {
    return (
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Upload Image</h3>
          <Button variant="ghost" size="sm" onClick={resetDialog}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!preview ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <ImageIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">
              Drag and drop an image here, or click to select
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Select Image'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
            <p className="text-xs text-slate-500 mt-2">
              Supports JPG, PNG, GIF up to 5MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Alt Text (for accessibility)
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (preview && onUpload) {
                    onUpload({
                      url: preview,
                      alt: altText,
                      width: 800,
                      height: 600
                    })
                    resetDialog()
                  }
                }}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? 'Uploading...' : 'Insert Image'}
              </Button>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}