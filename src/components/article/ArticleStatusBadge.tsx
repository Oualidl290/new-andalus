import { cn } from '@/lib/utils'

interface ArticleStatusBadgeProps {
  status: 'draft' | 'published' | 'archived'
  className?: string
}

export function ArticleStatusBadge({ status, className }: ArticleStatusBadgeProps) {
  const statusConfig = {
    draft: {
      label: 'Draft',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    published: {
      label: 'Published',
      className: 'bg-green-100 text-green-800 border-green-200',
    },
    archived: {
      label: 'Archived',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
    },
  }

  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}