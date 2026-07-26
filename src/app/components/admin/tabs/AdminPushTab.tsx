import React, { useState } from 'react';
import { Bell, Send, Radio } from 'lucide-react';
import { api } from '../../../api/client';
import { isAdminWebPushConfigured } from '../../../lib/firebaseMessaging';

type Audience = 'agents' | 'clients' | 'admins' | 'all';

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: 'agents', label: 'Agentlar (APK)' },
  { value: 'clients', label: 'Mijozlar (APK)' },
  { value: 'admins', label: 'Admin / menejer (brauzer)' },
  { value: 'all', label: 'Hammaga' },
];

export function AdminPushTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('agents');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Sarlavha va matn kiriting');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.broadcastPush({
        title: title.trim(),
        body: body.trim(),
        audience,
      });
      setResult(
        res.message && !res.sent
          ? res.message
          : `Yuborildi: ${res.sent ?? 0} ta qurilma`,
      );
      setTitle('');
      setBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
          <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Push bildirishnomalar</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Firebase FCM orqali agent, mijoz va adminlarga xabar
          </p>
        </div>
      </div>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Qabul qiluvchilar
          </label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            {AUDIENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sarlavha
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Muhim xabar"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Matn
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Yuboriladigan xabar..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {result && (
          <p className="text-sm text-green-600 dark:text-green-400">{result}</p>
        )}

        <button
          type="button"
          onClick={handleBroadcast}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {loading ? (
            <Radio className="w-5 h-5 animate-pulse" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          {loading ? 'Yuborilmoqda...' : 'Yuborish'}
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Firebase sozlangan bo&apos;lishi kerak.
        Admin brauzer push:{' '}
        {isAdminWebPushConfigured() ? 'ulangan' : 'VITE_FIREBASE_* env kerak'}.
        Batafsil: <code className="text-indigo-500">FCM_SETUP.md</code>
      </p>
    </div>
  );
}
