import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MessageSquare, X } from 'lucide-react';
import {
  connectMessages,
  type ChatConversation,
  type ChatMessage,
} from '../../api/client';
import { playMessageSound } from '../../utils/messageSound';
import {
  shouldSuppressPopup,
  openConversation,
} from '../../utils/messageNotificationState';
import { useTheme } from '../ThemeContext';

function getMyUserId(): string | null {
  const stored = localStorage.getItem('api_user_id');
  if (stored) return stored;
  const token = localStorage.getItem('api_access_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

type ToastItem = {
  id: string;
  conversationId: string;
  senderName: string;
  preview: string;
  time: string;
};

function previewMsg(msg: ChatMessage) {
  if (msg.text) return msg.text;
  if (msg.messageType === 'image') return '📷 Rasm';
  if (msg.messageType === 'document') return `📎 ${msg.fileName ?? 'Fayl'}`;
  return '';
}

interface Props {
  onGoToMessages: () => void;
}

export function MessageNotificationHost({ onGoToMessages }: Props) {
  const { isDark: D } = useTheme();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const myIdRef = useRef<string | null>(getMyUserId());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    (payload: { message: ChatMessage; conversation?: ChatConversation }) => {
      const { message, conversation } = payload;
      const myId = myIdRef.current;
      if (myId && message.senderId === myId) return;
      if (shouldSuppressPopup(message.conversationId)) return;

      playMessageSound();

      const d = new Date(message.createdAt);
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const item: ToastItem = {
        id: message.id,
        conversationId: message.conversationId,
        senderName: conversation?.otherUser?.fullName ?? 'Yangi xabar',
        preview: previewMsg(message),
        time,
      };

      setToasts((prev) => [item, ...prev].slice(0, 4));
      const timer = setTimeout(() => dismiss(item.id), 5000);
      timersRef.current.set(item.id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    myIdRef.current = getMyUserId();
    let socket: Awaited<ReturnType<typeof connectMessages>> = null;

    connectMessages({ onMessage: pushToast }).then((s) => {
      socket = s;
    });

    return () => {
      socket?.disconnect();
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
    };
  }, [pushToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-[min(100vw-2rem,340px)] pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            dismiss(t.id);
            onGoToMessages();
            openConversation(t.conversationId);
          }}
          className={`pointer-events-auto flex items-start gap-3 p-3 rounded-2xl shadow-2xl border text-left animate-in slide-in-from-right-5 duration-300 ${
            D
              ? 'bg-[#17212b] border-[#242f3d] text-white hover:bg-[#1e2c3a]'
              : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className={`p-2 rounded-full flex-shrink-0 ${D ? 'bg-[#2b5278]/40' : 'bg-indigo-100'}`}>
            <MessageSquare className={`w-5 h-5 ${D ? 'text-[#6ab2f2]' : 'text-indigo-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center gap-2">
              <span className="font-semibold text-sm truncate">{t.senderName}</span>
              <span className={`text-xs flex-shrink-0 ${D ? 'text-[#708499]' : 'text-gray-400'}`}>
                {t.time}
              </span>
            </div>
            <p className={`text-sm truncate mt-0.5 ${D ? 'text-[#708499]' : 'text-gray-500'}`}>
              {t.preview}
            </p>
          </div>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              dismiss(t.id);
            }}
            onKeyDown={(e) => e.key === 'Enter' && dismiss(t.id)}
            className={`p-1 rounded-lg flex-shrink-0 ${D ? 'hover:bg-[#242f3d]' : 'hover:bg-gray-100'}`}
          >
            <X className="w-4 h-4 opacity-50" />
          </span>
        </button>
      ))}
    </div>
  );
}
