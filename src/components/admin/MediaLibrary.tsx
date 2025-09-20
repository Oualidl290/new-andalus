'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SimpleSelect as Select } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { 
  Search, 
  Grid, 
  List, 
  Download, 
  Trash2, 
  Eye,
  MoreHorizontal,
  Image as ImageIcon,
  File
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MediaLibraryProps {
  page: number
  type: string
  search: string
}

// Mock data for demonstration
const mockMediaFiles = [
  {
    id: '1',
    name: 'hero-image.jpg',
    url: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400',
    type: 'image/jpeg',
    size: 2.4 * 1024 * 1024, // 2.4 MB
    uploadedAt: new Date('2024-01-15'),
    dimensions: { width: 1920, height: 1080 }
  },
  {
    id: '2',
    name: 'article-thumbnail.png',
    url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400',
    type: 'image/png',
    size: 1.8 * 1024 * 1024, // 1.8 MB
    uploadedAt: new Date('2024-01-14'),
    dimensions: { width: 1200, height: 800 }
  },
  {
    id: '3',
    name: 'document.pdf',
    url: '/documents/sample.pdf',
    type: 'application/pdf',
    size: 0.5 * 1024 * 1024, // 0.5 MB
    uploadedAt: new Date('2024-01-13'),
    dimensions: null
  },
  {
    id: '4',
    name: 'profile-photo.jpg',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    type: 'image/jpeg',
    size: 1.2 * 1024 * 1024, // 1.2 MB
    uploadedAt: new Date('2024-01-12'),
    dimensions: { width: 800, height: 800 }
  }
]

export function MediaLibrary({ page, type, search }: MediaLibraryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const isImage = (mimeType: string) => mimeType.startsWith('image/')

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const handleBulkDelete = () => {
    if (selectedFiles.length === 0) return
    
    const confirmed = confirm(`Delete ${selectedFiles.length} selected file(s)?`)
    if (confirmed) {
      // TODO: Implement bulk delete
      setSelectedFiles([])
      alert('Files deleted successfully')
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search media files..."
                defaultValue={search}
                className="pl-10"
              />
            </div>
            
            <Select value={type} onValueChange={() => {}}>
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="document">Documents</option>
              <option value="video">Videos</option>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            {selectedFiles.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedFiles.length})
              </Button>
            )}
            
            <div className="flex border border-gray-200 rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Media Grid/List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {viewMode === 'grid' ? (
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {mockMediaFiles.map((file) => (
                <div
                  key={file.id}
                  className={`relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedFiles.includes(file.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleFileSelection(file.id)}
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    {isImage(file.type) ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <File className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="secondary">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="secondary">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFiles(mockMediaFiles.map(f => f.id))
                        } else {
                          setSelectedFiles([])
                        }
                      }}
                      checked={selectedFiles.length === mockMediaFiles.length}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mockMediaFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {isImage(file.type) ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                              <File className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {file.name}
                          </div>
                          {file.dimensions && (
                            <div className="text-sm text-gray-500">
                              {file.dimensions.width} × {file.dimensions.height}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {file.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {file.uploadedAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200">
          <Pagination
            currentPage={page}
            totalPages={3}
            hasNext={page < 3}
          />
        </div>
      </div>
    </div>
  )
}