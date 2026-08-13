interface EmptyHintProps {
  visible: boolean
}

export function EmptyHint({ visible }: EmptyHintProps) {
  if (!visible) return null
  return (
    <div className="empty-hint" aria-hidden="true">
      PULL BACK &amp; RELEASE TO THROW
    </div>
  )
}
