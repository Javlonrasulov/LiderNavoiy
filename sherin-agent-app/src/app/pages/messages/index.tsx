import { useState, useEffect } from 'react';
import { Search, Edit, ChevronLeft } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { useNavigate } from 'react-router';
import BottomNav from '../../components/BottomNav';

export interface ChatUser {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
}

export const chatUsers: ChatUser[] = [
  { id: 'diyorbek', name: 'Diyorbek Abdujaqimov', role: 'Agent', initials: 'DA', color: '#3b82f6' },
  { id: 'jasur', name: 'Jasur Nazarov', role: 'Agent', initials: 'JN', color: '#10b981' },
  { id: 'sherzod', name: 'Sherzod Qodirov', role: 'Agent', initials: 'SQ', color: '#f59e0b' },
  { id: 'sanjar', name: 'Sanjar Toshmatov', role: 'Agent', initials: 'ST', color: '#8b5cf6' },
  { id: 'bobur', name: 'Bobur Mirzayev', role: 'Agent', initials: 'BM', color: '#ef4444' },
  { id: 'eldor', name: 'Eldor Yusupov', role: 'Agent', initials: 'EY', color: '#06b6d4' },
  { id: 'timur', name: 'Timur Raxmatullayev', role: 'Agent', initials: 'TR', color: '#f97316' },
  { id: 'ravshan', name: 'Ravshan Holmatov', role: 'Agent', initials: 'RH', color: '#84cc16' },
  { id: 'manager', name: 'Dilshod Rahimov', role: 'Menejer', initials: 'DR', color: '#ec4899' },
  { id: 'director', name: 'Aziz Karimov', role: 'Direktor', initials: 'AK', color: '#6366f1' },
];

export const ME_ID = 'diyorbek';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  read: boolean;
  file?: {
    name: string;
    size: number;
    type: string;
    url: string; // base64 or object URL
  };
}

export interface Chat {
  id: string;
  userId: string;
  messages: Message[];
}

const STORAGE_KEY = 'crm_chats';

export function getChats(): Chat[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultChats;
}

export function saveChats(chats: Chat[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

const now = new Date();
function timeAgo(h: number, m: number) {
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const defaultChats: Chat[] = [
  {
    id: 'chat_jasur',
    userId: 'jasur',
    messages: [
      { id: '1', senderId: 'jasur', text: 'Salom, bugun nechta mijoz bor?', time: timeAgo(9, 15), read: true },
      { id: '2', senderId: ME_ID, text: '8 ta mijoz bor, hammasi tayyor', time: timeAgo(9, 20), read: true },
      { id: '3', senderId: 'jasur', text: 'Zo\'r! Plan bajarilsinchi', time: timeAgo(9, 22), read: true },
    ],
  },
  {
    id: 'chat_manager',
    userId: 'manager',
    messages: [
      { id: '1', senderId: 'manager', text: 'Bugungi hisobotni yuboring', time: timeAgo(11, 0), read: true },
      { id: '2', senderId: ME_ID, text: 'Xop, hozir tayorlayman', time: timeAgo(11, 5), read: true },
      { id: '3', senderId: 'manager', text: 'Iltimos tezroq', time: timeAgo(11, 10), read: false },
    ],
  },
  {
    id: 'chat_sherzod',
    userId: 'sherzod',
    messages: [
      { id: '1', senderId: ME_ID, text: 'Sheringa nechchi foiz?', time: timeAgo(14, 30), read: true },
      { id: '2', senderId: 'sherzod', text: '88% chi, yaxshi ketmoqda', time: timeAgo(14, 35), read: true },
    ],
  },
  {
    id: 'chat_director',
    userId: 'director',
    messages: [
      { id: '1', senderId: 'director', text: 'Ertaga yig\'ilish bor, keling', time: timeAgo(16, 0), read: false },
    ],
  },
  {
    id: 'chat_sanjar',
    userId: 'sanjar',
    messages: [
      { id: '1', senderId: 'sanjar', text: 'Ok tushundim', time: timeAgo(8, 45), read: true },
    ],
  },
  {
    id: 'chat_bobur',
    userId: 'bobur',
    messages: [
      { id: '1', senderId: 'bobur', text: 'Rahmat kattakon', time: timeAgo(7, 30), read: true },
    ],
  },
];

function getLastMessage(chat: Chat) {
  return chat.messages[chat.messages.length - 1];
}

function getUnreadCount(chat: Chat) {
  return chat.messages.filter(m => !m.read && m.senderId !== ME_ID).length;
}

function getUserById(id: string) {
  return chatUsers.find(u => u.id === id);
}

export default function Messages() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>(getChats);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const stored = getChats();
    setChats(stored);
  }, []);

  const t = {
    uz_latn: { title: 'Xabarlar', search: 'Qidirish...', noChats: 'Xabar yo\'q' },
    uz_cyrl: { title: 'Хабарлар', search: 'Қидириш...', noChats: 'Хабар йўқ' },
    ru: { title: 'Сообщения', search: 'Поиск...', noChats: 'Нет сообщений' },
  }[language];

  const filtered = chats.filter(chat => {
    const user = getUserById(chat.userId);
    if (!user) return false;
    return user.name.toLowerCase().includes(search.toLowerCase());
  });

  // Sort: chats with last message time descending
  const sorted = [...filtered].sort((a, b) => {
    const aLast = getLastMessage(a);
    const bLast = getLastMessage(b);
    if (!aLast) return 1;
    if (!bLast) return -1;
    return bLast.time.localeCompare(aLast.time);
  });

  const totalUnread = chats.reduce((s, c) => s + getUnreadCount(c), 0);

  return (
    <div
      className={`min-h-screen ${isDark ? 'bg-black' : 'bg-gray-50'} transition-colors duration-300`}
      style={{ scrollbarWidth: 'none' }}
    >
      <style>{`::-webkit-scrollbar{display:none}`}</style>
      <div className="max-w-md mx-auto flex flex-col min-h-screen">

        {/* Header */}
        <div className={`relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900'
            : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="relative px-5 pt-8 pb-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate('/')}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-white text-lg tracking-wide">{t.title}</h1>
                {totalUnread > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                    {totalUnread}
                  </span>
                )}
              </div>
              <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                <Edit className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Search */}
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20`}>
              <Search className="w-4 h-4 text-white/60 flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.search}
                className="flex-1 bg-transparent text-white placeholder-white/50 text-sm outline-none"
              />
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: 'none' }}>
          {sorted.map((chat, idx) => {
            const user = getUserById(chat.userId);
            if (!user) return null;
            const last = getLastMessage(chat);
            const unread = getUnreadCount(chat);
            const isFromMe = last?.senderId === ME_ID;

            return (
              <div key={chat.id}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                    isDark ? 'hover:bg-white/5 active:bg-white/10' : 'hover:bg-gray-100 active:bg-gray-200'
                  }`}
                  onClick={() => navigate(`/messages/${chat.id}`, { state: { chat, user } })}
                >
                  {/* Avatar */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-white relative"
                    style={{ background: user.color }}
                  >
                    <span className="text-base">{user.initials}</span>
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-black">
                        {unread}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm truncate ${isDark ? 'text-white' : 'text-black'}`}>
                        {user.name}
                      </span>
                      <span className={`text-xs flex-shrink-0 ml-2 ${
                        unread > 0 ? 'text-blue-400' : isDark ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {last?.time || ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isFromMe && (
                        <span className={`text-xs flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>✓✓</span>
                      )}
                      <p className={`text-sm truncate ${
                        unread > 0
                          ? isDark ? 'text-gray-300' : 'text-gray-700'
                          : isDark ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {last?.text || ''}
                      </p>
                    </div>
                  </div>
                </button>
                {/* Divider */}
                {idx < sorted.length - 1 && (
                  <div className={`ml-20 h-px ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />
                )}
              </div>
            );
          })}
        </div>

        <BottomNav activePage="messages" onNavigate={(page) => {
          if (page === 'home') navigate('/');
          else if (page === 'dostavka') navigate('/visit');
          else if (page === 'locatsiya') navigate('/locatsiya');
          else if (page === 'plan') navigate('/plan');
          else if (page === 'messages') navigate('/messages');
        }} />
      </div>
    </div>
  );
}