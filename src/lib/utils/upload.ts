/**
 * Upload an image file to the server
 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Upload failed')
  }

  const result = await response.json()
  return result.url
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.',
    }
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size too large. Maximum size is 5MB.',
    }
  }

  return { isValid: true }
}

/**
 * Generate optimized image metadata
 */
export function generateImageMetadata(file: File, url: string) {
  return new Promise<{ url: string; alt: string; width: number; height: number }>((resolve) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({
        url,
        alt: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for alt text
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
    
    img.onerror = () => {
      // Fallback if image can't be loaded
      resolve({
        url,
        alt: file.name.replace(/\.[^/.]+$/, ''),
        width: 0,
        height: 0,
      })
    }
    
    img.src = url
  })
}

/**
 * Compress image before upload (client-side)
 */
export function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            resolve(file) // Fallback to original file
          }
        },
        file.type,
        quality
      )
    }

    img.onerror = () => resolve(file) // Fallback to original file
    img.src = URL.createObjectURL(file)
  })
}