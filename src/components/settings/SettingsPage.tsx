import { useState } from 'react'
import { ArrowLeft, Cpu, Settings, Shield } from 'lucide-react'
import { GeneralSettings } from './GeneralSettings'
import { ModelSettings } from './ModelSettings'
import { PrivacySettings } from './PrivacySettings'
import T from '../../i18n'

interface Props {
  onClose: () => void
  initialSection?: string
}

type Section = 'general' | 'models' | 'privacy'

const SECTIONS: { id: Section; label: string; icon: typeof Settings }[] = [
  { id: 'general', label: T.settingsGeneral, icon: Settings },
  { id: 'models', label: T.settingsModels, icon: Cpu },
  { id: 'privacy', label: T.settingsPrivacy, icon: Shield },
]

export function SettingsPage({ onClose, initialSection }: Props) {
  const [section, setSection] = useState<Section>(initialSection as Section || 'general')

  return (
    <div className="fixed inset-0 z-50 flex bg-bg-default">
      {/* Sidebar */}
      <div className="flex w-56 shrink-0 flex-col border-r border-border-default bg-bg-subtle">
        <div className="flex items-center gap-2 border-b border-border-default px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-fg-muted hover:bg-bg-inset hover:text-fg-default"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-fg-default">{T.settingsTitle}</span>
        </div>
        <nav className="flex-1 p-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                section === s.id
                  ? 'bg-accent-subtle text-accent-fg'
                  : 'text-fg-muted hover:bg-bg-inset hover:text-fg-default'
              }`}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {section === 'general' && <GeneralSettings />}
        {section === 'models' && <ModelSettings />}
        {section === 'privacy' && <PrivacySettings />}
      </div>
    </div>
  )
}
