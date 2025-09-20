import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root: Element | Document | null = null
  rootMargin: string = '0px'
  thresholds: ReadonlyArray<number> = []

  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url')
global.URL.revokeObjectURL = vi.fn()

// Mock fetch
global.fetch = vi.fn()

// Mock Image constructor
global.Image = class {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  naturalWidth = 0
  naturalHeight = 0
} as any