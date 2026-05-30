import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, Check, CheckCheck, Paperclip, FileText, Image as ImageIcon, X } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { useNavigate, useParams, useLocation } from 'react-router';
import {
  chatUsers,
  getChats,
  saveChats,
  ME_ID,
  type Chat as ChatType,
  type Message,
  type ChatUser,
} from './index';

function groupByDate(messages: Message[]): { date: string; msgs: Message[] }[] {
  const groups: { date: string; msgs: Message[] }[] = [];
  let current: string | null = null;
  messages.forEach(msg => {
    const dateLabel = 'Bugun';
    if (current !== dateLabel) {
      current = dateLabel;
      groups.push({ date: dateLabel, msgs: [] });
    }
    groups[groups.length - 1].msgs.push(msg);
  });
  return groups;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return ImageIcon;
  return FileText;
}

export default function Chat() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const chatId = params.chatId || '';
  const [chats, setChats] = useState<ChatType[]>(getChats);
  const [inputText, setInputText] = useState('');
  const [pendingFile, setPendingFile] = useState<Message['file'] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentChat = chats.find(c => c.id === chatId);
  const otherUserId = currentChat?.userId || (location.state?.user as ChatUser)?.id;
  const otherUser = chatUsers.find(u => u.id === otherUserId);

  const t = {
    uz_latn: {
      offline: 'yaqinda ko\'rindi',
      placeholder: 'Xabar...',
      today: 'Bugun',
      file: 'Fayl',
    },
    uz_cyrl: {
      offline: 'яқинда кўринди',
      placeholder: 'Хабар...',
      today: 'Бугун',
      file: 'Файл',
    },
    ru: {
      offline: 'был(а) недавно',
      placeholder: 'Сообщение...',
      today: 'Сегодня',
      file: 'Файл',
    },
  }[language];

  // Mark messages as read
  useEffect(() => {
    if (!currentChat) return;
    const updated = chats.map(c => {
      if (c.id !== chatId) return c;
      return {
        ...c,
        messages: c.messages.map(m =>
          m.senderId !== ME_ID ? { ...m, read: true } : m
        ),
      };
    });
    setChats(updated);
    saveChats(updated);
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, chatId]);

  const getTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const addMessage = (msg: Message) => {
    setChats(prev => {
      const updated = prev.map(c => {
        if (c.id !== chatId) return c;
        return { ...c, messages: [...c.messages, msg] };
      });
      saveChats(updated);
      return updated;
    });
  };

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text && !pendingFile) return;
    if (!currentChat) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      senderId: ME_ID,
      text,
      time: getTime(),
      read: false,
      ...(pendingFile ? { file: pendingFile } : {}),
    };

    addMessage(newMsg);
    setInputText('');
    setPendingFile(null);

    // Simulate reply
    if (otherUser) {
      const replies = [
        'Xop, tushundim! 👍',
        'Rahmat, ko\'rib chiqaman',
        'Ok, hozir',
        'Ha, to\'g\'ri',
        'Zo\'r, rahmat!',
        'Yaxshi, tushundim',
      ];
      setTimeout(() => {
        addMessage({
          id: (Date.now() + 1).toString(),
          senderId: otherUser.id,
          text: replies[Math.floor(Math.random() * replies.length)],
          time: getTime(),
          read: true,
        });
      }, 800 + Math.random() * 1200);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingFile({
        name: file.name,
        size: file.size,
        type: file.type,
        url: ev.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  if (!otherUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
        <p className={isDark ? 'text-white' : 'text-black'}>Chat topilmadi</p>
      </div>
    );
  }

  const messages = currentChat?.messages || [];
  const grouped = groupByDate(messages);

  const bg = isDark ? 'bg-[#0d0d0d]' : 'bg-[#efeae2]';
  const headerBg = isDark
    ? 'bg-[#1a1a2e]'
    : 'bg-gradient-to-r from-blue-600 to-indigo-600';

  return (
    <div
      className={`min-h-screen flex flex-col max-w-md mx-auto ${bg}`}
      style={{ scrollbarWidth: 'none' }}
    >
      <style>{`::-webkit-scrollbar{display:none}`}</style>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="*/*"
      />

      {/* ── Header ── */}
      <div className={`${headerBg} px-4 pt-12 pb-3 flex items-center gap-3 flex-shrink-0 shadow-md`}>
        <button
          onClick={() => navigate('/messages')}
          className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center active:bg-white/25"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md"
          style={{ background: otherUser.color }}
        >
          <span className="text-sm">{otherUser.initials}</span>
        </div>

        {/* Name & Status */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate">{otherUser.name}</p>
          <p className="text-white/60 text-xs">{otherUser.role} · {t.offline}</p>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{ scrollbarWidth: 'none' }}
      >
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            {/* Date chip */}
            <div className="flex justify-center my-3">
              <span className={`text-xs px-3 py-1 rounded-full shadow-sm ${
                isDark ? 'bg-gray-800/80 text-gray-400' : 'bg-white/80 text-gray-500'
              }`}>
                {date === 'Bugun' ? t.today : date}
              </span>
            </div>

            {msgs.map((msg, i) => {
              const isMe = msg.senderId === ME_ID;
              const sender = chatUsers.find(u => u.id === msg.senderId);
              const prevMsg = i > 0 ? msgs[i - 1] : null;
              const isFirst = !prevMsg || prevMsg.senderId !== msg.senderId;
              const isImage = msg.file?.type.startsWith('image/');
              const FileIcon = msg.file ? getFileIcon(msg.file.type) : FileText;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-1'}`}
                >
                  {/* Avatar on left for others */}
                  {!isMe && (
                    <div className="w-8 flex-shrink-0 mr-1 flex items-end">
                      {isFirst && sender && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white mb-0.5 shadow"
                          style={{ background: sender.color, fontSize: 10 }}
                        >
                          {sender.initials}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl overflow-hidden shadow-sm ${
                        isMe
                          ? 'bg-blue-500 rounded-br-sm'
                          : isDark
                          ? 'bg-[#1e2a38] rounded-bl-sm'
                          : 'bg-white rounded-bl-sm'
                      }`}
                    >
                      {/* Image preview */}
                      {msg.file && isImage && (
                        <div className="relative">
                          <img
                            src={msg.file.url}
                            alt={msg.file.name}
                            className="max-w-full max-h-52 object-cover"
                          />
                          {/* Overlay time on image */}
                          <div className="absolute bottom-1 right-2 flex items-center gap-1">
                            <span className="text-white/90 text-xs drop-shadow">{msg.time}</span>
                            {isMe && (
                              msg.read
                                ? <CheckCheck className="w-3.5 h-3.5 text-white/90 drop-shadow" />
                                : <Check className="w-3.5 h-3.5 text-white/90 drop-shadow" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Non-image file */}
                      {msg.file && !isImage && (
                        <div className={`flex items-center gap-3 px-3 py-3 ${msg.text ? '' : 'pb-2'}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isMe ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-blue-50'
                          }`}>
                            <FileIcon className={`w-5 h-5 ${isMe ? 'text-white' : 'text-blue-500'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm truncate max-w-[150px] ${isMe ? 'text-white' : isDark ? 'text-white' : 'text-black'}`}>
                              {msg.file.name}
                            </p>
                            <p className={`text-xs ${isMe ? 'text-blue-100' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {formatBytes(msg.file.size)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Text (if any, skip time for image) */}
                      {(!msg.file || !isImage) && (
                        <div className={`px-3 ${msg.file ? 'pt-0 pb-2' : 'py-2'}`}>
                          {msg.text && (
                            <p
                              className={`text-sm leading-relaxed ${isMe ? 'text-white' : isDark ? 'text-white' : 'text-black'}`}
                              style={{ wordBreak: 'break-word' }}
                            >
                              {msg.text}
                            </p>
                          )}
                          <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-xs ${isMe ? 'text-blue-100' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {msg.time}
                            </span>
                            {isMe && (
                              msg.read
                                ? <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                                : <Check className="w-3.5 h-3.5 text-blue-200" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className={`flex-shrink-0 px-3 py-3 ${isDark ? 'bg-[#1a1a2e]' : 'bg-[#f0f2f5]'}`}>

        {/* Pending file preview */}
        {pendingFile && (
          <div className={`flex items-center gap-3 mb-2 px-3 py-2 rounded-2xl ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            {pendingFile.type.startsWith('image/') ? (
              <img src={pendingFile.url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${isDark ? 'text-white' : 'text-black'}`}>{pendingFile.name}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatBytes(pendingFile.size)}</p>
            </div>
            <button
              onClick={() => setPendingFile(null)}
              className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Text input */}
          <div className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-full ${
            isDark ? 'bg-[#2a2a3e]' : 'bg-white'
          }`}>
            {/* Attach button inside input */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex-shrink-0 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <input
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              className={`flex-1 bg-transparent text-sm outline-none ${
                isDark ? 'text-white placeholder-gray-500' : 'text-black placeholder-gray-400'
              }`}
            />
          </div>

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() && !pendingFile}
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
              inputText.trim() || pendingFile
                ? 'bg-blue-500 shadow-lg shadow-blue-500/40 scale-100'
                : isDark ? 'bg-[#2a2a3e]' : 'bg-white'
            }`}
          >
            <Send
              className={`w-5 h-5 ${
                inputText.trim() || pendingFile
                  ? 'text-white'
                  : isDark ? 'text-gray-600' : 'text-gray-400'
              }`}
              style={{ transform: 'rotate(0deg)' }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
