import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Send, Search, User, Paperclip, Image as ImageIcon,
  FileText, X, Copy, Trash2, Reply, CheckCircle2, Circle, ArrowLeft, Check, CheckCheck,
} from 'lucide-react';
import {
  api, connectMessages, resolveFileUrl,
  type ChatConversation, type ChatMessage, type ChatContact, type MessageAttachment,
} from '../../../api/client';
import { useAdminAuth } from '../../AdminAuthContext';
import { useTheme } from '../../ThemeContext';
import { useLang } from '../../LangContext';
import { AP, type LangAdmin } from '../../../data/adminData';
import {
  setMessagesTabActive,
  setActiveConversationId,
  registerOpenConversationHandler,
  consumePendingOpenConversation,
} from '../../../utils/messageNotificationState';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function avatarColor(id: string) {
  const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % colors.length;
  return colors[h];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function previewText(msg: ChatMessage, t: Record<string, string>) {
  if (msg.text) return msg.text;
  if (msg.messageType === 'image') return `📷 ${t.msgPreviewImage}`;
  if (msg.messageType === 'document') return `📎 ${msg.fileName ?? t.msgPreviewFile}`;
  return '';
}

export function AdminMessagesTab() {
  const { isDark } = useTheme();
  const { lang } = useLang();
  const t = AP[lang as LangAdmin];
  const { selectedCompany } = useAdminAuth();
  const D = isDark;

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [pendingFile, setPendingFile] = useState<(MessageAttachment & { fullUrl?: string; localPreview?: string }) | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: ChatMessage } | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteForEveryone, setDeleteForEveryone] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Awaited<ReturnType<typeof connectMessages>>>(null);

  const activeConv = conversations.find((c) => c.id === activeId);
  const selectionMode = selectedIds.size > 0;

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowDeleteDialog(false);
  };

  const toggleSelect = (msgId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const selectedMessages = messages.filter((m) => selectedIds.has(m.id));
  const canDeleteForAll = activeConv
    ? selectedMessages.some((m) => m.senderId !== activeConv.otherUser.id)
    : false;

  const bg = D ? 'bg-[#0e1621]' : 'bg-gray-50';
  const sidebarBg = D ? 'bg-[#17212b]' : 'bg-white';
  const border = D ? 'border-[#242f3d]' : 'border-gray-200';
  const text = D ? 'text-white' : 'text-gray-900';
  const sub = D ? 'text-[#708499]' : 'text-gray-500';
  const inputBg = D ? 'bg-[#242f3d]' : 'bg-gray-100';
  const hoverBg = D ? 'hover:bg-[#202b36]' : 'hover:bg-gray-50';
  const activeBg = D ? 'bg-[#2b5278]/30' : 'bg-indigo-50';
  const bubbleMine = D ? 'bg-[#2b5278] text-white' : 'bg-indigo-600 text-white';
  const bubbleOther = D ? 'bg-[#182533] text-white border-[#242f3d]' : 'bg-white text-gray-900 border-gray-200';
  const menuBg = D ? 'bg-[#17212b] border-[#242f3d]' : 'bg-white border-gray-200';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [convs, cts] = await Promise.all([
        api.getConversations(),
        api.getContacts(selectedCompany?.id),
      ]);
      setConversations(convs);
      setContacts(cts);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.msgError);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id]);

  useEffect(() => {
    loadData();
    connectMessages({
      onMessage: (payload) => {
        if (payload.conversation) {
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === payload.conversation!.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = payload.conversation!;
              return next.sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
              );
            }
            return payload.conversation ? [payload.conversation, ...prev] : prev;
          });
        }
        if (payload.message && payload.message.conversationId === activeId) {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.message!.id) ? prev : [...prev, payload.message!],
          );
        }
      },
      onDeleted: (payload) => {
        if (payload.conversation) {
          setConversations((prev) =>
            prev.map((c) => (c.id === payload.conversation!.id ? payload.conversation! : c)),
          );
        }
        if (payload.conversationId === activeId) {
          setMessages((prev) => prev.filter((m) => !payload.messageIds.includes(m.id)));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            payload.messageIds.forEach((id) => next.delete(id));
            return next;
          });
        }
      },
      onRead: (payload) => {
        if (payload.conversationId === activeId) {
          setMessages((prev) =>
            prev.map((m) =>
              payload.messageIds.includes(m.id) ? { ...m, isRead: true } : m,
            ),
          );
        }
      },
    }).then((s) => { socketRef.current = s; });
    return () => { socketRef.current?.disconnect(); };
  }, [loadData, activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingFile]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const openConversation = useCallback(async (convId: string) => {
    setActiveId(convId);
    setReplyTo(null);
    setPendingFile(null);
    clearSelection();
    try {
      const msgs = await api.getMessages(convId);
      setMessages(msgs);
      await api.markConversationRead(convId);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t.msgError);
    }
  }, [t.msgError]);

  useEffect(() => {
    setMessagesTabActive(true);
    registerOpenConversationHandler((convId) => {
      void openConversation(convId);
    });
    const pending = consumePendingOpenConversation();
    if (pending) void openConversation(pending);
    return () => {
      setMessagesTabActive(false);
      setActiveConversationId(null);
      registerOpenConversationHandler(null);
    };
  }, [openConversation]);

  useEffect(() => {
    setActiveConversationId(activeId);
  }, [activeId]);

  const startWithContact = async (contact: ChatContact) => {
    try {
      const conv = await api.startConversation(contact.id);
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conv.id);
        if (exists) return prev.map((c) => (c.id === conv.id ? conv : c));
        return [conv, ...prev];
      });
      await openConversation(conv.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.msgError);
    }
  };

  const handleFilePick = async (file: File) => {
    setShowAttach(false);
    try {
      const uploaded = await api.uploadChatFile(file);
      setPendingFile({
        url: uploaded.url,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        messageType: uploaded.messageType,
        fullUrl: uploaded.fullUrl,
        localPreview: uploaded.messageType === 'image' ? uploaded.fullUrl : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t.msgUploadError);
    }
  };

  const handleSend = async () => {
    if (!activeId || sending) return;
    if (!input.trim() && !pendingFile) return;

    setSending(true);
    const text = input.trim();
    const attachment = pendingFile
      ? {
          url: pendingFile.url,
          fileName: pendingFile.fileName,
          mimeType: pendingFile.mimeType,
          fileSize: pendingFile.fileSize,
          messageType: pendingFile.messageType,
        }
      : undefined;

    setInput('');
    setPendingFile(null);
    setReplyTo(null);

    try {
      const payload = { conversationId: activeId, text: text || undefined, attachment };
      if (socketRef.current?.connected) {
        socketRef.current.emit('message:send', payload);
      } else {
        const msg = await api.sendMessage(activeId, text, attachment);
        setMessages((prev) => [...prev, msg]);
      }
    } catch (e) {
      setInput(text);
      setError(e instanceof Error ? e.message : t.msgSendError);
    } finally {
      setSending(false);
    }
  };

  const copyText = (msg: ChatMessage) => {
    const t = msg.text || msg.fileName || '';
    if (t) navigator.clipboard.writeText(t);
    setContextMenu(null);
  };

  const confirmDelete = async () => {
    if (!activeId || selectedIds.size === 0 || deleting) return;
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await api.deleteMessages(activeId, ids, deleteForEveryone && canDeleteForAll);
      setMessages((prev) => prev.filter((m) => !selectedIds.has(m.id)));
      clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.msgError);
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = () => {
    setDeleteForEveryone(canDeleteForAll);
    setShowDeleteDialog(true);
    setContextMenu(null);
  };

  const filteredContacts = contacts.filter((c) =>
    c.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  const mergedList = (() => {
    const convUserIds = new Set(conversations.map((c) => c.otherUser.id));
    const fromContacts = filteredContacts
      .filter((c) => !convUserIds.has(c.id))
      .map((c) => ({ type: 'contact' as const, contact: c }));
    const fromConvs = conversations
      .filter((c) => c.otherUser.fullName.toLowerCase().includes(search.toLowerCase()))
      .map((c) => ({ type: 'conv' as const, conv: c }));
    return [...fromConvs, ...fromContacts];
  })();

  const renderMessageBody = (msg: ChatMessage, isMine: boolean) => (
    <>
      {msg.messageType === 'image' && msg.fileUrl && (
        <a href={resolveFileUrl(msg.fileUrl)} target="_blank" rel="noreferrer">
          <img
            src={resolveFileUrl(msg.fileUrl)}
            alt={msg.fileName ?? 'Rasm'}
            className="max-w-[280px] max-h-[240px] rounded-lg mb-1 object-cover cursor-pointer"
          />
        </a>
      )}
      {msg.messageType === 'document' && msg.fileUrl && (
        <a
          href={resolveFileUrl(msg.fileUrl)}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2 p-2 rounded-lg mb-1 ${
            isMine ? 'bg-white/10' : D ? 'bg-[#242f3d]' : 'bg-gray-100'
          }`}
        >
          <FileText className="w-8 h-8 flex-shrink-0 opacity-70" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{msg.fileName}</p>
            {msg.fileSize != null && (
              <p className={`text-xs ${isMine ? 'text-white/60' : sub}`}>{formatBytes(msg.fileSize)}</p>
            )}
          </div>
        </a>
      )}
      {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
    </>
  );

  return (
    <div className={`flex flex-col h-[calc(100vh-var(--nav-h,65px))] ${bg}`}>
      <div className={`flex items-center gap-3 px-4 md:px-6 py-4 border-b ${border}`}>
        <div className={`p-2 rounded-xl ${D ? 'bg-[#2b5278]/30' : 'bg-indigo-100'}`}>
          <MessageSquare className={`w-6 h-6 ${D ? 'text-[#6ab2f2]' : 'text-indigo-600'}`} />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${text}`}>{t.navMessages}</h2>
        </div>
      </div>

      {error && (
        <div className={`mx-4 mt-3 px-4 py-2 rounded-xl text-sm ${
          D ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
        }`}>
          {error}
        </div>
      )}

      <div className={`flex flex-1 min-h-0 border-t ${border}`}>
        {/* Sidebar */}
        <div className={`${activeConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r ${border} ${sidebarBg}`}>
          <div className="p-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${inputBg}`}>
              <Search className={`w-4 h-4 ${sub}`} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.msgSearch}
                className={`flex-1 bg-transparent text-sm outline-none ${text} placeholder-[#708499]`}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className={`text-center text-sm ${sub} py-8`}>{t.msgLoading}</p>
            ) : mergedList.length === 0 ? (
              <p className={`text-center text-sm ${sub} py-8`}>{t.msgNoAgents}</p>
            ) : (
              mergedList.map((item) => {
                if (item.type === 'conv') {
                  const c = item.conv;
                  const isActive = c.id === activeId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => openConversation(c.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isActive ? activeBg : hoverBg
                      }`}
                    >
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                        style={{ background: avatarColor(c.otherUser.id) }}
                      >
                        {initials(c.otherUser.fullName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className={`text-sm font-medium truncate ${text}`}>
                            {c.otherUser.fullName}
                          </span>
                          {c.lastMessage && (
                            <span className={`text-xs ${sub} ml-2 flex-shrink-0`}>
                              {formatTime(c.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <p className={`text-xs truncate ${sub}`}>
                            {c.lastMessage ? previewText(c.lastMessage as ChatMessage, t) : t.msgNewChat}
                          </p>
                          {c.unreadCount > 0 && (
                            <span className="ml-2 bg-[#6ab2f2] text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                }
                const contact = item.contact;
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => startWithContact(contact)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${hoverBg}`}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ background: avatarColor(contact.id) }}
                    >
                      {initials(contact.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${text}`}>{contact.fullName}</span>
                      <p className={`text-xs ${sub}`}>{contact.role}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat */}
        <div className={`${activeConv ? 'flex' : 'hidden md:flex'} flex-1 flex-col ${bg}`}>
          {!activeConv ? (
            <div className={`flex-1 flex flex-col items-center justify-center ${sub}`}>
              <User className="w-16 h-16 mb-4 opacity-30" />
              <p>{t.msgSelectChat}</p>
            </div>
          ) : (
            <>
              {selectionMode ? (
                <div className={`px-4 py-3 border-b ${border} ${sidebarBg} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className={`text-xs font-semibold uppercase tracking-wide ${D ? 'text-[#6ab2f2]' : 'text-indigo-600'} opacity-50 cursor-not-allowed`}
                    >
                      {t.msgForward} {selectedIds.size}
                    </button>
                    <button
                      type="button"
                      onClick={openDeleteDialog}
                      className={`text-xs font-semibold uppercase tracking-wide ${D ? 'text-[#6ab2f2]' : 'text-indigo-600'}`}
                    >
                      {t.msgDelete} {selectedIds.size}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className={`text-xs font-semibold uppercase tracking-wide ${D ? 'text-[#6ab2f2]' : 'text-indigo-600'}`}
                  >
                    {t.msgCancel}
                  </button>
                </div>
              ) : (
                <div className={`px-4 md:px-6 py-4 border-b ${border} ${sidebarBg} flex items-center gap-3`}>
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    className={`md:hidden p-1 ${sub}`}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                    style={{ background: avatarColor(activeConv.otherUser.id) }}
                  >
                    {initials(activeConv.otherUser.fullName)}
                  </div>
                  <div>
                    <p className={`font-semibold ${text}`}>{activeConv.otherUser.fullName}</p>
                    <p className={`text-xs ${sub}`}>{activeConv.otherUser.role}</p>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-1">
                {messages.map((msg) => {
                  const isMine = msg.senderId !== activeConv.otherUser.id;
                  const isSelected = selectedIds.has(msg.id);
                  return (
                    <div
                      key={msg.id}
                      className="flex w-full items-center gap-2"
                      onClick={() => toggleSelect(msg.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (!selectionMode) {
                          setSelectedIds(new Set([msg.id]));
                        }
                        setContextMenu({ x: e.clientX, y: e.clientY, msg });
                      }}
                    >
                      <div className={`flex flex-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm border cursor-pointer ${
                            isMine
                              ? `${bubbleMine} rounded-br-md border-transparent`
                              : `${bubbleOther} rounded-bl-md`
                          } ${isSelected ? (D ? 'ring-2 ring-[#6ab2f2]/60' : 'ring-2 ring-indigo-400') : ''}`}
                        >
                        {renderMessageBody(msg, isMine)}
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-white/60' : sub}`}>
                          <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                          {isMine && (
                            msg.isRead ? (
                              <CheckCheck className={`w-3.5 h-3.5 ${D ? 'text-[#6ab2f2]' : 'text-sky-300'}`} />
                            ) : (
                              <Check className="w-3.5 h-3.5 opacity-70" />
                            )
                          )}
                        </div>
                        </div>
                      </div>
                      {selectionMode && (
                        <button type="button" className="flex-shrink-0 p-1" onClick={(e) => { e.stopPropagation(); toggleSelect(msg.id); }}>
                          {isSelected ? (
                            <CheckCircle2 className={`w-6 h-6 ${D ? 'text-[#6ab2f2]' : 'text-indigo-600'}`} />
                          ) : (
                            <Circle className={`w-6 h-6 ${sub}`} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {!selectionMode && (
              <>
              {replyTo && (
                <div className={`px-4 py-2 border-t ${border} ${sidebarBg} flex items-center gap-2`}>
                  <Reply className="w-4 h-4 text-[#6ab2f2]" />
                  <p className={`text-sm flex-1 truncate ${sub}`}>{previewText(replyTo, t)}</p>
                  <button type="button" onClick={() => setReplyTo(null)} className={sub}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {pendingFile && (
                <div className={`px-4 py-2 border-t ${border} ${sidebarBg} flex items-center gap-3`}>
                  {pendingFile.messageType === 'image' && pendingFile.fullUrl ? (
                    <img src={pendingFile.fullUrl} alt="" className="w-12 h-12 rounded object-cover" />
                  ) : (
                    <FileText className="w-10 h-10 opacity-60" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${text}`}>{pendingFile.fileName}</p>
                    <p className={`text-xs ${sub}`}>{formatBytes(pendingFile.fileSize)}</p>
                  </div>
                  <button type="button" onClick={() => setPendingFile(null)} className={sub}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className={`px-4 py-3 border-t ${border} ${sidebarBg} relative`}>
                {showAttach && (
                  <div className={`absolute bottom-full left-4 mb-2 rounded-xl border shadow-xl overflow-hidden ${menuBg}`}>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-sm ${text} ${hoverBg}`}
                    >
                      <ImageIcon className="w-5 h-5 text-[#6ab2f2]" />
                      {t.msgAttachPhoto}
                    </button>
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-sm ${text} ${hoverBg}`}
                    >
                      <FileText className="w-5 h-5 text-[#6ab2f2]" />
                      {t.msgAttachDoc}
                    </button>
                  </div>
                )}

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFilePick(f);
                    e.target.value = '';
                  }}
                />
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFilePick(f);
                    e.target.value = '';
                  }}
                />

                <div className="flex items-end gap-2 max-w-3xl mx-auto">
                  <button
                    type="button"
                    onClick={() => setShowAttach((v) => !v)}
                    className={`p-3 rounded-full ${hoverBg} ${sub}`}
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    placeholder={t.msgPlaceholder}
                    className={`flex-1 px-4 py-2.5 rounded-2xl border ${border} ${inputBg} ${text} resize-none text-sm outline-none focus:border-[#6ab2f2]`}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={(!input.trim() && !pendingFile) || sending}
                    className="p-3 rounded-full bg-[#2b5278] text-white hover:bg-[#3d6a99] disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
              </>
              )}
            </>
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          className={`fixed z-50 rounded-xl border shadow-2xl py-1 min-w-[180px] ${menuBg}`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm ${text} ${hoverBg}`}
          >
            <Reply className="w-4 h-4" /> {t.msgReply}
          </button>
          <button
            type="button"
            onClick={() => copyText(contextMenu.msg)}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm ${text} ${hoverBg}`}
          >
            <Copy className="w-4 h-4" /> {t.msgCopy}
          </button>
          <div className={`my-1 border-t ${border}`} />
          <button
            type="button"
            onClick={() => {
              const msg = contextMenu.msg;
              setSelectedIds(new Set([msg.id]));
              setContextMenu(null);
              const mine = activeConv ? msg.senderId !== activeConv.otherUser.id : false;
              setDeleteForEveryone(mine);
              setShowDeleteDialog(true);
            }}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 ${hoverBg}`}
          >
            <Trash2 className="w-4 h-4" /> {t.msgDelete}
          </button>
        </div>
      )}

      {showDeleteDialog && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className={`rounded-2xl p-5 w-full max-w-sm shadow-2xl ${menuBg}`}>
            <p className={`text-base mb-4 ${text}`}>{t.msgDeleteConfirm}</p>
            {canDeleteForAll && (
              <label className={`flex items-start gap-3 mb-5 cursor-pointer ${text}`}>
                <input
                  type="checkbox"
                  checked={deleteForEveryone}
                  onChange={(e) => setDeleteForEveryone(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#6ab2f2]"
                />
                <span className="text-sm">
                  {t.msgDeleteForAll.replace('{name}', activeConv.otherUser.fullName)}
                </span>
              </label>
            )}
            <div className="flex justify-end gap-5">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                className={`text-sm font-medium ${D ? 'text-[#6ab2f2]' : 'text-indigo-600'}`}
              >
                {t.msgCancel}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className={`text-sm font-medium ${D ? 'text-[#6ab2f2]' : 'text-indigo-600'} disabled:opacity-50`}
              >
                {t.msgDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
