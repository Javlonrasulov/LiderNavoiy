import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Translations } from '../i18n'
import { theme } from '../theme'
import { pushBackHandler } from '../utils/hardwareBack'
import {
  ArrowLeft,
  Check,
  CheckCheck,
  CheckCircle,
  Circle,
  Copy,
  FileText,
  ImageIcon,
  MessageSquare,
  Paperclip,
  PenSquare,
  Search,
  Send,
  Trash2,
  X,
} from '../icons'
import {
  connectMessages,
  deleteMessages,
  getClientContacts,
  getContacts,
  getConversations,
  getMessages,
  markConversationRead,
  resolveChatFileUrl,
  sendMessage,
  startConversation,
  uploadChatFile,
  type ChatContact,
  type ChatConversation,
  type ChatMessage,
  type MessageAttachment,
  type MessagesSocket,
} from '../api/messages'
import { showToast } from '../components/Toast'

type ListTab = 'chats' | 'contacts' | 'clients'

interface Props {
  dark: boolean
  tr: Translations
  openConversationId?: string | null
  onUnreadChange?: (count: number) => void
  onConversationOpened?: () => void
  onChatOpenChange?: (open: boolean) => void
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

function avatarColor(id: string) {
  const colors = ['#6C5CE7', '#E6963C', '#00C853', '#F44336', '#7C4DFF', '#3B82F6', '#EC4899']
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % colors.length
  return colors[h]
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function roleLabel(role: string, tr: Translations) {
  switch (role.toLowerCase()) {
    case 'admin':
      return tr.msgRoleAdmin
    case 'manager':
      return tr.msgRoleManager
    case 'distributor':
      return tr.msgRoleAgent
    case 'client':
      return tr.msgRoleClient
    default:
      return role
  }
}

function previewText(msg: { text?: string; messageType?: string; fileName?: string | null }, tr: Translations) {
  if (msg.text) return msg.text
  if (msg.messageType === 'image') return tr.msgPreviewImage
  if (msg.messageType === 'document') return msg.fileName ?? tr.msgPreviewFile
  return ''
}

export default function MessagesScreen({
  dark,
  tr,
  openConversationId,
  onUnreadChange,
  onConversationOpened,
  onChatOpenChange,
}: Props) {
  const c = theme(dark)
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [clientContacts, setClientContacts] = useState<ChatContact[]>([])
  const [listTab, setListTab] = useState<ListTab>('chats')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [pendingFile, setPendingFile] = useState<(MessageAttachment & { fullUrl?: string }) | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteForEveryone, setDeleteForEveryone] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: ChatMessage } | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<MessagesSocket | null>(null)
  const activeIdRef = useRef<string | null>(null)

  const activeConv = conversations.find(x => x.id === activeId) ?? null
  const selectionMode = selectedIds.size > 0
  const selectedMessages = messages.filter(m => selectedIds.has(m.id))
  const canDeleteForAll = activeConv
    ? selectedMessages.some(m => m.senderId !== activeConv.otherUser.id)
    : false

  const emitUnread = useCallback(
    (convs: ChatConversation[]) => {
      const total = convs.reduce((sum, x) => sum + (x.unreadCount || 0), 0)
      onUnreadChange?.(total)
    },
    [onUnreadChange],
  )

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const [convs, staff, clients] = await Promise.all([
        getConversations(),
        getContacts().catch(() => [] as ChatContact[]),
        getClientContacts().catch(() => [] as ChatContact[]),
      ])
      setConversations(convs)
      setContacts(staff)
      setClientContacts(clients)
      emitUnread(convs)
    } catch (e) {
      showToast(e instanceof Error ? e.message : tr.msgError)
    } finally {
      setLoading(false)
    }
  }, [emitUnread, tr.msgError])

  const openConversation = useCallback(
    async (convId: string) => {
      setActiveId(convId)
      activeIdRef.current = convId
      onChatOpenChange?.(true)
      document.documentElement.setAttribute('data-chat-open', '1')
      setSelectedIds(new Set())
      setShowDeleteDialog(false)
      setPendingFile(null)
      setShowAttach(false)
      try {
        const msgs = await getMessages(convId)
        setMessages(msgs)
        await markConversationRead(convId)
        setConversations(prev => {
          const next = prev.map(x => (x.id === convId ? { ...x, unreadCount: 0 } : x))
          emitUnread(next)
          return next
        })
      } catch (e) {
        showToast(e instanceof Error ? e.message : tr.msgError)
      }
    },
    [emitUnread, onChatOpenChange, tr.msgError],
  )

  const closeConversation = useCallback(() => {
    setActiveId(null)
    activeIdRef.current = null
    setMessages([])
    setSelectedIds(new Set())
    setShowAttach(false)
    setPendingFile(null)
    onChatOpenChange?.(false)
    document.documentElement.setAttribute('data-chat-open', '0')
  }, [onChatOpenChange])

  useEffect(() => {
    return pushBackHandler(() => {
      if (showDeleteDialog) {
        setShowDeleteDialog(false)
        return true
      }
      if (contextMenu) {
        setContextMenu(null)
        return true
      }
      if (selectedIds.size > 0) {
        setSelectedIds(new Set())
        return true
      }
      if (showAttach) {
        setShowAttach(false)
        return true
      }
      if (activeId) {
        closeConversation()
        return true
      }
      return false
    })
  }, [activeId, selectedIds, showAttach, showDeleteDialog, contextMenu, closeConversation])
  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    let cancelled = false
    void connectMessages({
      onMessage: payload => {
        if (payload.conversation) {
          setConversations(prev => {
            const idx = prev.findIndex(x => x.id === payload.conversation!.id)
            let next: ChatConversation[]
            if (idx >= 0) {
              next = [...prev]
              next[idx] = payload.conversation!
            } else {
              next = [payload.conversation!, ...prev]
            }
            next = next.sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            )
            emitUnread(next)
            return next
          })
        }
        if (payload.message && payload.message.conversationId === activeIdRef.current) {
          setMessages(prev =>
            prev.some(m => m.id === payload.message!.id) ? prev : [...prev, payload.message!],
          )
          void markConversationRead(payload.message.conversationId).then(() => {
            setConversations(prev => {
              const next = prev.map(x =>
                x.id === payload.message!.conversationId ? { ...x, unreadCount: 0 } : x,
              )
              emitUnread(next)
              return next
            })
          })
        }
      },
      onDeleted: payload => {
        if (payload.conversation) {
          setConversations(prev => {
            const next = prev.map(x =>
              x.id === payload.conversation!.id ? payload.conversation! : x,
            )
            emitUnread(next)
            return next
          })
        }
        if (payload.conversationId === activeIdRef.current) {
          setMessages(prev => prev.filter(m => !payload.messageIds.includes(m.id)))
          setSelectedIds(prev => {
            const next = new Set(prev)
            payload.messageIds.forEach(id => next.delete(id))
            return next
          })
        }
      },
      onRead: payload => {
        if (payload.conversationId === activeIdRef.current) {
          setMessages(prev =>
            prev.map(m => (payload.messageIds.includes(m.id) ? { ...m, isRead: true } : m)),
          )
        }
      },
    }).then(s => {
      if (cancelled) {
        s?.disconnect()
        return
      }
      socketRef.current = s
    })
    return () => {
      cancelled = true
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [emitUnread])

  useEffect(() => {
    if (!openConversationId) return
    void openConversation(openConversationId)
    onConversationOpened?.()
  }, [openConversationId, openConversation, onConversationOpened])

  // Unmount: chat flag tozalash
  useEffect(() => {
    return () => {
      onChatOpenChange?.(false)
      document.documentElement.setAttribute('data-chat-open', '0')
    }
  }, [onChatOpenChange])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingFile])

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const startWithContact = async (contact: ChatContact) => {
    try {
      const conv = await startConversation(contact.id)
      setConversations(prev => {
        const exists = prev.find(x => x.id === conv.id)
        if (exists) return prev.map(x => (x.id === conv.id ? conv : x))
        return [conv, ...prev]
      })
      setListTab('chats')
      await openConversation(conv.id)
    } catch (e) {
      showToast(e instanceof Error ? e.message : tr.msgError)
    }
  }

  const handleFilePick = async (file: File) => {
    setShowAttach(false)
    try {
      const uploaded = await uploadChatFile(file)
      setPendingFile({
        url: uploaded.url,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        messageType: uploaded.messageType,
        fullUrl: uploaded.fullUrl || resolveChatFileUrl(uploaded.url),
      })
    } catch (e) {
      showToast(e instanceof Error ? e.message : tr.msgUploadError)
    }
  }

  const handleSend = async () => {
    if (!activeId || sending) return
    if (!input.trim() && !pendingFile) return

    setSending(true)
    const text = input.trim()
    const attachment = pendingFile
      ? {
          url: pendingFile.url,
          fileName: pendingFile.fileName,
          mimeType: pendingFile.mimeType,
          fileSize: pendingFile.fileSize,
          messageType: pendingFile.messageType,
        }
      : undefined

    setInput('')
    setPendingFile(null)

    try {
      const payload = { conversationId: activeId, text: text || undefined, attachment }
      if (socketRef.current?.connected) {
        socketRef.current.emit('message:send', payload)
      } else {
        const msg = await sendMessage(activeId, text, attachment)
        setMessages(prev => [...prev, msg])
      }
    } catch (e) {
      setInput(text)
      showToast(e instanceof Error ? e.message : tr.msgSendError)
    } finally {
      setSending(false)
    }
  }

  const toggleSelect = (msgId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(msgId)) next.delete(msgId)
      else next.add(msgId)
      return next
    })
  }

  const confirmDelete = async () => {
    if (!activeId || selectedIds.size === 0 || deleting) return
    setDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      await deleteMessages(activeId, ids, deleteForEveryone && canDeleteForAll)
      setMessages(prev => prev.filter(m => !selectedIds.has(m.id)))
      setSelectedIds(new Set())
      setShowDeleteDialog(false)
    } catch (e) {
      showToast(e instanceof Error ? e.message : tr.msgError)
    } finally {
      setDeleting(false)
    }
  }

  const searchLower = search.toLowerCase()
  const filteredConversations = conversations
    .filter(x => x.otherUser.fullName.toLowerCase().includes(searchLower))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const filterContacts = (list: ChatContact[]) =>
    list.filter(
      x =>
        x.fullName.toLowerCase().includes(searchLower) ||
        x.username.toLowerCase().includes(searchLower) ||
        x.role.toLowerCase().includes(searchLower),
    )

  const filteredContacts = filterContacts(contacts)
  const filteredClients = filterContacts(clientContacts)

  const bubbleMine = dark ? '#5B2D8E' : '#6C5CE7'
  const bubbleOther = dark ? '#1E1E38' : '#FFFFFF'

  if (activeConv) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: c.bg,
        }}
      >
        {selectionMode ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 12px max(16px, var(--safe-right))',
              background: dark ? 'rgba(8,8,18,0.92)' : 'rgba(248,249,252,0.92)',
              borderBottom: `1px solid ${c.border}`,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setShowDeleteDialog(true)
                setDeleteForEveryone(canDeleteForAll)
              }}
              style={{
                border: 'none',
                background: 'rgba(244,67,54,0.12)',
                color: '#F44336',
                borderRadius: 12,
                padding: '8px 12px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {tr.msgDelete} {selectedIds.size}
            </button>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              style={{ border: 'none', background: 'none', color: c.primary, fontWeight: 700, cursor: 'pointer' }}
            >
              {tr.cancel}
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 12px max(16px, var(--safe-right))',
              background: dark ? 'rgba(8,8,18,0.92)' : 'rgba(248,249,252,0.92)',
              borderBottom: `1px solid ${c.border}`,
            }}
          >
            <button
              type="button"
              onClick={closeConversation}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                border: 'none',
                background: c.muted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={18} color={c.text} />
            </button>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                background: avatarColor(activeConv.otherUser.id),
                color: 'white',
                fontWeight: 800,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {initials(activeConv.otherUser.fullName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: c.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeConv.otherUser.fullName}
              </p>
              <p style={{ fontSize: 11, color: c.mutedText }}>
                {roleLabel(activeConv.otherUser.role, tr)}
              </p>
            </div>
          </div>
        )}

        <div
          className="no-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: selectionMode
              ? '12px 16px calc(16px + var(--safe-bottom))'
              : '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {messages.map(msg => {
            const isMine = msg.senderId !== activeConv.otherUser.id
            const isSelected = selectedIds.has(msg.id)
            const isImage =
              msg.messageType === 'image' || (!!msg.fileUrl && !!msg.fileMime?.startsWith('image/'))
            return (
              <div
                key={msg.id}
                onClick={() => {
                  if (selectionMode) toggleSelect(msg.id)
                }}
                onContextMenu={e => {
                  e.preventDefault()
                  if (!selectionMode) setSelectedIds(new Set([msg.id]))
                  setContextMenu({ x: e.clientX, y: e.clientY, msg })
                }}
                style={{
                  display: 'flex',
                  justifyContent: isMine ? 'flex-end' : 'flex-start',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {selectionMode && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      toggleSelect(msg.id)
                    }}
                    style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    {isSelected ? (
                      <CheckCircle size={20} color={c.primary} />
                    ) : (
                      <Circle size={20} color={c.mutedText} />
                    )}
                  </button>
                )}
                <div
                  style={{
                    maxWidth: '78%',
                    padding: '10px 12px',
                    borderRadius: isMine ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                    background: isMine ? bubbleMine : bubbleOther,
                    color: isMine ? 'white' : c.text,
                    border: isMine ? 'none' : `1px solid ${c.border}`,
                    boxShadow: isSelected ? `0 0 0 2px ${c.primary}` : 'none',
                  }}
                >
                  {isImage && msg.fileUrl && (
                    <a href={resolveChatFileUrl(msg.fileUrl)} target="_blank" rel="noreferrer">
                      <img
                        src={resolveChatFileUrl(msg.fileUrl)}
                        alt={msg.fileName ?? ''}
                        style={{
                          display: 'block',
                          width: '100%',
                          maxWidth: 240,
                          maxHeight: 220,
                          borderRadius: 12,
                          objectFit: 'cover',
                          marginBottom: msg.text ? 6 : 0,
                        }}
                      />
                    </a>
                  )}
                  {msg.messageType === 'document' && (
                    <a
                      href={msg.fileUrl ? resolveChatFileUrl(msg.fileUrl) : undefined}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        textDecoration: 'none',
                        color: 'inherit',
                        marginBottom: msg.text ? 6 : 0,
                      }}
                    >
                      <FileText size={22} color={isMine ? 'rgba(255,255,255,0.85)' : c.primary} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {msg.fileName ?? tr.msgPreviewFile}
                        </p>
                        {msg.fileSize != null && (
                          <p style={{ fontSize: 11, opacity: 0.7 }}>{formatBytes(msg.fileSize)}</p>
                        )}
                      </div>
                    </a>
                  )}
                  {msg.text ? (
                    <p style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.text}
                    </p>
                  ) : null}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 4,
                      opacity: 0.7,
                    }}
                  >
                    <span style={{ fontSize: 10 }}>{formatTime(msg.createdAt)}</span>
                    {isMine &&
                      (msg.isRead ? (
                        <CheckCheck size={14} color={dark ? '#B8ADFF' : '#C4B5FD'} />
                      ) : (
                        <Check size={14} color="rgba(255,255,255,0.7)" />
                      ))}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {!selectionMode && (
          <div
            className="lm-chat-composer"
            style={{
              borderTop: `1px solid ${c.border}`,
              background: c.card,
              /* Navbar yo'q: faqat klaviatura yoki tizim tugmalari */
              padding: '10px 12px max(var(--ime-bottom), var(--safe-bottom))',
              position: 'relative',
              flexShrink: 0,
              zIndex: 60,
            }}
          >
            {pendingFile && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8,
                  padding: 8,
                  borderRadius: 12,
                  background: c.muted,
                }}
              >
                {pendingFile.messageType === 'image' && pendingFile.fullUrl ? (
                  <img
                    src={pendingFile.fullUrl}
                    alt=""
                    style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }}
                  />
                ) : (
                  <FileText size={28} color={c.primary} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pendingFile.fileName}
                  </p>
                  <p style={{ fontSize: 11, color: c.mutedText }}>{formatBytes(pendingFile.fileSize)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  <X size={18} color={c.mutedText} />
                </button>
              </div>
            )}

            {showAttach && (
              <>
                <div
                  role="presentation"
                  onClick={() => setShowAttach(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 4,
                    background: 'transparent',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 12,
                    marginBottom: 8,
                    background: c.card,
                    border: `1px solid ${c.border}`,
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                    zIndex: 5,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttach(false)
                      imageInputRef.current?.click()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'none',
                      color: c.text,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    <ImageIcon size={18} color={c.primary} /> {tr.msgAttachPhoto}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttach(false)
                      docInputRef.current?.click()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'none',
                      color: c.text,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    <FileText size={18} color={c.gold} /> {tr.msgAttachDoc}
                  </button>
                </div>
              </>
            )}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) void handleFilePick(f)
                e.target.value = ''
              }}
            />
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) void handleFilePick(f)
                e.target.value = ''
              }}
            />

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowAttach(v => !v)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: 'none',
                  background: c.muted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Paperclip size={18} color={c.mutedText} />
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void handleSend()
                  }
                }}
                rows={1}
                placeholder={tr.msgPlaceholder}
                style={{
                  flex: 1,
                  resize: 'none',
                  borderRadius: 16,
                  border: `1px solid ${c.border}`,
                  background: c.muted,
                  color: c.text,
                  padding: '11px 14px',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                  maxHeight: 100,
                }}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={(!input.trim() && !pendingFile) || sending}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: 'none',
                  background: c.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: (!input.trim() && !pendingFile) || sending ? 0.5 : 1,
                }}
              >
                <Send size={18} color="white" />
              </button>
            </div>
          </div>
        )}

        {contextMenu && (
          <div
            style={{
              position: 'fixed',
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - 160),
              zIndex: 80,
              background: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: 16,
              minWidth: 180,
              boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                const text = contextMenu.msg.text || contextMenu.msg.fileName || ''
                if (text) void navigator.clipboard.writeText(text)
                setContextMenu(null)
              }}
              style={menuBtn(c.text)}
            >
              <Copy size={16} color={c.mutedText} /> {tr.msgCopy}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedIds(new Set([contextMenu.msg.id]))
                setDeleteForEveryone(
                  activeConv ? contextMenu.msg.senderId !== activeConv.otherUser.id : false,
                )
                setShowDeleteDialog(true)
                setContextMenu(null)
              }}
              style={menuBtn('#F44336')}
            >
              <Trash2 size={16} color="#F44336" /> {tr.msgDelete}
            </button>
          </div>
        )}

        {showDeleteDialog && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 90,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 340,
                background: c.card,
                borderRadius: 20,
                padding: 20,
                border: `1px solid ${c.border}`,
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 700, color: c.text, marginBottom: 14 }}>
                {tr.msgDeleteConfirm}
              </p>
              {canDeleteForAll && (
                <label
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    marginBottom: 18,
                    color: c.text,
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={deleteForEveryone}
                    onChange={e => setDeleteForEveryone(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>{tr.msgDeleteForAll.replace('{name}', activeConv.otherUser.fullName)}</span>
                </label>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteDialog(false)}
                  style={{ border: 'none', background: 'none', color: c.mutedText, fontWeight: 700, cursor: 'pointer' }}
                >
                  {tr.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDelete()}
                  disabled={deleting}
                  style={{ border: 'none', background: 'none', color: '#F44336', fontWeight: 800, cursor: 'pointer' }}
                >
                  {tr.msgDelete}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: c.bg,
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 'calc(100px + var(--safe-bottom))',
      }}
    >
      <div
        style={{
          padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 12px max(16px, var(--safe-right))',
          background: dark ? 'rgba(8,8,18,0.92)' : 'rgba(248,249,252,0.92)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: 'rgba(108,92,231,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageSquare size={20} color={c.primary} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, flex: 1 }}>{tr.messagesNav}</h1>
          <button
            type="button"
            onClick={() => setListTab('contacts')}
            title={tr.msgStartChat}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: 'none',
              background: c.muted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <PenSquare size={16} color={c.text} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 14,
            background: c.muted,
            marginBottom: 10,
          }}
        >
          <Search size={16} color={c.mutedText} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tr.search}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: c.text,
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(
            [
              { id: 'chats' as const, label: tr.msgChatsTab },
              { id: 'contacts' as const, label: tr.msgContactsTab },
              { id: 'clients' as const, label: tr.msgClientsTab },
            ] as const
          ).map(tab => {
            const active = listTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setListTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  background: active ? 'rgba(108,92,231,0.15)' : 'transparent',
                  color: active ? c.primary : c.mutedText,
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 32, fontSize: 14 }}>{tr.loading}</p>
        ) : listTab === 'chats' ? (
          filteredConversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <MessageSquare size={40} color={c.mutedText} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
              <p style={{ color: c.mutedText, fontSize: 14, marginBottom: 14 }}>{tr.msgNoChats}</p>
              <button
                type="button"
                onClick={() => setListTab('contacts')}
                style={{
                  border: 'none',
                  borderRadius: 14,
                  padding: '10px 16px',
                  background: c.primary,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {tr.msgStartChat}
              </button>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                type="button"
                onClick={() => void openConversation(conv.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${c.border}`,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: avatarColor(conv.otherUser.id),
                    color: 'white',
                    fontWeight: 800,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {initials(conv.otherUser.fullName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: c.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {conv.otherUser.fullName}
                    </span>
                    {conv.lastMessage && (
                      <span style={{ fontSize: 11, color: c.mutedText, flexShrink: 0 }}>
                        {formatTime(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                    <p
                      style={{
                        fontSize: 12,
                        color: c.mutedText,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {conv.lastMessage ? previewText(conv.lastMessage, tr) : tr.msgNewChat}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span
                        style={{
                          minWidth: 18,
                          height: 18,
                          borderRadius: 99,
                          background: c.primary,
                          color: 'white',
                          fontSize: 10,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 5px',
                          flexShrink: 0,
                        }}
                      >
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )
        ) : listTab === 'contacts' ? (
          filteredContacts.length === 0 ? (
            <p style={{ textAlign: 'center', color: c.mutedText, padding: 32, fontSize: 14 }}>{tr.msgNoContacts}</p>
          ) : (
            filteredContacts.map(contact => (
              <ContactRow
                key={contact.id}
                contact={contact}
                tr={tr}
                dark={dark}
                onClick={() => void startWithContact(contact)}
              />
            ))
          )
        ) : filteredClients.length === 0 ? (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 32, fontSize: 14 }}>{tr.msgNoClients}</p>
        ) : (
          filteredClients.map(contact => (
            <ContactRow
              key={contact.id}
              contact={contact}
              tr={tr}
              dark={dark}
              onClick={() => void startWithContact(contact)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ContactRow({
  contact,
  tr,
  dark,
  onClick,
}: {
  contact: ChatContact
  tr: Translations
  dark: boolean
  onClick: () => void
}) {
  const c = theme(dark)
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        borderBottom: `1px solid ${c.border}`,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          background: avatarColor(contact.id),
          color: 'white',
          fontWeight: 800,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {initials(contact.fullName)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: c.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {contact.fullName}
        </p>
        <p style={{ fontSize: 12, color: c.mutedText, marginTop: 2 }}>{roleLabel(contact.role, tr)}</p>
      </div>
      <span style={{ fontSize: 11, color: c.mutedText, flexShrink: 0 }}>@{contact.username}</span>
    </button>
  )
}

function menuBtn(color: string): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    background: 'none',
    color,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
  }
}
