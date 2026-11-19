import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import {
  DEFAULT_AI_PROVIDER_SETTINGS,
  readAiProviderSettings,
  saveAiProviderSettings,
  type AiProviderPreset,
  type AiProviderSettings,
} from '../lib/aiProvider';

type Props = { open: boolean; onClose: () => void; onSaved: () => void };

const PRESETS: Record<AiProviderPreset, { label: string; baseURL: string }> = {
  openrouter: { label: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1' },
  openai: { label: 'OpenAI', baseURL: 'https://api.openai.com/v1' },
  custom: { label: 'Custom OpenAI-Compatible Endpoint', baseURL: '' },
};

export function AiProviderSettingsModal({ open, onClose, onSaved }: Props) {
  const [settings, setSettings] = useState<AiProviderSettings>(() => readAiProviderSettings());
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setSettings(readAiProviderSettings());
      setError('');
      setSaved(false);
    }
  }, [open]);

  const update = (patch: Partial<AiProviderSettings>) => {
    setSettings(current => ({ ...current, ...patch }));
    setSaved(false);
    setError('');
  };

  const choosePreset = (preset: AiProviderPreset) => {
    update({ preset, baseURL: PRESETS[preset].baseURL || settings.baseURL });
  };

  const save = () => {
    const baseURL = settings.baseURL.trim().replace(/\/+$/, '');
    if (!settings.apiKey.trim()) {
      setError('Enter an API key to use your provider, or clear settings to use a server-configured provider.');
      return;
    }
    try {
      const parsed = new URL(baseURL);
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
        throw new Error('invalid URL');
      }
    } catch {
      setError('Enter a valid HTTP(S) Base URL without credentials or query parameters.');
      return;
    }
    if (!settings.model.trim()) {
      setError('Enter the model ID for your provider.');
      return;
    }
    const next = { ...settings, baseURL, apiKey: settings.apiKey.trim(), model: settings.model.trim() };
    try {
      saveAiProviderSettings(next);
      setSettings(next);
      setSaved(true);
      onSaved();
    } catch {
      setError('Browser storage is unavailable. Allow local storage for this site and try again.');
    }
  };

  const removeKey = () => {
    const next = { ...DEFAULT_AI_PROVIDER_SETTINGS };
    try {
      localStorage.removeItem('editrim_ai_provider_settings_v1');
      setSettings(next);
      setSaved(false);
      setError('Saved settings removed. AI will use a server-configured key if available.');
      onSaved();
    } catch {
      setError('Could not clear browser storage.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI Provider Settings"
      subtitle="Use your own provider key. It stays in this browser and is sent only with AI requests."
      width={520}
      className="ai-provider-modal"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-cobalt" onClick={save}>Save settings</button>
        </>
      }
    >
      <div className="ai-provider-fields">
        <div className="field">
          <label className="field-label" htmlFor="ai-provider-preset">Provider preset</label>
          <select id="ai-provider-preset" className="select" value={settings.preset} onChange={e => choosePreset(e.target.value as AiProviderPreset)}>
            {Object.entries(PRESETS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ai-provider-base-url">Base URL</label>
          <input id="ai-provider-base-url" className="input" type="url" value={settings.baseURL} onChange={e => update({ baseURL: e.target.value })} placeholder="https://api.example.com/v1" autoComplete="url" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ai-provider-key">API key</label>
          <input id="ai-provider-key" className="input" type="password" value={settings.apiKey} onChange={e => update({ apiKey: e.target.value })} placeholder="Paste your provider API key" autoComplete="new-password" spellCheck={false} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ai-provider-model">Model ID</label>
          <input id="ai-provider-model" className="input" value={settings.model} onChange={e => update({ model: e.target.value })} placeholder="provider/model-name" autoComplete="off" spellCheck={false} />
        </div>
        <div className="ai-provider-privacy"><ShieldCheck size={15} /><span>Stored in this device’s localStorage. The key is not encrypted by the browser and is included only in AI requests to your selected endpoint.</span></div>
        {error && <p className={`ai-provider-message ${saved ? 'is-ok' : ''}`} role="status">{error}</p>}
        {saved && <p className="ai-provider-message is-ok" role="status"><KeyRound size={14} /> Settings saved on this device.</p>}
        <button className="ai-provider-remove" type="button" onClick={removeKey}><Trash2 size={14} /> Remove saved key</button>
      </div>
    </Modal>
  );
}
