interface RecIndicatorProps {
  visible: boolean
}

export function RecIndicator({ visible }: RecIndicatorProps) {
  if (!visible) return null
  return (
    <div className="rec-indicator" aria-live="polite">
      <span className="rec-indicator__dot" />
      REC
    </div>
  )
}
