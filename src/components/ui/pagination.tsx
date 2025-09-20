import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  hasNext: boolean
  basePath?: string
  className?: string
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  hasNext, 
  basePath = '/articles',
  className 
}: PaginationProps) {
  const hasPrevious = currentPage > 1

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const showPages = 5 // Number of page buttons to show
    
    if (totalPages <= showPages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show pages with ellipsis
      if (currentPage <= 3) {
        // Show first pages
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Show last pages
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Show middle pages
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <nav className={cn('flex items-center justify-center space-x-2', className)}>
      {/* Previous Button */}
      {hasPrevious ? (
        <Link href={`${basePath}?page=${currentPage - 1}`}>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
      )}

      {/* Page Numbers */}
      <div className="flex items-center space-x-1">
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                ...
              </span>
            )
          }

          const pageNumber = page as number
          const isCurrentPage = pageNumber === currentPage

          return (
            <Link key={pageNumber} href={`${basePath}?page=${pageNumber}`}>
              <Button
                variant={isCurrentPage ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'min-w-[40px]',
                  isCurrentPage && 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                {pageNumber}
              </Button>
            </Link>
          )
        })}
      </div>

      {/* Next Button */}
      {hasNext ? (
        <Link href={`${basePath}?page=${currentPage + 1}`}>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </nav>
  )
}