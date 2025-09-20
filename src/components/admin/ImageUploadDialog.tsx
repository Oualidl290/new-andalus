interface ImageUploadDialogProps {
  children: React.ReactNode
  onUpload: (image: { url: string; alt: string; width: number; height: number }) => void
}

export function ImageUploadDialog({ children, onUpload }: ImageUploadDialogProps) {
  const handleClick = () => {
    // TODO: Implement image upload functionality
    // For now, just call onUpload with a placeholder
    onUpload({
      url: '/placeholder-image.jpg',
      alt: 'Placeholder image',
      width: 800,
      height: 600,
    })
  }

  return (
    <div onClick={handleClick}>
      {children}
    </div>
  )
}