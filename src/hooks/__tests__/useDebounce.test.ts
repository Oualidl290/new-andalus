import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '../useDebounce'

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    
    expect(result.current).toBe('initial')
  })

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    expect(result.current).toBe('initial')

    // Change the value
    rerender({ value: 'updated', delay: 500 })

    // Value should not change immediately
    expect(result.current).toBe('initial')

    // Fast-forward time by 250ms (less than delay)
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Value should still be the initial value
    expect(result.current).toBe('initial')

    // Fast-forward time by another 250ms (total 500ms)
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Now the value should be updated
    expect(result.current).toBe('updated')
  })

  it('should reset the timer when value changes before delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // Change the value
    rerender({ value: 'first-update', delay: 500 })

    // Fast-forward time by 250ms
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Change the value again before the delay completes
    rerender({ value: 'second-update', delay: 500 })

    // Fast-forward time by 250ms (total 500ms from first change, 250ms from second)
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Value should still be initial because the timer was reset
    expect(result.current).toBe('initial')

    // Fast-forward time by another 250ms (total 500ms from second change)
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Now the value should be the second update
    expect(result.current).toBe('second-update')
  })

  it('should work with different data types', () => {
    // Test with numbers
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 300 } }
    )

    numberRerender({ value: 42, delay: 300 })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(numberResult.current).toBe(42)

    // Test with objects
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: { id: 1 }, delay: 300 } }
    )

    const newObject = { id: 2, name: 'test' }
    objectRerender({ value: newObject, delay: 300 })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(objectResult.current).toBe(newObject)
  })

  it('should handle delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // Change the value and delay
    rerender({ value: 'updated', delay: 1000 })

    // Fast-forward by 500ms (original delay)
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Value should still be initial because delay was increased
    expect(result.current).toBe('initial')

    // Fast-forward by another 500ms (total 1000ms)
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Now the value should be updated
    expect(result.current).toBe('updated')
  })

  it('should clean up timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    
    const { unmount } = renderHook(() => useDebounce('test', 500))

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    
    clearTimeoutSpy.mockRestore()
  })
})