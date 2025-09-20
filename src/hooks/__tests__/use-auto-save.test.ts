import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoSave, useAutoSaveOnChange } from '../use-auto-save'

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with correct default state', () => {
    const mockOnSave = vi.fn()
    const { result } = renderHook(() =>
      useAutoSave({ onSave: mockOnSave })
    )

    expect(result.current.isSaving).toBe(false)
    expect(result.current.lastSaved).toBe(null)
    expect(result.current.saveStatus).toBe('idle')
  })

  it('should trigger save manually', async () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useAutoSave({ onSave: mockOnSave })
    )

    await act(async () => {
      result.current.triggerSave()
    })

    expect(mockOnSave).toHaveBeenCalledTimes(1)
    expect(result.current.saveStatus).toBe('saved')
    expect(result.current.lastSaved).toBeInstanceOf(Date)
  })

  it('should handle save errors', async () => {
    const mockOnSave = vi.fn().mockRejectedValue(new Error('Save failed'))
    const { result } = renderHook(() =>
      useAutoSave({ onSave: mockOnSave })
    )

    await act(async () => {
      result.current.triggerSave()
    })

    expect(result.current.saveStatus).toBe('error')
  })

  it('should not save when disabled', async () => {
    const mockOnSave = vi.fn()
    const { result } = renderHook(() =>
      useAutoSave({ onSave: mockOnSave, enabled: false })
    )

    await act(async () => {
      result.current.triggerSave()
    })

    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('should prevent concurrent saves', async () => {
    const mockOnSave = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)))
    const { result } = renderHook(() =>
      useAutoSave({ onSave: mockOnSave })
    )

    // Start first save
    act(() => {
      result.current.triggerSave()
    })

    expect(result.current.isSaving).toBe(true)

    // Try to start second save while first is in progress
    act(() => {
      result.current.triggerSave()
    })

    // Should only be called once
    expect(mockOnSave).toHaveBeenCalledTimes(1)
  })
})

describe('useAutoSaveOnChange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should trigger save after delay when value changes', async () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined)
    let value = 'initial'

    const { result, rerender } = renderHook(() =>
      useAutoSaveOnChange(value, {
        onSave: mockOnSave,
        delay: 1000,
        enabled: true,
      })
    )

    // Change value
    value = 'changed'
    rerender()

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Wait for async save to complete
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockOnSave).toHaveBeenCalledTimes(1)
  })

  it('should not trigger save when value does not change', () => {
    const mockOnSave = vi.fn()
    const value = 'unchanged'

    renderHook(() =>
      useAutoSaveOnChange(value, {
        onSave: mockOnSave,
        delay: 1000,
        enabled: true,
      })
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('should not trigger save when disabled', () => {
    const mockOnSave = vi.fn()
    let value = 'initial'

    const { rerender } = renderHook(() =>
      useAutoSaveOnChange(value, {
        onSave: mockOnSave,
        delay: 1000,
        enabled: false,
      })
    )

    value = 'changed'
    rerender()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('should debounce multiple rapid changes', async () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined)
    let value = 'initial'

    const { rerender } = renderHook(() =>
      useAutoSaveOnChange(value, {
        onSave: mockOnSave,
        delay: 1000,
        enabled: true,
      })
    )

    // Make multiple rapid changes
    value = 'change1'
    rerender()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    value = 'change2'
    rerender()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    value = 'change3'
    rerender()

    // Complete the delay
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    await act(async () => {
      await Promise.resolve()
    })

    // Should only save once for the final value
    expect(mockOnSave).toHaveBeenCalledTimes(1)
  })
})