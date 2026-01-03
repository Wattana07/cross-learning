import { useEffect, useState } from 'react'
import { cn, getInitials } from '@/lib/utils'
import { getAvatarUrl } from '@/lib/storage'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAvatar() {
      if (!src) {
        setLoading(false)
        return
      }

      // If src is already a full URL, use it directly
      if (src.startsWith('http://') || src.startsWith('https://')) {
        setImageUrl(src)
        setLoading(false)
        return
      }

      // If src is a storage path, get signed URL
      try {
        const url = await getAvatarUrl(src)
        setImageUrl(url)
      } catch (error) {
        console.error('Error loading avatar:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAvatar()
  }, [src])

  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  }

  const initials = name ? getInitials(name) : '?'

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gray-200 animate-pulse',
          sizes[size],
          className
        )}
      />
    )
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || 'Avatar'}
        className={cn(
          'rounded-full object-cover',
          sizes[size],
          className
        )}
        onError={() => setImageUrl(null)} // Fallback to initials on error
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary-100 font-medium text-primary-700',
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
