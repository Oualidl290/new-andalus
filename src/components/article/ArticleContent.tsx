import { cn } from '@/lib/utils'
import type { JSONContent, ContentNode } from '@/types'

interface ArticleContentProps {
  content: JSONContent | unknown
  className?: string
}

export function ArticleContent({ content, className }: ArticleContentProps) {
  if (!content || typeof content !== 'object') {
    return (
      <div className={cn('prose prose-lg max-w-none', className)}>
        <p className="text-gray-500 italic">No content available</p>
      </div>
    )
  }

  const jsonContent = content as JSONContent

  return (
    <div className={cn('prose prose-lg max-w-none', className)}>
      {jsonContent.content?.map((node, index) => (
        <ContentNodeRenderer key={index} node={node} />
      ))}
    </div>
  )
}

interface ContentNodeRendererProps {
  node: ContentNode
}

function ContentNodeRenderer({ node }: ContentNodeRendererProps) {
  switch (node.type) {
    case 'paragraph':
      return (
        <p className="mb-4 leading-relaxed text-gray-800">
          {node.content?.map((child, index) => (
            <InlineContentRenderer key={index} node={child} />
          ))}
        </p>
      )

    case 'heading':
      const level = (node.attrs as Record<string, unknown>)?.level as number || 1
      const HeadingTag = `h${Math.min(level, 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      
      return (
        <HeadingTag className={cn(
          'font-bold text-gray-900 mt-8 mb-4',
          level === 1 && 'text-3xl',
          level === 2 && 'text-2xl',
          level === 3 && 'text-xl',
          level >= 4 && 'text-lg'
        )}>
          {node.content?.map((child, index) => (
            <InlineContentRenderer key={index} node={child} />
          ))}
        </HeadingTag>
      )

    case 'bulletList':
      return (
        <ul className="list-disc list-inside mb-4 space-y-2">
          {node.content?.map((child, index) => (
            <ContentNodeRenderer key={index} node={child} />
          ))}
        </ul>
      )

    case 'orderedList':
      return (
        <ol className="list-decimal list-inside mb-4 space-y-2">
          {node.content?.map((child, index) => (
            <ContentNodeRenderer key={index} node={child} />
          ))}
        </ol>
      )

    case 'listItem':
      return (
        <li className="text-gray-800">
          {node.content?.map((child, index) => (
            <ContentNodeRenderer key={index} node={child} />
          ))}
        </li>
      )

    case 'blockquote':
      return (
        <blockquote className="border-l-4 border-blue-500 pl-6 py-2 mb-4 italic text-gray-700 bg-gray-50 rounded-r">
          {node.content?.map((child, index) => (
            <ContentNodeRenderer key={index} node={child} />
          ))}
        </blockquote>
      )

    case 'codeBlock':
      const language = (node.attrs as Record<string, unknown>)?.language as string || 'text'
      return (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <code className={`language-${language}`}>
            {node.content?.map((child, index) => (
              <InlineContentRenderer key={index} node={child} />
            ))}
          </code>
        </pre>
      )

    case 'horizontalRule':
      return <hr className="my-8 border-gray-300" />

    case 'image':
      const attrs = node.attrs as Record<string, unknown> | undefined
      const src = attrs?.src as string
      const alt = (attrs?.alt as string) || ''
      const title = attrs?.title as string
      
      if (!src) return null
      
      return (
        <figure className="my-8">
          <img
            src={src}
            alt={alt}
            title={title}
            className="w-full rounded-lg shadow-sm"
          />
          {title && (
            <figcaption className="text-sm text-gray-600 text-center mt-2 italic">
              {title}
            </figcaption>
          )}
        </figure>
      )

    default:
      // Fallback for unknown node types
      return (
        <div className="mb-4">
          {node.content?.map((child, index) => (
            <ContentNodeRenderer key={index} node={child} />
          ))}
        </div>
      )
  }
}

interface InlineContentRendererProps {
  node: ContentNode
}

function InlineContentRenderer({ node }: InlineContentRendererProps) {
  if (node.type === 'text') {
    const content = node.text || ''
    
    // Apply text formatting based on marks
    const nodeWithMarks = node as ContentNode & { marks?: Array<Record<string, unknown>> }
    const marks = nodeWithMarks.marks || []
    
    let element = <span>{content}</span>
    
    marks.forEach((mark: Record<string, unknown>) => {
      switch (mark.type) {
        case 'bold':
          element = <strong className="font-semibold">{element}</strong>
          break
        case 'italic':
          element = <em className="italic">{element}</em>
          break
        case 'code':
          element = <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{element}</code>
          break
        case 'link':
          const href = (mark.attrs as Record<string, unknown>)?.href as string
          if (href) {
            element = (
              <a 
                href={href} 
                className="text-blue-600 hover:text-blue-800 underline"
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {element}
              </a>
            )
          }
          break
      }
    })
    
    return element
  }

  // Handle other inline node types
  return (
    <span>
      {node.content?.map((child, index) => (
        <InlineContentRenderer key={index} node={child} />
      ))}
    </span>
  )
}