export function AtlasLogo({ className = "size-8", showText = false }: { className?: string; showText?: boolean }) {
  if (showText) {
    return (
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" className={className}>
          <path
            d="M 92 72 C 142.81 72 184 113.19 184 164 C 184 214.81 142.81 256 92 256 C 41.19 256 0 214.81 0 164 C 0 113.19 41.19 72 92 72 Z M 256 0 L 256 256 L 184 256 L 184 72 L 0 72 L 0 0 Z"
            className="fill-primary"
          />
        </svg>
        <span className="font-bold text-xl">
          <span className="text-accent">at</span>
          <span className="text-primary">las</span>
        </span>
      </div>
    )
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" className={className}>
      <path
        d="M 92 72 C 142.81 72 184 113.19 184 164 C 184 214.81 142.81 256 92 256 C 41.19 256 0 214.81 0 164 C 0 113.19 41.19 72 92 72 Z M 256 0 L 256 256 L 184 256 L 184 72 L 0 72 L 0 0 Z"
        className="fill-primary"
      />
    </svg>
  )
}
