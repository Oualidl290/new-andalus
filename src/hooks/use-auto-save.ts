'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseAutoSaveOptions {
  delay?: number
  onSave: () => Promise<void> | void
  enabled?: boolean
}

interface UseAutoSaveReturn {
  isSaving: boolean
  lastSaved: Date | null
  triggerSave: () => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

export function useAutoSave({
  delay = 2000,
  onSave,
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const savePromiseRef = useRef<Promise<void> | null>(null)

  const triggerSave = useCallback(async () => {
    if (!enabled || isSaving) return

    // Clear any pending auto-save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      const savePromise = Promise.resolve(onSave())
      savePromiseRef.current = savePromise
      await savePromise

      // Only update state if this is still the current save operation
      if (savePromiseRef.current === savePromise) {
        setLastSaved(new Date())
        setSaveStatus('saved')
        
        // Reset to idle after showing saved status
        setTimeout(() => {
          setSaveStatus('idle')
        }, 2000)
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
      setSaveStatus('error')
      
      // Reset to idle after showing error status
      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
    } finally {
      setIsSaving(false)
    }
  }, [enabled, isSaving, onSave])

  const scheduleAutoSave = useCallback(() => {
    if (!enabled) return

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Schedule new save
    timeoutRef.current = setTimeout(() => {
      triggerSave()
    }, delay)
  }, [enabled, delay, triggerSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    isSaving,
    lastSaved,
    triggerSave,
    saveStatus,
  }
}

// Hook for debounced auto-save that triggers on content changes
export function useAutoSaveOnChange(
  value: unknown,
  options: UseAutoSaveOptions
): UseAutoSaveReturn {
  const autoSave = useAutoSave(options)
  const previousValueRef = useRef(value)

  useEffect(() => {
    // Only trigger auto-save if value actually changed
    if (previousValueRef.current !== value && options.enabled) {
      // Clear any pending auto-save
      if (autoSave.saveStatus === 'saving') return

      // Schedule auto-save
      const timeoutId = setTimeout(() => {
        autoSave.triggerSave()
      }, options.delay || 2000)

      previousValueRef.current = value

      return () => clearTimeout(timeoutId)
    }
  }, [value, options.enabled, options.delay, autoSave])

  return autoSave
}