interface BlobsProps {
  className?: string
  /** show softer/lighter blobs on light sections */
  variant?: 'light' | 'dark'
}

/**
 * Decorative animated gradient "blobs" that drift slowly in the background.
 * Purely cosmetic, non-interactive - gives sections a modern, alive feel.
 */
export default function Blobs({ className = '', variant = 'light' }: BlobsProps) {
  const opacity = variant === 'dark' ? 'opacity-40' : 'opacity-[0.18]'
  return (
    <div className={`pointer-events-none absolute inset-0 -z-0 overflow-hidden ${className}`} aria-hidden>
      <div
        className={`absolute -left-24 top-0 h-72 w-72 rounded-full bg-doner-red blur-3xl ${opacity} animate-blob`}
      />
      <div
        className={`absolute right-0 top-1/3 h-80 w-80 rounded-full bg-amber-brand blur-3xl ${opacity} animate-blob`}
        style={{ animationDelay: '3s' }}
      />
      <div
        className={`absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-doner-red-soft blur-3xl ${opacity} animate-blob`}
        style={{ animationDelay: '6s' }}
      />
    </div>
  )
}
