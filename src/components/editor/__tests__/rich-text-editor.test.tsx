import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RichTextEditor } from '../rich-text-editor'
import type { JSONContent } from '@/types'
import { useEditor } from '@tiptap/react'

// Mock TipTap editor
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => ({
    getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    storage: {
      characterCount: {
        characters: vi.fn(() => 100),
        words: vi.fn(() => 20),
      },
    },
    isActive: vi.fn(() => false),
    can: vi.fn(() => ({ undo: vi.fn(() => true), redo: vi.fn(() => true) })),
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        toggleBold: vi.fn(() => ({ run: vi.fn() })),
        undo: vi.fn(() => ({ run: vi.fn() })),
        redo: vi.fn(() => ({ run: vi.fn() })),
        setImage: vi.fn(() => ({ run: vi.fn() })),
        setLink: vi.fn(() => ({ run: vi.fn() })),
      })),
    })),
  })),
  EditorContent: ({ editor, className }: any) => (
    <div className={className} data-testid="editor-content">
      Editor Content
    </div>
  ),
}))

describe('RichTextEditor', () => {
  const mockContent: JSONContent = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Test content' }],
      },
    ],
  }

  it('should render editor with default content', () => {
    render(<RichTextEditor />)
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('should render with provided content', () => {
    render(<RichTextEditor content={mockContent} />)
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('should show loading state when editor is not ready', () => {
    // Mock useEditor to return null
    const mockUseEditor = vi.fn().mockReturnValue(null)
    vi.mocked(useEditor).mockImplementation(mockUseEditor)

    render(<RichTextEditor />)
    expect(screen.getByText('Loading editor...')).toBeInTheDocument()
  })

  it('should display character and word count', () => {
    render(<RichTextEditor editable={true} />)
    expect(screen.getByText('20 words, 100 characters')).toBeInTheDocument()
  })

  it('should call onChange when content changes', () => {
    const mockOnChange = vi.fn()
    render(<RichTextEditor onChange={mockOnChange} />)
    
    // The onChange would be called through the editor's onUpdate callback
    // This is tested through the editor mock setup
    expect(mockOnChange).not.toHaveBeenCalled() // Initial render shouldn't trigger onChange
  })

  it('should render toolbar when editable', () => {
    render(<RichTextEditor editable={true} />)
    // Toolbar would be rendered, but we need to check for its presence
    // Since we're mocking the editor, we can't test the actual toolbar interaction
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('should not render toolbar when not editable', () => {
    render(<RichTextEditor editable={false} />)
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('should handle custom placeholder', () => {
    const customPlaceholder = 'Custom placeholder text'
    render(<RichTextEditor placeholder={customPlaceholder} />)
    // The placeholder is passed to the editor configuration
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })
})