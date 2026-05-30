import React, { useState } from 'react';
import { Bell, Send, Radio } from 'lucide-react';
import { api } from '../../../api/client';

export function AdminPushTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
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
      const res = await api.broadcastPush({ title: title.trim(), body: body.trim() });
      setResult(`Yuborildi: ${res.sent ?? 0} ta qurilma`);
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
            Barcha agentlarga FCM orqali xabar yuborish
          </p>
        </div>
      </div>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
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
            placeholder="Agentlarga yuboriladigan xabar..."
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
          {loading ? 'Yuborilmoqda...' : 'Barcha agentlarga yuborish'}
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Firebase FCM sozlangan bo&apos;lishi va agentlar ilovaga login qilgan bo&apos;lishi kerak.
        Batafsil: <code className="text-indigo-500">FCM_SETUP.md</code>
      </p>
    </div>
  );
}
