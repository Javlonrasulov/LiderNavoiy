import { useEffect, useRef, useState } from 'react';
import { X, Check, Save, MapPin, ChevronDown, Maximize2, Minimize2, Camera, Plus, Trash2 } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface AddClientProps { onClose: () => void; }
type TabKey = 'rekvizit' | 'kontakt' | 'yonalish' | 'xarita' | 'foto' | 'status';

const TRANS = {
  uz_latn: {
    saveClose: "Saqlash va yopish", close: "Yopish",
    addNew: "Yangi mijoz qo'shish",
    tabs: ["Rekvizitlar", "Kontaktlar", "Yo'nalishlar", "Xarita", "Foto", "Holat"],
    secNomi: "NOMI", secBank: "BANK", secOrg: "TASHKILOT",
    secGps: "GPS / MANZIL", secInn: "INN / JSHSHIR",
    secAkt: "TASDIQLANGAN AKT-SVERKA", secSizes: "O'LCHAMLAR",
    kod: "Kod", liniya: "Liniya", onTradeId: "OnTradeID",
    name: "Nomi", officialName: "Rasmiy nomi", legalAddr: "Yuridik manzil",
    landmark: "Orientir", phones: "Telefonlar", bankAcc: "Hisob raqam",
    mfo: "MFO", bank: "Bank", cls: "Sinf", type: "Tur",
    director: "Rahbar", chiefAcc: "Bosh buxgalter", channel: "Kanal",
    gps: "GPS koordinatalari", priceZone: "Narx zonasi",
    budget: "ЦХР (byudjet)", mainContract: "Asosiy shartnoma", note: "Izoh",
    inn: "INN", territory: "Hudud", settlement: "Aholi punkti",
    pinfl: "JSHSHIR", telegram: "Telegram",
    actDate: "Sana", actSum: "Summa",
    callCentre: "Call centre", tradeAgent: "Savdo agenti",
    noDelay: "Kechiktirishni taqiqlash", routeList: "Marshrut ro'yxatida",
    sizes: "O'lchamlar", sizeSq: "m²", sizeW: "Eni (m)", sizeH: "Bo'yi (m)",
    statusActive: "Faol", statusInactive: "Nofaol",
    loading: "Joylashuv aniqlanmoqda...",
    contactPerson: "Kontakt shaxs", contactPhone: "Tel", contactRole: "Lavozim",
    addContact: "Kontakt qo'shish",
    photoSection: "Fotosuratlar", addPhoto: "Rasm qo'shish",
    statusSection: "Holat", registrationDate: "Ro'yxatga olingan", comment: "Izoh",
    category: "Kategoriya", agent: "Agent",
    directionNo: "№", directionName: "Yo'nalish",
  },
  uz_cyrl: {
    saveClose: "Сақлаш ва ёпиш", close: "Ёпиш",
    addNew: "Янги мижоз қўшиш",
    tabs: ["Реквизитлар", "Контактлар", "Йўналишлар", "Харита", "Фото", "Ҳолат"],
    secNomi: "НОМИ", secBank: "БАНК", secOrg: "ТАШКИЛОТ",
    secGps: "GPS / МАНЗИЛ", secInn: "ИНН / ЖШШИР",
    secAkt: "ТАСДИҚЛАНГАН АКТ-СВЕРКА", secSizes: "ЎЛЧАМЛАР",
    kod: "Код", liniya: "Линия", onTradeId: "OnTradeID",
    name: "Номи", officialName: "Расмий номи", legalAddr: "Юридик манзил",
    landmark: "Ориентир", phones: "Телефонлар", bankAcc: "Ҳисоб рақам",
    mfo: "МФО", bank: "Банк", cls: "Синф", type: "Тур",
    director: "Раҳбар", chiefAcc: "Бош бухгалтер", channel: "Канал",
    gps: "GPS координаталари", priceZone: "Нарх зонаси",
    budget: "ЦХР (бюджет)", mainContract: "Асосий шартнома", note: "Изоҳ",
    inn: "ИНН", territory: "Ҳудуд", settlement: "Аҳоли пункти",
    pinfl: "ЖШШИР", telegram: "Телеграм",
    actDate: "Сана", actSum: "Сумма",
    callCentre: "Call centre", tradeAgent: "Савдо агенти",
    noDelay: "Кечиктиришни тақиқлаш", routeList: "Маршрут рўйхатида",
    sizes: "Ўлчамлар", sizeSq: "м²", sizeW: "Эни (м)", sizeH: "Бўйи (м)",
    statusActive: "Фаол", statusInactive: "Нофаол",
    loading: "Жойлашув аниқланмоқда...",
    contactPerson: "Контакт шахс", contactPhone: "Тел", contactRole: "Лавозим",
    addContact: "Контакт қўшиш",
    photoSection: "Фотосуратлар", addPhoto: "Расм қўшиш",
    statusSection: "Ҳолат", registrationDate: "Рўйхатга олинган", comment: "Изоҳ",
    category: "Категория", agent: "Агент",
    directionNo: "№", directionName: "Йўналиш",
  },
  ru: {
    saveClose: "Записать и закрыть", close: "Закрыть",
    addNew: "Новый клиент",
    tabs: ["Реквизиты", "Контакты", "Направления", "Карта", "Фото", "Статус"],
    secNomi: "НАИМЕНОВАНИЕ", secBank: "БАНК", secOrg: "ОРГАНИЗАЦИЯ",
    secGps: "GPS / АДРЕС", secInn: "ИНН / ПИНФЛ",
    secAkt: "ПОДТВЕРЖДЁННЫЙ АКТ СВЕРКИ", secSizes: "РАЗМЕРЫ",
    kod: "Код", liniya: "Линия", onTradeId: "OnTradeID",
    name: "Наименование", officialName: "Офиц. наименование", legalAddr: "Юридиеский адрес",
    landmark: "Ориентир", phones: "Телефоны", bankAcc: "Расчётный счёт",
    mfo: "МФО", bank: "Банк", cls: "Класс", type: "Тип",
    director: "Руководитель", chiefAcc: "Глав. бух", channel: "Канал",
    gps: "GPS координаты", priceZone: "Прайс зона",
    budget: "ЦХР (бюджет)", mainContract: "Основной договор", note: "Примечание",
    inn: "ИНН", territory: "Территория", settlement: "Насел. пункт",
    pinfl: "ПИНФЛ", telegram: "Телеграм",
    actDate: "Дата", actSum: "Сумма",
    callCentre: "Call centre", tradeAgent: "Торг. агент",
    noDelay: "Запретить отсрочку", routeList: "Включён в маршрут",
    sizes: "Размеры", sizeSq: "м²", sizeW: "Ширина (м)", sizeH: "Высота (м)",
    statusActive: "Активный", statusInactive: "Неактивный",
    loading: "Определяется местоположение...",
    contactPerson: "Контактное лицо", contactPhone: "Тел", contactRole: "Должность",
    addContact: "Добавить контакт",
    photoSection: "Фотографии", addPhoto: "Добавить фото",
    statusSection: "Статус", registrationDate: "Дата регистрации", comment: "Комментарий",
    category: "Категория", agent: "Агент",
    directionNo: "№", directionName: "Направление",
  },
};

const DIRECTIONS  = ["SHERIN", "SOF IN", "NAVOIY NORTH", "ATLAS", "BORAN", "ZARAFSHON"];
const LINES       = ["01 - Toshrabot. Xazora. Air.", "02 - Navoiy Shimol", "03 - Karmana", "04 - Konimex", "05 - Markaz"];
const CLASSES     = ["BM - Bozordagi dukon", "SM - Supermarket", "PM - Premium market", "KS - Kichik savdo"];
const TYPES       = ["Torgovaya tochka", "Ulgurji", "Distributtor", "Restorant / Kafe"];
const CHANNELS    = ["Retail", "Horeca", "Wholesale", "Online"];
const PRICE_ZONES = ["Toshrabot. Xazora. Airoport.", "Navoiy Shimol", "Karmana", "Konimex"];
const CATEGORIES  = ["Standard", "VIP", "Premium"];
const AGENTS      = ["Alisher Karimov", "Bobur Yusupov", "Dilshod Toshmatov", "Eldor Nazarov"];

export default function AddClient({ onClose }: AddClientProps) {
  const { isDark } = useTheme();
  const { lang } = useLang();
  const D = isDark;

  // Map admin lang keys → TRANS keys
  const langKey = lang === 'cy' ? 'uz_cyrl' : lang === 'ru' ? 'ru' : 'uz_latn';
  const t = TRANS[langKey as keyof typeof TRANS] ?? TRANS.uz_latn;

  const [activeTab, setActiveTab]     = useState<TabKey>('rekvizit');
  const [isMaximized, setIsMaximized] = useState(false);
  const [openDrop, setOpenDrop]       = useState<string | null>(null);
  const [contacts, setContacts]       = useState([{ name: '', phone: '', role: '' }]);
  const [photos, setPhotos]           = useState<string[]>([]);
  const [form, setForm] = useState({
    kod: '', liniya: '', status: 'active', onTradeId: '', category: 'Standard',
    name: '', officialName: '', legalAddr: '', landmark: '', phones: '',
    bankAcc: '', mfo: '', bank: '', cls: '', type: '',
    director: '', chiefAcc: '', channel: '', gps: '', priceZone: '',
    budget: '', mainContract: '', note: '',
    inn: '', territory: '', settlement: '', pinfl: '', telegram: '',
    actDate: '', actSum: '', agent: '',
    noDelay: false, routeList: false,
    sizeW: '', sizeH: '', regDate: '', comment: '',
  });
  const [directions, setDirections] = useState<Record<string, boolean>>({
    SHERIN: true, "SOF IN": false, "NAVOIY NORTH": false,
    ATLAS: false, BORAN: false, ZARAFSHON: false,
  });
  const [gpsCoords, setGpsCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const mapRef          = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (activeTab === 'xarita' && mapContainerRef.current && !mapRef.current) {
      const init: [number, number] = gpsCoords ? [gpsCoords.lat, gpsCoords.lng] : [40.0844, 65.3792];
      const map = L.map(mapContainerRef.current, { zoomAnimation: false }).setView(init, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      const marker = L.marker(init, { draggable: true }).addTo(map);
      marker.on('dragend', (e: any) => {
        const ll = e.target.getLatLng();
        setGpsCoords({ lat: ll.lat, lng: ll.lng });
        set('gps', `${ll.lat.toFixed(6)},${ll.lng.toFixed(6)}`);
      });
      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng([e.latlng.lat, e.latlng.lng]);
        setGpsCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        set('gps', `${e.latlng.lat.toFixed(6)},${e.latlng.lng.toFixed(6)}`);
      });
      if (!gpsCoords && navigator.geolocation) {
        setLoadingLoc(true);
        navigator.geolocation.getCurrentPosition(p => {
          map.setView([p.coords.latitude, p.coords.longitude], 16);
          marker.setLatLng([p.coords.latitude, p.coords.longitude]);
          setGpsCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
          set('gps', `${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`);
          setLoadingLoc(false);
        }, () => setLoadingLoc(false));
      }
      mapRef.current = map;
    }
    return () => {
      if (activeTab !== 'xarita' && mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [activeTab]);

  /* ── Tokens ── */
  const bg      = D ? '#111111' : '#ffffff';
  const topBg   = D ? '#161616' : '#f8f9fa';
  const cellBg  = D ? '#1a1e2a' : '#f4f6fb';
  const divClr  = D ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const lblClr  = D ? '#6b7280' : '#9ca3af';
  const valClr  = D ? '#f9fafb' : '#111827';
  const inpBg   = D ? '#232b3a' : '#ffffff';
  const inpBdr  = D ? '#2d3748' : '#d1d5db';
  const focClr  = '#6366f1';
  const secBg   = D ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)';
  const secClr  = D ? '#818cf8' : '#4338ca';
  const dropBg  = D ? '#1e2535' : '#ffffff';
  const dropBdr = D ? '#2d3748' : '#e5e7eb';

  const TABS: { key: TabKey; label: string }[] = (t.tabs as string[]).map((lbl, i) => ({
    key: (['rekvizit', 'kontakt', 'yonalish', 'xarita', 'foto', 'status'] as TabKey[])[i],
    label: lbl,
  }));

  /* ── Helpers ── */
  const inpStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: inpBg, border: `1.5px solid ${inpBdr}`,
    borderRadius: 8, padding: '7px 10px',
    fontSize: 13, color: valClr, outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
    ...extra,
  });

  const onFoc = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = focClr;
    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
  };
  const onBlr = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = inpBdr;
    e.target.style.boxShadow = 'none';
  };

  /* ── Section header ── */
  const Sec = ({ label }: { label: string }) => (
    <div style={{
      background: secBg, padding: '6px 16px',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: secClr,
      borderTop: `1px solid ${divClr}`, borderBottom: `1px solid ${divClr}`,
    }}>{label}</div>
  );

  /* ── 2-column grid row ── */
  const Grid2 = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 0, borderBottom: `1px solid ${divClr}`,
    }}>
      {children}
    </div>
  );

  /* ── Single cell: label on top, input below ── */
  const Cell = ({
    label, field, type = 'text', mono = false, span = false,
  }: { label: string; field: string; type?: string; mono?: boolean; span?: boolean }) => (
    <div style={{
      padding: '8px 12px',
      borderRight: span ? 'none' : `1px solid ${divClr}`,
      gridColumn: span ? '1 / -1' : undefined,
      background: bg,
    }}>
      <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <input
        type={type}
        value={(form as any)[field]}
        onChange={e => set(field, e.target.value)}
        placeholder="..."
        style={inpStyle({ fontFamily: mono ? 'monospace' : 'inherit' })}
        onFocus={onFoc} onBlur={onBlr}
      />
    </div>
  );

  /* ── Dropdown cell ── */
  const DropCell = ({
    label, field, options, span = false,
  }: { label: string; field: string; options: string[]; span?: boolean }) => (
    <div style={{
      padding: '8px 12px', position: 'relative',
      borderRight: span ? 'none' : `1px solid ${divClr}`,
      gridColumn: span ? '1 / -1' : undefined,
      background: bg,
    }}>
      <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <button
        onClick={() => setOpenDrop(openDrop === field ? null : field)}
        style={{
          ...inpStyle({ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }),
          borderColor: openDrop === field ? focClr : inpBdr,
          boxShadow: openDrop === field ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
        } as React.CSSProperties}
      >
        <span style={{ fontSize: 13, color: (form as any)[field] ? valClr : lblClr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {(form as any)[field] || '...'}
        </span>
        <ChevronDown size={14} color={lblClr} style={{ flexShrink: 0, transform: openDrop === field ? 'rotate(180deg)' : '', transition: 'transform .15s' }} />
      </button>
      {openDrop === field && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 400 }} onClick={() => setOpenDrop(null)} />
          <div style={{
            position: 'absolute', left: 12, right: 12, top: 'calc(100% - 4px)', zIndex: 401,
            background: dropBg, border: `1px solid ${dropBdr}`, borderRadius: 10,
            boxShadow: '0 8px 28px rgba(0,0,0,0.18)', overflow: 'hidden',
          }}>
            {options.map(o => (
              <button key={o} onClick={() => { set(field, o); setOpenDrop(null); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13,
                  background: (form as any)[field] === o ? (D ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)') : 'none',
                  color: (form as any)[field] === o ? focClr : valClr,
                  border: 'none', borderBottom: `1px solid ${divClr}`, cursor: 'pointer',
                }}
                onMouseEnter={e => { if ((form as any)[field] !== o) (e.currentTarget as HTMLElement).style.background = D ? 'rgba(255,255,255,0.05)' : '#f5f5f5'; }}
                onMouseLeave={e => { if ((form as any)[field] !== o) (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >{o}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  /* ── Checkbox cell (spans full width) ── */
  const ChkCell = ({ label, field }: { label: string; field: string }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 12px', borderBottom: `1px solid ${divClr}`, background: bg,
    }}>
      <span style={{ fontSize: 13, color: valClr }}>{label}</span>
      <button
        onClick={() => set(field, !(form as any)[field])}
        style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          border: `2px solid ${(form as any)[field] ? focClr : inpBdr}`,
          background: (form as any)[field] ? focClr : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all .15s',
        }}>
        {(form as any)[field] && <Check size={11} color="#fff" />}
      </button>
    </div>
  );

  /* ── Small meta input ── */
  const MetaInp = ({ field, width, mono, placeholder = '...' }: { field: string; width: number; mono?: boolean; placeholder?: string }) => (
    <input
      value={(form as any)[field]}
      onChange={e => set(field, e.target.value)}
      placeholder={placeholder}
      style={{
        width, background: inpBg, border: `1.5px solid ${inpBdr}`,
        borderRadius: 7, padding: '4px 8px', fontSize: 12,
        fontFamily: mono ? 'monospace' : 'inherit',
        color: valClr, outline: 'none',
      }}
      onFocus={e => { e.target.style.borderColor = focClr; }}
      onBlur={e  => { e.target.style.borderColor = inpBdr; }}
    />
  );

  /* ── Meta dropdown ── */
  const MetaDrop = ({ field, options, width }: { field: string; options: string[]; width: number }) => (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpenDrop(openDrop === field ? null : field)}
        style={{
          width, background: inpBg, border: `1.5px solid ${openDrop === field ? focClr : inpBdr}`,
          borderRadius: 7, padding: '4px 8px', fontSize: 12,
          color: (form as any)[field] ? valClr : lblClr,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, cursor: 'pointer',
        }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {(form as any)[field] || '...'}
        </span>
        <ChevronDown size={11} color={lblClr} style={{ flexShrink: 0 }} />
      </button>
      {openDrop === field && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 400 }} onClick={() => setOpenDrop(null)} />
          <div style={{
            position: 'absolute', left: 0, top: '100%', marginTop: 3, zIndex: 401,
            background: dropBg, border: `1px solid ${dropBdr}`, borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: 200, overflow: 'hidden',
          }}>
            {options.map(o => (
              <button key={o} onClick={() => { set(field, o); setOpenDrop(null); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                  fontSize: 12, background: 'none', color: valClr, border: 'none',
                  borderBottom: `1px solid ${divClr}`, cursor: 'pointer',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D ? 'rgba(255,255,255,0.05)' : '#f5f5f5'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >{o}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  /* ── Modal size ── */
  const modalWrap: React.CSSProperties = isMaximized
    ? { position: 'fixed', inset: 12, borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
    : { position: 'relative', width: '100%', maxWidth: 680, maxHeight: '92vh', borderRadius: 16,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '0 16px' };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        background: D ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.42)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...modalWrap, background: bg,
          border: `1px solid ${D ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
          boxShadow: D ? '0 32px 80px rgba(0,0,0,0.8)' : '0 24px 60px rgba(0,0,0,0.14)',
        }}
      >

        {/* ── HEADER ── */}
        <div style={{
          background: topBg, borderBottom: `1px solid ${divClr}`,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 14px', height: 52, flexShrink: 0,
        }}>
          <div style={{ flex: 1 }} />
          <button onClick={() => setIsMaximized(v => !v)}
            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 7, border: 'none', cursor: 'pointer', background: 'transparent', color: lblClr }}>
            {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button onClick={onClose}
            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 7, border: 'none', cursor: 'pointer', background: 'transparent', color: lblClr }}>
            <X size={15} />
          </button>
        </div>

        {/* ── META ROW ── */}
        <div style={{
          background: topBg, borderBottom: `1px solid ${divClr}`,
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
          flexShrink: 0, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: lblClr }}>{t.kod}:</span>
            <MetaInp field="kod" width={60} mono />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 140, maxWidth: 240 }}>
            <span style={{ fontSize: 12, color: lblClr, flexShrink: 0 }}>{t.liniya}:</span>
            <MetaDrop field="liniya" options={LINES} width={160} />
          </div>
          <button onClick={() => set('status', form.status === 'active' ? 'inactive' : 'active')}
            style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: form.status === 'active' ? 'rgba(16,185,129,0.12)' : (D ? '#1f2937' : '#f3f4f6'),
              color: form.status === 'active' ? '#10b981' : lblClr,
            }}>
            {form.status === 'active' ? t.statusActive : t.statusInactive}
          </button>
          {/* Category dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setOpenDrop(openDrop === 'category' ? null : 'category')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px',
                borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: form.category === 'VIP' ? 'rgba(139,92,246,0.12)'
                  : form.category === 'Premium' ? 'rgba(167,139,250,0.12)' : 'rgba(99,102,241,0.1)',
                color: form.category === 'VIP' ? '#8b5cf6' : form.category === 'Premium' ? '#a78bfa' : focClr,
              }}>
              {form.category} <ChevronDown size={11} />
            </button>
            {openDrop === 'category' && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 400 }} onClick={() => setOpenDrop(null)} />
                <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, zIndex: 401,
                  background: dropBg, border: `1px solid ${dropBdr}`, borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: 120, overflow: 'hidden' }}>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => { set('category', c); setOpenDrop(null); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                        fontSize: 12, color: valClr, background: 'none', border: 'none',
                        borderBottom: `1px solid ${divClr}`, cursor: 'pointer' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D ? 'rgba(255,255,255,0.05)' : '#f5f5f5'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                    >{c}</button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: lblClr, whiteSpace: 'nowrap' }}>{t.onTradeId}:</span>
            <MetaInp field="onTradeId" width={60} mono />
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{
          background: bg, borderBottom: `1px solid ${divClr}`,
          display: 'flex', overflowX: 'auto', flexShrink: 0,
        }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                flexShrink: 0, padding: '10px 16px', fontSize: 13, fontWeight: 500,
                border: 'none', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap',
                borderBottom: activeTab === tab.key ? '2px solid ' + focClr : '2px solid transparent',
                marginBottom: -1,
                color: activeTab === tab.key ? focClr : lblClr, transition: 'color .15s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, background: cellBg }}>

          {/* ════ REKVIZITLAR ════ */}
          {activeTab === 'rekvizit' && (<>
            <Sec label={t.secNomi} />
            <Grid2>
              <Cell label={t.name}         field="name" />
              <Cell label={t.officialName} field="officialName" />
            </Grid2>
            <Grid2>
              <Cell label={t.legalAddr} field="legalAddr" />
              <Cell label={t.landmark}  field="landmark" />
            </Grid2>
            <Grid2>
              <Cell label={t.phones}  field="phones" type="tel" />
              <Cell label={t.bankAcc} field="bankAcc" mono />
            </Grid2>

            <Sec label={t.secBank} />
            <Grid2>
              <Cell label={t.mfo}  field="mfo"  mono />
              <Cell label={t.bank} field="bank" />
            </Grid2>

            <Sec label={t.secOrg} />
            <Grid2>
              <DropCell label={t.cls}      field="cls"      options={CLASSES} />
              <DropCell label={t.type}     field="type"     options={TYPES} />
            </Grid2>
            <Grid2>
              <Cell label={t.director} field="director" />
              <Cell label={t.chiefAcc} field="chiefAcc" />
            </Grid2>
            <Grid2>
              <DropCell label={t.channel} field="channel" options={CHANNELS} />
              <DropCell label={t.agent}   field="agent"   options={AGENTS} />
            </Grid2>

            <Sec label={t.secGps} />
            <Grid2>
              {/* GPS cell custom */}
              <div style={{ padding: '8px 12px', borderRight: `1px solid ${divClr}`, background: bg }}>
                <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{t.gps}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={form.gps} readOnly placeholder=""
                    style={inpStyle({
                      flex: 1, fontFamily: 'monospace', cursor: 'default',
                      color: gpsCoords ? (D ? '#34d399' : '#059669') : (D ? '#4b5563' : '#9ca3af'),
                    })} />
                  <button onClick={() => setActiveTab('xarita')}
                    style={{ width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
                      flexShrink: 0, background: gpsCoords ? 'rgba(16,185,129,0.12)' : inpBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: gpsCoords ? '#10b981' : lblClr, alignSelf: 'flex-end' }}>
                    <MapPin size={14} />
                  </button>
                </div>
              </div>
              <DropCell label={t.priceZone} field="priceZone" options={PRICE_ZONES} />
            </Grid2>
            <Grid2>
              <Cell label={t.budget}       field="budget" />
              <Cell label={t.mainContract} field="mainContract" />
            </Grid2>
            <Grid2>
              <Cell label={t.note} field="note" span />
            </Grid2>

            <Sec label={t.secInn} />
            <Grid2>
              <Cell label={t.inn}       field="inn"       mono />
              <Cell label={t.territory} field="territory" />
            </Grid2>
            <Grid2>
              <Cell label={t.settlement} field="settlement" />
              <Cell label={t.pinfl}      field="pinfl" mono />
            </Grid2>
            <Grid2>
              <Cell label={t.telegram} field="telegram" />
              {/* empty right cell */}
              <div style={{ padding: '8px 12px', background: bg }} />
            </Grid2>

          </>)}

          {/* ════ KONTAKTLAR ════ */}
          {activeTab === 'kontakt' && (<>
            {contacts.map((c, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 12px', background: secBg,
                  borderTop: i > 0 ? `2px solid ${D ? '#374151' : '#d1d5db'}` : undefined,
                  borderBottom: `1px solid ${divClr}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: secClr }}>
                    {t.contactPerson.toUpperCase()} {i + 1}
                  </span>
                  {contacts.length > 1 && (
                    <button onClick={() => setContacts(contacts.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, display: 'flex' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <Grid2>
                  {/* Name */}
                  <div style={{ padding: '8px 12px', borderRight: `1px solid ${divClr}`, background: bg }}>
                    <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{t.contactPerson}</div>
                    <input value={c.name} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder="..." style={inpStyle({})} onFocus={onFoc} onBlur={onBlr} />
                  </div>
                  {/* Phone */}
                  <div style={{ padding: '8px 12px', background: bg }}>
                    <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{t.contactPhone}</div>
                    <input type="tel" value={c.phone} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))}
                      placeholder="..." style={inpStyle({})} onFocus={onFoc} onBlur={onBlr} />
                  </div>
                </Grid2>
                {/* Role - full width */}
                <div style={{ padding: '8px 12px', borderBottom: `1px solid ${divClr}`, background: bg }}>
                  <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{t.contactRole}</div>
                  <input value={c.role} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                    placeholder="..." style={inpStyle({})} onFocus={onFoc} onBlur={onBlr} />
                </div>
              </div>
            ))}
            <div style={{ padding: 12 }}>
              <button onClick={() => setContacts([...contacts, { name: '', phone: '', role: '' }])}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
                  border: `1.5px solid ${inpBdr}`, background: inpBg,
                  color: focClr, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <Plus size={13} /> {t.addContact}
              </button>
            </div>
          </>)}

          {/* ════ YO'NALISHLAR ════ */}
          {activeTab === 'yonalish' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: secBg, borderBottom: `1px solid ${divClr}` }}>
                  <th style={{ width: 44, padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: secClr }}>{t.directionNo}</th>
                  <th style={{ width: 36, padding: '8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: secClr }}>✓</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: secClr }}>{t.directionName}</th>
                </tr>
              </thead>
              <tbody>
                {DIRECTIONS.map((dir, i) => (
                  <tr key={dir}
                    onClick={() => setDirections(p => ({ ...p, [dir]: !p[dir] }))}
                    style={{ borderBottom: `1px solid ${divClr}`, cursor: 'pointer', background: bg,
                      backgroundColor: directions[dir] ? (D ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)') : undefined }}
                    onMouseEnter={e => { if (!directions[dir]) (e.currentTarget as HTMLElement).style.background = D ? 'rgba(255,255,255,0.03)' : '#f9fafb'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = directions[dir] ? (D ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)') : bg; }}
                  >
                    <td style={{ padding: '11px 16px', fontSize: 13, color: lblClr }}>{i + 1}</td>
                    <td style={{ padding: '11px 8px', textAlign: 'center' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, margin: '0 auto',
                        border: `2px solid ${directions[dir] ? focClr : inpBdr}`,
                        background: directions[dir] ? focClr : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                        {directions[dir] && <Check size={11} color="#fff" />}
                      </div>
                    </td>
                    <td style={{ padding: '11px 8px', fontSize: 13, fontWeight: directions[dir] ? 600 : 400,
                      color: directions[dir] ? (D ? '#a5b4fc' : '#4338ca') : valClr }}>{dir}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ════ XARITA ════ */}
          {activeTab === 'xarita' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: isMaximized ? 'calc(100vh - 220px)' : 380 }}>
              {gpsCoords && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                  borderBottom: `1px solid ${divClr}`, background: topBg }}>
                  <MapPin size={13} color="#10b981" />
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: D ? '#34d399' : '#059669' }}>
                    {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
                  </span>
                </div>
              )}
              <div style={{ position: 'relative', flex: 1 }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
                {loadingLoc && (
                  <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                      borderRadius: 20, background: D ? '#1f2937' : '#fff',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.15)', border: `1px solid ${inpBdr}` }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid ' + focClr,
                        borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }} />
                      <span style={{ fontSize: 12, color: valClr }}>{t.loading}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ FOTO ════ */}
          {activeTab === 'foto' && (<>
            <Sec label={t.photoSection.toUpperCase()} />
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, background: bg }}>
              {photos.map((src, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 6,
                      background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button style={{ aspectRatio: '1', borderRadius: 12, border: `2px dashed ${inpBdr}`,
                background: inpBg, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8, color: lblClr }}>
                <Camera size={22} />
                <span style={{ fontSize: 12 }}>{t.addPhoto}</span>
              </button>
            </div>
          </>)}

          {/* ════ HOLAT ════ */}
          {activeTab === 'status' && (<>
            <Sec label={t.statusSection.toUpperCase()} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderBottom: `1px solid ${divClr}`, background: bg }}>
              <span style={{ fontSize: 13, color: lblClr }}>{t.statusSection}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ key: 'active', label: t.statusActive }, { key: 'inactive', label: t.statusInactive }].map(s => (
                  <button key={s.key} onClick={() => set('status', s.key)}
                    style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: form.status === s.key
                        ? s.key === 'active' ? 'rgba(16,185,129,0.12)' : inpBg : 'transparent',
                      color: form.status === s.key ? (s.key === 'active' ? '#10b981' : valClr) : lblClr }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <Grid2>
              <div style={{ padding: '8px 12px', borderRight: `1px solid ${divClr}`, background: bg }}>
                <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{t.registrationDate}</div>
                <input type="date" value={form.regDate} onChange={e => set('regDate', e.target.value)}
                  style={inpStyle({})} onFocus={onFoc} onBlur={onBlr} />
              </div>
              <div style={{ padding: '8px 12px', background: bg }} />
            </Grid2>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${divClr}`, background: bg }}>
              <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{t.comment}</div>
              <textarea rows={4} value={form.comment} onChange={e => set('comment', e.target.value)}
                placeholder="..."
                style={{ ...inpStyle({}), resize: 'none' } as React.CSSProperties}
                onFocus={onFoc} onBlur={onBlr} />
            </div>
          </>)}

        </div>

        {/* ── BOTTOM ── */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '10px 14px',
          borderTop: `1px solid ${divClr}`, background: topBg }}>
          <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: 11, background: focClr, color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Save size={14} /> {t.saveClose}
          </button>
          <button onClick={onClose}
            style={{ padding: '11px 18px', borderRadius: 10, border: `1.5px solid ${inpBdr}`,
              cursor: 'pointer', background: inpBg, color: lblClr, fontSize: 13, fontWeight: 500 }}>
            {t.close}
          </button>
        </div>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}