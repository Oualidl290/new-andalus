'use client'

import { type Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link,
  Image,

} from 'lucide-react'
import { useState } from 'react'

interface EditorToolbarProps {
  editor: Editor
  onAddImage: (url: string, alt?: string) => void
  onAddLink: (url: string) => void
}

export function EditorToolbar({ editor, onAddImage, onAddLink }: EditorToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [showImageInput, setShowImageInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')

  const handleAddLink = () => {
    if (linkUrl) {
      onAddLink(linkUrl)
      setLinkUrl('')
      setShowLinkInput(false)
    }
  }

  const handleAddImage = () => {
    if (imageUrl) {
      onAddImage(imageUrl, imageAlt)
      setImageUrl('')
      setImageAlt('')
      setShowImageInput(false)
    }
  }

  return (
    <div className="border-b border-slate-300 p-2 bg-slate-50">
      <div className="flex flex-wrap items-center gap-1">
        {/* Text formatting */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-slate-200' : ''}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-slate-200' : ''}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'bg-slate-200' : ''}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'bg-slate-200' : ''}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Headings */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-slate-200' : ''}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-slate-200' : ''}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-slate-200' : ''}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Lists */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-slate-200' : ''}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-slate-200' : ''}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-slate-200' : ''}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Media */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLinkInput(!showLinkInput)}
          title="Add Link"
        >
          <Link className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowImageInput(!showImageInput)}
          title="Add Image"
        >
          <Image className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Link input */}
      {showLinkInput && (
        <div className="mt-2 p-2 bg-white border border-slate-200 rounded flex items-center gap-2">
          <input
            type="url"
            placeholder="Enter URL..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddLink()
              } else if (e.key === 'Escape') {
                setShowLinkInput(false)
                setLinkUrl('')
              }
            }}
            autoFocus
          />
          <Button size="sm" onClick={handleAddLink} disabled={!linkUrl}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowLinkInput(false)
              setLinkUrl('')
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Image input */}
      {showImageInput && (
        <div className="mt-2 p-2 bg-white border border-slate-200 rounded">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="url"
              placeholder="Image URL..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Alt text (optional)..."
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddImage()
                } else if (e.key === 'Escape') {
                  setShowImageInput(false)
                  setImageUrl('')
                  setImageAlt('')
                }
              }}
            />
            <Button size="sm" onClick={handleAddImage} disabled={!imageUrl}>
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowImageInput(false)
                setImageUrl('')
                setImageAlt('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}