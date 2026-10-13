import { useState } from 'react'

import { cn } from '../utils/cn'
import { mediaUrl } from '../utils/media'
import { BrandIcon } from './ui/Logo'

/** Foto do produto; sem foto (ou com link quebrado) mostra o ícone da marca. */
export function ProductImage({ src, alt, className, iconClassName = 'h-1/3' }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center bg-muted', className)}>
        <BrandIcon className={cn('opacity-40', iconClassName)} />
      </div>
    )
  }

  return (
    <img
      src={mediaUrl(src)}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  )
}