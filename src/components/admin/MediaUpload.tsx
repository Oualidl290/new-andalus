'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface MediaUploadProps {
  children: React.ReactNode
  onUpload?: (files: File[]) => void
  accept?: string
  multiple?: boolean
}

export function MediaUpload({ 
  children, 
  onUpload,
  accept = "image/*",
  multiple = true 
}: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    
    const fileArray = Array.from(files)
    setUploadedFiles(prev => [...prev, ...fileArray])
    
    if (onUpload) {
      onUpload(fileArray)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (uploadedFiles.length === 0) return

    setIsUploading(true)
    try {
      const uploadPromises = uploadedFiles.map(async (file) => {
        const formData = new FormData()
        formData.append('image', file)

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error?.message || 'Upload failed')
        }

        return response.json()
      })

      const results = await Promise.all(uploadPromises)
      
      // Clear uploaded files after successful upload
      setUploadedFiles([])
      
      // Show success message
      alert(`Successfully uploaded ${results.length} file(s)`)
      
      // Refresh the page to show new files
      window.location.reload()
    } catch (error) {
      console.error('Upload failed:', error)
      alert(error instanceof Error ? error.message : 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <div onClick={handleClick}>
        {children}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Upload Area */}
      {uploadedFiles.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Media Files</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUploadedFiles([])}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleClick}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Drop files here or click to select
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports: JPG, PNG, GIF, WebP (max 10MB each)
              </p>
            </div>

            {/* File Preview */}
            <div className="space-y-2 mb-4">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Upload Button */}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setUploadedFiles([])}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={uploadFiles}
                disabled={isUploading || uploadedFiles.length === 0}
              >
                {isUploading ? 'Uploading...' : `Upload ${uploadedFiles.length} file(s)`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}