'use client'

import { ChevronLeftIcon, TvIcon, ShareIcon, MailIcon } from '@/components/icons'

interface PartyHeaderProps {
  partyName: string
  partyCode: string
  onLeave: () => void
  onTvMode: () => void
  onShare: () => void
  onInvite: () => void
}

export function PartyHeader({ partyName, partyCode, onLeave, onTvMode, onShare, onInvite }: PartyHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-surface-800 safe-area-top">
      <button onClick={onLeave} className="btn-ghost icon-btn -ml-2 rounded-full" aria-label="Leave party">
        <ChevronLeftIcon />
      </button>
      <div className="text-center">
        <div className="font-semibold">{partyName}</div>
        <div className="text-xs text-text-muted font-mono" data-testid="party-code">
          {partyCode}
        </div>
      </div>
      <div className="flex gap-0">
        <button onClick={onTvMode} className="btn-ghost icon-btn rounded-full" aria-label="Open TV mode">
          <TvIcon />
        </button>
        <button onClick={onInvite} className="btn-ghost icon-btn rounded-full" aria-label="Invite by email">
          <MailIcon />
        </button>
        <button onClick={onShare} className="btn-ghost icon-btn rounded-full" aria-label="Share party">
          <ShareIcon />
        </button>
      </div>
    </div>
  )
}
