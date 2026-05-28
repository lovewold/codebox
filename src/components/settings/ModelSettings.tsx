import { useEffect, useState } from 'react'
import { Check, Edit3, Plus, Trash2, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { ModelProfile, ModelProviderPreset, ModelProviderType } from '../../types'
import T from '../../i18n'

const api = window.electronAPI

export function ModelSettings() {
  const { modelProfiles, activeProfileId, setModelProfiles, setActiveProfileId } = useAppStore()
  const [presets, setPresets] = useState<ModelProviderPreset[]>([])
  const [editing, setEditing] = useState<ModelProfile | null>(null)
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    api.models.presets().then(setPresets)
  }, [])

  function getPreset(provider: ModelProviderType) {
    return presets.find((p) => p.type === provider)
  }

  function startAdd() {
    const preset = presets[0]
    setEditing({
      id: '',
      name: '',
      provider: preset?.type || 'custom_openai',
      baseUrl: preset?.defaultBaseUrl || '',
      apiKey: '',
      modelName: preset?.defaultModel || '',
      createdAt: '',
      updatedAt: '',
    })
    setAdding(true)
  }

  function startEdit(profile: ModelProfile) {
    setEditing({ ...profile })
    setAdding(false)
  }

  function cancelEdit() {
    setEditing(null)
    setAdding(false)
  }

  async function handleSave() {
    if (!editing) return
    const profile = adding
      ? { ...editing, id: crypto.randomUUID?.() || `profile_${Date.now()}` }
      : editing
    const { profiles, activeProfileId: active } = await api.models.save(profile)
    setModelProfiles(profiles)
    setActiveProfileId(active)
    setEditing(null)
    setAdding(false)
  }

  async function handleDelete(id: string) {
    const { profiles, activeProfileId: active } = await api.models.delete(id)
    setModelProfiles(profiles)
    setActiveProfileId(active)
    setConfirmDelete(null)
  }

  async function handleSetActive(id: string) {
    const { profiles, activeProfileId: active } = await api.models.setActive(id)
    setModelProfiles(profiles)
    setActiveProfileId(active)
  }

  function updateEditing(patch: Partial<ModelProfile>) {
    if (!editing) return
    setEditing({ ...editing, ...patch })
  }

  function selectPreset(type: ModelProviderType) {
    const preset = getPreset(type)
    if (!preset) return
    updateEditing({
      provider: type,
      baseUrl: preset.defaultBaseUrl,
      modelName: preset.defaultModel,
    })
  }

  const showEditor = editing !== null

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-fg-default">{T.settingsModels}</h2>
        {!showEditor && (
          <button
            type="button"
            onClick={startAdd}
            className="flex items-center gap-1.5 rounded-lg bg-accent-emphasis px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {T.modelsAdd}
          </button>
        )}
      </div>

      {/* Profile list */}
      {!showEditor && (
        <>
          {modelProfiles.length === 0 ? (
            <div className="rounded-xl border border-border-default bg-bg-subtle p-12 text-center">
              <p className="text-sm font-medium text-fg-default">{T.modelsEmpty}</p>
              <p className="mt-1 text-xs text-fg-muted">{T.modelsEmptyHint}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {modelProfiles.map((profile) => {
                const preset = getPreset(profile.provider)
                const isActive = profile.id === activeProfileId
                return (
                  <div
                    key={profile.id}
                    className={`rounded-xl border p-4 transition ${
                      isActive
                        ? 'border-accent-fg bg-accent-subtle'
                        : 'border-border-default bg-bg-subtle'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-fg-default truncate">
                            {profile.name || preset?.label || '未命名'}
                          </span>
                          <span className="shrink-0 rounded bg-bg-inset px-1.5 py-0.5 text-xs text-fg-muted">
                            {preset?.label || profile.provider}
                          </span>
                          {isActive && (
                            <span className="shrink-0 rounded bg-accent-emphasis px-1.5 py-0.5 text-xs text-white">
                              {T.modelsActive}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-fg-muted truncate">{profile.modelName}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleSetActive(profile.id)}
                            className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-inset hover:text-accent-fg"
                            title={T.modelsSetActive}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(profile)}
                          className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-inset hover:text-fg-default"
                          title={T.modelsEdit}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(profile.id)}
                          className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-inset hover:text-danger-fg"
                          title={T.modelsDelete}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Delete confirmation */}
                    {confirmDelete === profile.id && (
                      <div className="mt-3 rounded-lg border border-danger-fg/30 bg-danger-fg/5 p-3">
                        <p className="text-xs text-fg-default">{T.modelsDeleteConfirm}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(profile.id)}
                            className="rounded bg-danger-fg px-3 py-1 text-xs text-white hover:opacity-90"
                          >
                            {T.modelsDelete}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="rounded border border-border-default px-3 py-1 text-xs text-fg-muted hover:bg-bg-inset"
                          >
                            {T.modelsCancel}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Editor form */}
      {showEditor && editing && (
        <div className="rounded-xl border border-border-default bg-bg-subtle p-6">
          <h3 className="mb-5 text-sm font-semibold text-fg-default">
            {adding ? T.modelsAdd : T.modelsEdit}
          </h3>

          {/* Provider picker */}
          <label className="mb-2 block text-xs font-medium text-fg-muted">{T.modelsProvider}</label>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p.type}
                type="button"
                onClick={() => selectPreset(p.type)}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  editing.provider === p.type
                    ? 'border-accent-fg bg-accent-subtle text-accent-fg'
                    : 'border-border-default bg-bg-default text-fg-muted hover:border-accent-fg/50'
                }`}
              >
                <span className="font-medium">{p.label}</span>
              </button>
            ))}
          </div>

          {/* Name */}
          <label className="mb-1 block text-xs font-medium text-fg-muted">{T.modelsName}</label>
          <input
            type="text"
            value={editing.name}
            onChange={(e) => updateEditing({ name: e.target.value })}
            placeholder={T.modelsNamePlaceholder}
            className="mb-3 w-full rounded-lg border border-border-default bg-bg-default px-3 py-2 text-sm text-fg-default outline-none focus:border-accent-fg"
          />

          {/* API Key */}
          <label className="mb-1 block text-xs font-medium text-fg-muted">{T.modelsApiKey}</label>
          <input
            type="password"
            value={editing.apiKey}
            onChange={(e) => updateEditing({ apiKey: e.target.value })}
            placeholder={T.modelsApiKeyPlaceholder}
            className="mb-3 w-full rounded-lg border border-border-default bg-bg-default px-3 py-2 text-sm text-fg-default outline-none focus:border-accent-fg"
          />

          {/* Base URL */}
          <label className="mb-1 block text-xs font-medium text-fg-muted">{T.modelsBaseUrl}</label>
          <input
            type="text"
            value={editing.baseUrl}
            onChange={(e) => updateEditing({ baseUrl: e.target.value })}
            className="mb-3 w-full rounded-lg border border-border-default bg-bg-default px-3 py-2 text-sm text-fg-default outline-none focus:border-accent-fg"
          />

          {/* Model name */}
          <label className="mb-1 block text-xs font-medium text-fg-muted">{T.modelsModelName}</label>
          <input
            type="text"
            value={editing.modelName}
            onChange={(e) => updateEditing({ modelName: e.target.value })}
            placeholder={T.modelsModelNamePlaceholder}
            list="known-models-list"
            className="mb-5 w-full rounded-lg border border-border-default bg-bg-default px-3 py-2 text-sm text-fg-default outline-none focus:border-accent-fg"
          />
          <datalist id="known-models-list">
            {(getPreset(editing.provider)?.knownModels || []).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!editing.name || !editing.modelName}
              className="flex items-center gap-1.5 rounded-lg bg-accent-emphasis px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              {T.modelsSave}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="flex items-center gap-1.5 rounded-lg border border-border-default px-4 py-2 text-sm text-fg-muted hover:bg-bg-inset"
            >
              <X className="h-4 w-4" />
              {T.modelsCancel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
