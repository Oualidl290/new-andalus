'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useCallback, useEffect } from 'react'
import { EditorToolbar } from './editor-toolbar'
import { ImageUploadDialog } from './image-upload-dialog'
import type { JSONContent } from '@/types'

interface RichTextEditorProps {
  content?: JSONContent
  onChange?: (content: JSONContent) => void
  onSave?: () => void
  placeholder?: string
  editable?: boolean
  className?: string
  autoSave?: boolean
  autoSaveDelay?: number
}

export function RichTextEditor({
  content,
  onChange,
  onSave,
  placeholder = 'Start writing your article...',
  editable = true,
  className = '',
  autoSave = false,
  autoSaveDelay = 2000,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: 50000, // 50k character limit
      }),
    ],
    content: content || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    },
    editable,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as JSONContent
      onChange?.(json)
    },
  })

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !editor || !onSave) return

    const timer = setTimeout(() => {
      onSave()
    }, autoSaveDelay)

    return () => clearTimeout(timer)
  }, [editor?.getJSON(), autoSave, autoSaveDelay, onSave])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + S for save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        onSave?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onSave])

  const addImage = useCallback(
    (url: string, alt?: string) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url, alt }).run()
      }
    },
    [editor]
  )

  const addLink = useCallback(
    (url: string) => {
      if (editor) {
        editor.chain().focus().setLink({ href: url }).run()
      }
    },
    [editor]
  )

  if (!editor) {
    return (
      <div className="border border-slate-300 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
        <div className="text-slate-500">Loading editor...</div>
      </div>
    )
  }

  const characterCount = editor.storage.characterCount.characters()
  const wordCount = editor.storage.characterCount.words()

  return (
    <div className={`border border-slate-300 rounded-lg overflow-hidden ${className}`}>
      {editable && (
        <EditorToolbar
          editor={editor}
          onAddImage={addImage}
          onAddLink={addLink}
        />
      )}
      
      <div className="relative">
        <EditorContent
          editor={editor}
          className="prose prose-slate max-w-none p-4 min-h-[400px] focus-within:outline-none"
        />
        
        {editable && (
          <div className="absolute bottom-2 right-2 text-xs text-slate-500 bg-white/80 backdrop-blur-sm px-2 py-1 rounded">
            {wordCount} words, {characterCount} characters
          </div>
        )}
      </div>

      <ImageUploadDialog onUpload={(image) => addImage(image.url, image.alt)}>
        <button type="button" className="hidden">Upload</button>
      </ImageUploadDialog>
    </div>
  )
}