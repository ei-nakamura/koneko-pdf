/** APIキー入力コンポーネント（Claude APIキーをパスワードフィールドで入力） */
import { useAppStore } from '../stores/useAppStore';

export function ApiKeyInput() {
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);

  return (
    <div className="max-w-[540px] mx-auto mb-4">
      <div className="flex items-center gap-2">
        <label className="text-[12px] text-app-muted whitespace-nowrap font-mono">API Key:</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          className="flex-1 px-3 py-1.5 text-[13px] rounded-md bg-app-surface border border-app-border text-app-text font-sans focus:outline-none focus:border-app-accent"
        />
      </div>
    </div>
  );
}
