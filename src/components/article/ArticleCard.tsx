import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDefaultFeaturedImage, calculateReadingTime } from '@/lib/utils/article'
import type { Article } from '@/lib/db'

interface ArticleCardProps {
  article: Article & { author?: { name: string; avatarUrl?: string | null } }
  variant?: 'default' | 'featured' | 'compact'
  className?: string
}

export function ArticleCard({ article, variant = 'default', className }: ArticleCardProps) {
  const featuredImage = (article.featuredImage as { url: string; alt: string; width: number; height: number } | null) || getDefaultFeaturedImage()
  const readingTime = calculateReadingTime(article.content)
  const publishedDate = article.publishedAt ? new Date(article.publishedAt) : new Date()

  const cardVariants = {
    default: 'group cursor-pointer transition-all duration-200 hover:shadow-lg',
    featured: 'group cursor-pointer transition-all duration-200 hover:shadow-xl bg-gradient-to-br from-slate-50 to-white border-2 border-slate-100',
    compact: 'group cursor-pointer transition-all duration-200 hover:bg-slate-50',
  }

  const imageVariants = {
    default: 'aspect-[16/9] w-full',
    featured: 'aspect-[21/9] w-full',
    compact: 'aspect-square w-20 flex-shrink-0',
  }

  return (
    <Link href={`/articles/${article.slug}`} className="block">
      <article className={cn(cardVariants[variant], className)}>
        {variant === 'compact' ? (
          // Compact layout - horizontal
          <div className="flex gap-4 p-4">
            <div className={cn('relative overflow-hidden rounded-lg', imageVariants[variant])}>
              <Image
                src={featuredImage.url}
                alt={featuredImage.alt}
                fill
                className="object-cover transition-transform duration-200 group-hover:scale-105"
                sizes="80px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-2 text-slate-900 group-hover:text-blue-600 transition-colors">
                {article.title}
              </h3>
              {article.excerpt && (
                <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                  {article.excerpt}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                <span>{readingTime} min read</span>
                <span>•</span>
                <span>{formatDistanceToNow(publishedDate, { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        ) : (
          // Default and featured layouts - vertical
          <div className={cn('overflow-hidden rounded-lg', variant === 'featured' ? 'p-6' : '')}>
            <div className={cn('relative overflow-hidden rounded-lg', imageVariants[variant])}>
              <Image
                src={featuredImage.url}
                alt={featuredImage.alt}
                fill
                className="object-cover transition-transform duration-200 group-hover:scale-105"
                sizes={variant === 'featured' ? '(max-width: 768px) 100vw, 800px' : '(max-width: 768px) 100vw, 400px'}
                priority={variant === 'featured'}
              />
            </div>
            
            <div className={cn('p-6', variant === 'featured' ? 'pt-6' : '')}>
              <h2 className={cn(
                'font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2',
                variant === 'featured' ? 'text-2xl mb-3' : 'text-xl mb-2'
              )}>
                {article.title}
              </h2>
              
              {article.excerpt && (
                <p className={cn(
                  'text-slate-600 line-clamp-3 mb-4',
                  variant === 'featured' ? 'text-base' : 'text-sm'
                )}>
                  {article.excerpt}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {article.author && (
                    <div className="flex items-center gap-2">
                      {article.author.avatarUrl ? (
                        <Image
                          src={article.author.avatarUrl}
                          alt={article.author.name}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-600" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-700">
                        {article.author.name}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{readingTime} min</span>
                  </div>
                  <span>{formatDistanceToNow(publishedDate, { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </article>
    </Link>
  )
}