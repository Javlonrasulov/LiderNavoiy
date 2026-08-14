import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type ReactNode, type Ref } from 'react';
import { X, Check, Save, MapPin, ChevronDown, Maximize2, Minimize2, Camera, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import L from 'leaflet';
import { MapLayerSwitcher, switchTileLayer, type LayerId } from './MapLayerSwitcher';
import type { ClientRow } from '../data/adminData';
import { api } from '../api/client';
import { clientNameToLogin, DEFAULT_CLIENT_APP_PASSWORD, formatLineDisplay } from '../utils/clientApi';
import { formatUzPhoneInput, UZ_PHONE_DEFAULT } from '../utils/phoneFormat';
import { getApiOrigin } from '../utils/productImageUrl';
import { findBestSimilarityMatch, type SimilarityMatch } from '../utils/clientSimilarity';
import { ClientSimilarityWarningModal } from './admin/ClientSimilarityWarningModal';
import { SingleDatePicker } from './admin/SingleDatePicker';

function toYmd(isoOrDate?: string | null): string {
  if (!isoOrDate) return '';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) {
    const m = String(isoOrDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
  }
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function todayYmd(): string {
  return toYmd(new Date().toISOString());
}

export interface AgentOption {
  id: string;
  name: string;
  lineCode?: string;
}

type SavePayload = Partial<ClientRow> & {
  id?: string;
  appUsername?: string;
  appPassword?: string;
  appLoginChanged?: boolean;
  hasAppLogin?: boolean;
  isActive?: boolean;
  extraPhones?: { phone: string; note?: string }[];
  companyIds?: string[];
};

interface AddClientProps {
  onClose: () => void;
  client?: ClientRow;
  agents?: AgentOption[];
  lines?: string[];
  companyId?: string;
  onSave?: (data: SavePayload) => Promise<string | void> | void | Promise<void>;
}
type TabKey = 'rekvizit' | 'kirish' | 'kontakt' | 'yonalish' | 'xarita' | 'foto' | 'status';

const TRANS = {
  uz_latn: {
    saveClose: "Saqlash va yopish", close: "Yopish",
    addNew: "Yangi mijoz qo'shish", editNew: "Mijozni tahrirlash",
    tabs: ["Rekvizitlar", "Kirish", "Kontaktlar", "Organizatsiya", "Xarita", "Foto", "Holat"],
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
    canSeePromotions: "Aksiyalarni ko'rish",
    canSeePromotionsOn: "Yoqilgan",
    canSeePromotionsOff: "O'chirilgan",
    canSeePromotionsHint: "Yoqilsa, mijoz APK da admin yoqqan aksiyalarni ko'radi",
    category: "Kategoriya", agent: "Agent",
    directionNo: "№", directionName: "Organizatsiya",
    orgHint: "Belgilangan tashkilotlarda mijoz ko‘rinadi",
    orgEmpty: "Tashkilotlar topilmadi",
    orgRequired: "Kamida 1 ta organizatsiya tanlang",
    appLoginTitle: "Mijoz ilovasi (APK) kirish",
    appLogin: "Login",
    appPassword: "Parol",
    appPasswordNew: "Yangi parol",
    appPasswordKeep: "O'zgartirmaslik uchun bo'sh qoldiring",
    appHint: "Mijoz mobil ilovaga shu login va parol bilan kiradi.",
    appLoginRequired: "Login kamida 3 ta belgi bo'lishi kerak",
    appPasswordRequired: "Parol kamida 6 ta belgi bo'lishi kerak",
    appCredentialsSaved: "APK login saqlandi",
    appCredentialsError: "APK login saqlab bo'lmadi",
    appLoginTaken: "Bu login band — bunday mijoz allaqachon bor",
    appLoginChecking: "Login tekshirilmoqda...",
    appNotSaved: "Saqlanmagan — «Saqlash va yopish» bosing",
    appSaved: "Saqlangan",
    appSaveLogin: "Login saqlash",
    appLoginAccess: "Ilovaga kirish",
    appLoginAccessOn: "Ruxsat bor",
    appLoginAccessOff: "Ruxsat yo'q",
    appLoginAccessHint: "O'chirilsa, mijoz login/parol bilan APK ga kira olmaydi (hisob saqlanadi).",
    simTitle: "O'xshash mijoz topildi",
    simConfirmAdd: "Baribir qo'shish",
    simConfirmSave: 'Baribir saqlash',
    simCancel: 'Bekor qilish',
    simProbability: "O'xshashlik ehtimoli",
    simRiskHigh: 'Yuqori xavf',
    simRiskMedium: "O'rtacha xavf",
    simRiskLow: 'Past xavf',
    simFoundClient: 'Topilgan mijoz',
    simInnBlocked: "Bir xil INN bilan mijoz allaqachon mavjud. «Baribir qo'shish» mumkin emas — INN ni o'zgartiring yoki mavjud mijozni tahrirlang.",
    simUnderstand: 'Tushunarli',
    simFieldName: 'Nomi',
    simFieldFullName: "To'liq nomi",
    simFieldPhone: 'Telefon',
    simFieldInn: 'INN',
    simFieldTerritory: 'Hudud',
  },
  uz_cyrl: {
    saveClose: "Сақлаш ва ёпиш", close: "Ёпиш",
    addNew: "Янги мижоз қўшиш", editNew: "Мижозни таҳрирлаш",
    tabs: ["Реквизитлар", "Кириш", "Контактлар", "Организация", "Харита", "Фото", "Ҳолат"],
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
    canSeePromotions: "Акцияларни кўриш",
    canSeePromotionsOn: "Ёқилган",
    canSeePromotionsOff: "Ўчирилган",
    canSeePromotionsHint: "Ёқилса, мижоз APK да админ ёққан акцияларни кўради",
    category: "Категория", agent: "Агент",
    directionNo: "№", directionName: "Организация",
    orgHint: "Белгиланган ташкилотларда мижоз кўринади",
    orgEmpty: "Ташкилотлар топилмади",
    orgRequired: "Камида 1 та организация танланг",
    appLoginTitle: "Мижоз иловаси (APK) кириш",
    appLogin: "Логин",
    appPassword: "Парол",
    appPasswordNew: "Янги парол",
    appPasswordKeep: "Ўзгартirmaslik uchun bo'sh qoldiring",
    appHint: "Мижоз мобил иловаga shu login va parol bilan kiradi.",
    appLoginRequired: "Логин kamida 3 ta belgi bo'lishi kerak",
    appPasswordRequired: "Парол kamida 6 ta belgi bo'lishi kerak",
    appCredentialsSaved: "APK login saqlandi",
    appCredentialsError: "APK login saqlab bo'lmadi",
    appLoginTaken: "Бу логин банд — бундай мижоз аллақачон бор",
    appLoginChecking: "Логин текширилмоқда...",
    appNotSaved: "Сақланмаган — «Сақлаш ва ёпиш» босинг",
    appSaved: "Сақланган",
    appSaveLogin: "Логинни сақлаш",
    appLoginAccess: "Иловага кириш",
    appLoginAccessOn: "Рухсат бор",
    appLoginAccessOff: "Рухсат йўқ",
    appLoginAccessHint: "Ўчирилса, мижоз login/parol билан APK га кира олмайди (ҳисоб сақланади).",
    simTitle: 'Ўхшаш мижоз топилди',
    simConfirmAdd: 'Барибир қўшиш',
    simConfirmSave: 'Барибир сақлаш',
    simCancel: 'Бекор қилиш',
    simProbability: 'Ўхшашлик эҳтимоли',
    simRiskHigh: 'Юқори хавф',
    simRiskMedium: 'Ўртача хавф',
    simRiskLow: 'Паст хавф',
    simFoundClient: 'Топилган мижоз',
    simInnBlocked: 'Бир хил ИНН билан мижоз аллақачон мавжуд. «Барибир қўшиш» мумкин эмас — ИНН ни ўзгартиринг ёки мавжуд мижозни таҳрирланг.',
    simUnderstand: 'Тушунарли',
    simFieldName: 'Номи',
    simFieldFullName: 'Тўлиқ номи',
    simFieldPhone: 'Телефон',
    simFieldInn: 'ИНН',
    simFieldTerritory: 'Ҳудуд',
  },
  ru: {
    saveClose: "Записать и закрыть", close: "Закрыть",
    addNew: "Новый клиент", editNew: "Редактировать клиента",
    tabs: ["Реквизиты", "Вход", "Контакты", "Организация", "Карта", "Фото", "Статус"],
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
    canSeePromotions: "Показ акций",
    canSeePromotionsOn: "Включено",
    canSeePromotionsOff: "Выключено",
    canSeePromotionsHint: "Если включено, клиент видит акции, активированные админом",
    category: "Категория", agent: "Агент",
    directionNo: "№", directionName: "Организация",
    orgHint: "Клиент будет виден в выбранных организациях",
    orgEmpty: "Организации не найдены",
    orgRequired: "Выберите хотя бы 1 организацию",
    appLoginTitle: "Вход в приложение клиента (APK)",
    appLogin: "Логин",
    appPassword: "Пароль",
    appPasswordNew: "Новый пароль",
    appPasswordKeep: "Оставьте пустым, если не меняете",
    appHint: "Клиент входит в мобильное приложение с этим логином и паролем.",
    appLoginRequired: "Логин — минимум 3 символа",
    appPasswordRequired: "Пароль — минимум 6 символов",
    appCredentialsSaved: "APK логин сохранён",
    appCredentialsError: "Не удалось сохранить APK логин",
    appLoginTaken: "Этот логин занят — такой клиент уже есть",
    appLoginChecking: "Проверка логина...",
    appNotSaved: "Не сохранено — нажмите «Записать и закрыть»",
    appSaved: "Сохранено",
    appSaveLogin: "Сохранить логин",
    appLoginAccess: "Вход в приложение",
    appLoginAccessOn: "Разрешён",
    appLoginAccessOff: "Запрещён",
    appLoginAccessHint: "Если выключено, клиент не сможет войти в APK (учётная запись сохраняется).",
    simTitle: 'Найден похожий клиент',
    simConfirmAdd: 'Всё равно добавить',
    simConfirmSave: 'Всё равно сохранить',
    simCancel: 'Отмена',
    simProbability: 'Вероятность совпадения',
    simRiskHigh: 'Высокий риск',
    simRiskMedium: 'Средний риск',
    simRiskLow: 'Низкий риск',
    simFoundClient: 'Найденный клиент',
    simInnBlocked: 'Клиент с таким ИНН уже существует. «Всё равно добавить» недоступно — измените ИНН или отредактируйте существующего клиента.',
    simUnderstand: 'Понятно',
    simFieldName: 'Наименование',
    simFieldFullName: 'Полное имя',
    simFieldPhone: 'Телефон',
    simFieldInn: 'ИНН',
    simFieldTerritory: 'Территория',
  },
};

const NAVOIY = { lat: 40.0843, lng: 65.3791 };

const CLASSES     = ["BM - Bozordagi dukon", "SM - Supermarket", "PM - Premium market", "KS - Kichik savdo"];
const TYPES       = ["Torgovaya tochka", "Ulgurji", "Distributtor", "Restorant / Kafe"];
const CHANNELS    = ["Retail", "Horeca", "Wholesale", "Online"];
const CATEGORIES  = ["Standard", "VIP", "Premium"];

type FieldTokens = {
  bg: string;
  divClr: string;
  lblClr: string;
  valClr: string;
  inpBg: string;
  inpBdr: string;
  focClr: string;
  dropBg: string;
  dropBdr: string;
  D: boolean;
};

function fieldInpStyle(t: FieldTokens, extra?: CSSProperties): CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box',
    background: t.inpBg, border: `1.5px solid ${t.inpBdr}`,
    borderRadius: 8, padding: '7px 10px',
    fontSize: 13, color: t.valClr, outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
    ...extra,
  };
}

function FormSec({ label, secBg, secClr, divClr }: {
  label: string; secBg: string; secClr: string; divClr: string;
}) {
  return (
    <div style={{
      background: secBg, padding: '6px 16px',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: secClr,
      borderTop: `1px solid ${divClr}`, borderBottom: `1px solid ${divClr}`,
    }}>{label}</div>
  );
}

function FormGrid2({ children, divClr }: { children: ReactNode; divClr: string }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 0, borderBottom: `1px solid ${divClr}`,
    }}>
      {children}
    </div>
  );
}

function FormCell({
  label, value, onChange, tokens, type = 'text', mono = false, span = false, phone = false, inputRef,
  onFocusExtra, onBlurExtra,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tokens: FieldTokens;
  type?: string;
  mono?: boolean;
  span?: boolean;
  phone?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onFocusExtra?: () => void;
  onBlurExtra?: () => void;
}) {
  const { bg, divClr, lblClr, focClr, inpBdr } = tokens;
  return (
    <div style={{
      padding: '8px 12px',
      borderRight: span ? 'none' : `1px solid ${divClr}`,
      gridColumn: span ? '1 / -1' : undefined,
      background: bg,
    }}>
      <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <input
        ref={inputRef}
        type={phone ? 'tel' : type}
        value={value}
        onChange={e => onChange(phone ? formatUzPhoneInput(e.target.value) : e.target.value)}
        placeholder={phone ? '+998 99 999 99 99' : '...'}
        style={fieldInpStyle(tokens, { fontFamily: mono ? 'monospace' : 'inherit' })}
        onFocus={e => {
          e.target.style.borderColor = focClr;
          e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
          onFocusExtra?.();
        }}
        onBlur={e => {
          e.target.style.borderColor = inpBdr;
          e.target.style.boxShadow = 'none';
          onBlurExtra?.();
        }}
      />
    </div>
  );
}

function FormDropCell({
  label, value, options, open, onToggle, onPick, onClose, tokens, span = false,
}: {
  label: string;
  value: string;
  options: string[];
  open: boolean;
  onToggle: () => void;
  onPick: (v: string) => void;
  onClose: () => void;
  tokens: FieldTokens;
  span?: boolean;
}) {
  const { bg, divClr, lblClr, valClr, focClr, inpBdr, dropBg, dropBdr, D } = tokens;
  return (
    <div style={{
      padding: '8px 12px', position: 'relative',
      borderRight: span ? 'none' : `1px solid ${divClr}`,
      gridColumn: span ? '1 / -1' : undefined,
      background: bg,
    }}>
      <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <button
        type="button"
        onClick={onToggle}
        style={{
          ...fieldInpStyle(tokens, { cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }),
          borderColor: open ? focClr : inpBdr,
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
        } as CSSProperties}
      >
        <span style={{ fontSize: 13, color: value ? valClr : lblClr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {value || '...'}
        </span>
        <ChevronDown size={14} color={lblClr} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : '', transition: 'transform .15s' }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 400 }} onClick={onClose} />
          <div style={{
            position: 'absolute', left: 12, right: 12, top: 'calc(100% - 4px)', zIndex: 401,
            background: dropBg, border: `1px solid ${dropBdr}`, borderRadius: 10,
            boxShadow: '0 8px 28px rgba(0,0,0,0.18)', overflow: 'hidden',
          }}>
            {options.map(o => (
              <button
                type="button"
                key={o}
                onClick={() => onPick(o)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13,
                  background: value === o ? (D ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)') : 'none',
                  color: value === o ? focClr : valClr,
                  border: 'none', borderBottom: `1px solid ${divClr}`, cursor: 'pointer',
                }}
                onMouseEnter={e => { if (value !== o) (e.currentTarget as HTMLElement).style.background = D ? 'rgba(255,255,255,0.05)' : '#f5f5f5'; }}
                onMouseLeave={e => { if (value !== o) (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >{o}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FormMetaInp({
  value, onChange, width, mono, placeholder = '...', tokens,
}: {
  value: string;
  onChange: (v: string) => void;
  width: number;
  mono?: boolean;
  placeholder?: string;
  tokens: FieldTokens;
}) {
  const { inpBg, inpBdr, valClr, focClr } = tokens;
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width, background: inpBg, border: `1.5px solid ${inpBdr}`,
        borderRadius: 7, padding: '4px 8px', fontSize: 12,
        fontFamily: mono ? 'monospace' : 'inherit',
        color: valClr, outline: 'none',
      }}
      onFocus={e => { e.target.style.borderColor = focClr; }}
      onBlur={e => { e.target.style.borderColor = inpBdr; }}
    />
  );
}

function FormMetaDrop({
  value, options, width, open, onToggle, onPick, onClose, tokens, menuMinWidth,
}: {
  value: string;
  options: string[];
  width: number;
  open: boolean;
  onToggle: () => void;
  onPick: (v: string) => void;
  onClose: () => void;
  tokens: FieldTokens;
  menuMinWidth?: number;
}) {
  const { inpBg, inpBdr, valClr, lblClr, focClr, dropBg, dropBdr, divClr, D } = tokens;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: width });

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuW = Math.max(menuMinWidth ?? width, r.width, 220);
      const menuH = Math.min(280, Math.max(options.length, 1) * 36 + 8);
      const spaceBelow = window.innerHeight - r.bottom;
      const top = spaceBelow < menuH && r.top > menuH ? r.top - menuH - 4 : r.bottom + 4;
      setMenuPos({
        top,
        left: Math.min(r.left, Math.max(8, window.innerWidth - menuW - 8)),
        width: menuW,
      });
    }
    onToggle();
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        style={{
          width, background: inpBg, border: `1.5px solid ${open ? focClr : inpBdr}`,
          borderRadius: 7, padding: '4px 8px', fontSize: 12,
          color: value ? valClr : lblClr,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, cursor: 'pointer',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || '...'}
        </span>
        <ChevronDown size={11} color={lblClr} style={{ flexShrink: 0 }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 500 }} onClick={onClose} />
          <div style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            zIndex: 501,
            background: dropBg,
            border: `1px solid ${dropBdr}`,
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            maxHeight: 280,
            overflowY: 'auto',
          }}>
            {options.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 12, color: lblClr }}>—</div>
            ) : options.map(o => (
              <button
                type="button"
                key={o}
                onClick={() => onPick(o)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                  fontSize: 12,
                  background: value === o ? (D ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)') : 'none',
                  color: value === o ? focClr : valClr,
                  fontWeight: value === o ? 700 : 500,
                  border: 'none',
                  borderBottom: `1px solid ${divClr}`,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  if (value !== o) {
                    (e.currentTarget as HTMLElement).style.background = D ? 'rgba(255,255,255,0.05)' : '#f5f5f5';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background =
                    value === o ? (D ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)') : 'none';
                }}
              >{o}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function clientToForm(client: ClientRow) {
  let lat: number | null = null;
  let lng: number | null = null;
  if (client.gps?.includes(',')) {
    const [la, ln] = client.gps.split(',').map(Number);
    if (!isNaN(la) && !isNaN(ln)) { lat = la; lng = ln; }
  }
  const coords = lat !== null && lng !== null ? { lat, lng } : NAVOIY;
  const gpsStr = lat !== null && lng !== null
    ? client.gps!
    : `${NAVOIY.lat.toFixed(6)},${NAVOIY.lng.toFixed(6)}`;

  const contacts: { name: string; phone: string; role: string }[] = [];
  const person = (client.contact || '').trim();
  const extras = Array.isArray(client.extraPhones) ? client.extraPhones : [];

  // 1-qator: kontakt shaxs + asosiy telefon (manager `phone` / `contactPerson`)
  contacts.push({
    name: person,
    phone: formatUzPhoneInput(client.phone || UZ_PHONE_DEFAULT),
    role: '',
  });

  // Keyingi qatorlar: manager `extraPhones` (note → lavozim)
  for (const p of extras) {
    if (!p?.phone?.trim()) continue;
    contacts.push({
      name: '',
      phone: formatUzPhoneInput(p.phone),
      role: p.note?.trim() || '',
    });
  }

  return {
    form: {
      kod: client.code, liniya: client.line, status: client.isActive === false ? 'inactive' : 'active',
      category: client.category || 'Standard',
      name: client.name, officialName: client.fullName, legalAddr: client.legalAddr,
      landmark: client.territory || '', phones: formatUzPhoneInput(client.phone || ''), bankAcc: '', mfo: '', bank: '',
      cls: client.cls, type: '', director: '', chiefAcc: '', channel: '',
      gps: gpsStr, priceZone: client.priceCat || '',
      budget: '', mainContract: '', note: '',
      inn: client.inn, territory: client.territory, settlement: '', pinfl: '', telegram: '',
      actDate: '', actSum: '', agent: client.agent || '', distributorId: client.distributorId || '',
      noDelay: false, routeList: false, sizeW: '', sizeH: '',
      regDate: toYmd(client.createdAt) || todayYmd(),
      comment: '',
      canSeePromotions: !!client.canSeePromotions,
    },
    contacts,
    gpsCoords: coords,
  };
}

export default function AddClient({ onClose, client, agents = [], lines = [], companyId, onSave }: AddClientProps) {
  const { isDark } = useTheme();
  const { lang } = useLang();
  const D = isDark;

  // Map admin lang keys → TRANS keys
  const langKey = lang === 'cy' ? 'uz_cyrl' : lang === 'ru' ? 'ru' : 'uz_latn';
  const t = TRANS[langKey as keyof typeof TRANS] ?? TRANS.uz_cyrl;

  // Draft without id (e.g. Excel import retry) = create with prefill, not edit
  const isEdit = !!(client?.id);
  const initial = client ? clientToForm(client) : null;

  const [activeTab, setActiveTab]     = useState<TabKey>('rekvizit');
  const [isMaximized, setIsMaximized] = useState(false);
  const [openDrop, setOpenDrop]       = useState<string | null>(null);
  const [contacts, setContacts]       = useState(initial?.contacts ?? [{ name: '', phone: UZ_PHONE_DEFAULT, role: '' }]);
  const [similarityMatch, setSimilarityMatch] = useState<SimilarityMatch | null>(null);
  const [pendingSave, setPendingSave] = useState<SavePayload | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(() => {
    const cur = client?.category?.trim();
    return cur && !CATEGORIES.includes(cur) ? [cur, ...CATEGORIES] : [...CATEGORIES];
  });
  const [catMenuPos, setCatMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  const [lineApiOptions, setLineApiOptions] = useState<string[]>([]);
  const [orgList, setOrgList] = useState<Array<{ id: string; name: string; shortName?: string | null }>>([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(() => {
    const ids = client?.companyIds?.length
      ? client.companyIds
      : client?.companyId
        ? [client.companyId]
        : companyId
          ? [companyId]
          : [];
    return new Set(ids.filter(Boolean));
  });
  const resolveClientPhotoSrc = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${getApiOrigin()}${p}`;
  };

  const [photos, setPhotos] = useState<string[]>(() =>
    client?.photoUrl ? [resolveClientPhotoSrc(client.photoUrl)] : [],
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(client?.photoUrl ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(initial?.form ?? {
    kod: '', liniya: '', status: 'active', category: 'Standard',
    name: '', officialName: '', legalAddr: '', landmark: '', phones: UZ_PHONE_DEFAULT,
    bankAcc: '', mfo: '', bank: '', cls: '', type: '',
    director: '', chiefAcc: '', channel: '', gps: '', priceZone: '',
    budget: '', mainContract: '', note: '',
    inn: '', territory: '', settlement: '', pinfl: '', telegram: '',
    actDate: '', actSum: '', agent: '', distributorId: '',
    noDelay: false, routeList: false,
    sizeW: '', sizeH: '', regDate: todayYmd(), comment: '',
    canSeePromotions: false,
  });
  const [gpsCoords, setGpsCoords]   = useState<{ lat: number; lng: number } | null>(initial?.gpsCoords ?? null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const mapRef          = useRef<L.Map | null>(null);
  const tileRef         = useRef<L.TileLayer | null>(null);
  const markerRef       = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [activeLayer, setActiveLayer] = useState<LayerId>('standard');
  const [appLogin, setAppLogin] = useState('');
  const [appPassword, setAppPassword] = useState(DEFAULT_CLIENT_APP_PASSWORD);
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [hasAppLogin, setHasAppLogin] = useState(false);
  const [appLoginEnabled, setAppLoginEnabled] = useState(true);
  const [appLoginAccessBusy, setAppLoginAccessBusy] = useState(false);
  const [savedAppUsername, setSavedAppUsername] = useState<string | null>(null);
  const [appCredLoading, setAppCredLoading] = useState(false);
  const [appCredError, setAppCredError] = useState<string | null>(null);
  const [appLoginTouched, setAppLoginTouched] = useState(false);
  const [appLoginTaken, setAppLoginTaken] = useState(false);
  const [appLoginChecking, setAppLoginChecking] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const keepNameFocus = useRef(false);
  const loginCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (k: string, v: string | boolean) => {
    setForm(p => {
      const next = { ...p, [k]: v };
      // Ориентир ↔ Ҳудуд — bitta DB ustun (`territory`)
      if (k === 'landmark' && typeof v === 'string') next.territory = v;
      if (k === 'territory' && typeof v === 'string') next.landmark = v;
      return next;
    });
  };

  const handlePhotoPick = async (file: File | undefined) => {
    if (!file) return;
    const local = URL.createObjectURL(file);
    setPhotos([local]);
    setPhotoUploading(true);
    try {
      const uploaded = await api.uploadClientPhoto(file, file.name || 'photo.jpg');
      setPhotoUrl(uploaded.url);
      setPhotos([uploaded.fullUrl || resolveClientPhotoSrc(uploaded.url)]);
    } catch (e) {
      setPhotos([]);
      setPhotoUrl(null);
      setAppCredError(e instanceof Error ? e.message : 'Rasm yuklanmadi');
    } finally {
      setPhotoUploading(false);
    }
  };

  const agentNames = agents.map(a => a.name);
  const lineOptions = useMemo(() => {
    const merged = [...lineApiOptions, ...lines];
    const cur = (form.liniya || '').trim();
    if (cur) merged.push(cur);
    // code bo'yicha unikal (bir xil kodning to'liq labelini afzal ko'ramiz)
    const byCode = new Map<string, string>();
    for (const raw of merged) {
      const s = raw.trim();
      if (!s) continue;
      const code = s.split(/\s*[-–—]\s*/)[0]?.trim() || s;
      const prev = byCode.get(code);
      if (!prev || s.length > prev.length) byCode.set(code, s);
    }
    return [...byCode.values()].sort((a, b) => a.localeCompare(b, 'uz'));
  }, [lineApiOptions, lines, form.liniya]);
  const priceZoneOptions = lineOptions;

  const formatLoginTakenMessage = (takenBy?: {
    clientName?: string | null;
    clientCode?: string | null;
  }) => {
    if (takenBy?.clientName) {
      const code = takenBy.clientCode ? ` (${takenBy.clientCode})` : '';
      return `${t.appLoginTaken}: ${takenBy.clientName}${code}`;
    }
    return t.appLoginTaken;
  };

  const verifyAppLoginAvailable = async (login: string): Promise<boolean> => {
    const normalized = login.trim().toLowerCase();
    if (normalized.length < 3) {
      setAppLoginTaken(false);
      return true;
    }
    if (
      hasAppLogin
      && savedAppUsername
      && normalized === savedAppUsername.toLowerCase()
    ) {
      setAppLoginTaken(false);
      setAppCredError(null);
      return true;
    }
    if (!localStorage.getItem('api_access_token')) return true;
    setAppLoginChecking(true);
    try {
      const res = await api.checkClientAppUsername(normalized, client?.id);
      if (!res.available) {
        setAppLoginTaken(true);
        setAppCredError(formatLoginTakenMessage(res.takenBy));
        return false;
      }
      setAppLoginTaken(false);
      setAppCredError(null);
      return true;
    } catch {
      // Offline / API xatosi — saqlashda backend yana tekshiradi
      return true;
    } finally {
      setAppLoginChecking(false);
    }
  };

  const scheduleLoginCheck = (login: string) => {
    if (loginCheckTimer.current) clearTimeout(loginCheckTimer.current);
    loginCheckTimer.current = setTimeout(() => {
      void verifyAppLoginAvailable(login);
    }, 400);
  };

  const resolveCredentialPayload = (force = false) => {
    const loginTrim = appLogin.trim().toLowerCase();
    const loginChanged = !!(
      hasAppLogin && savedAppUsername && loginTrim !== savedAppUsername.toLowerCase()
    );
    const passwordForSave = appPassword.length >= 6
      ? appPassword
      : (!hasAppLogin && loginTrim.length >= 3 ? DEFAULT_CLIENT_APP_PASSWORD : '');
    const shouldSave = force
      ? loginTrim.length >= 3 && passwordForSave.length >= 6
      : loginTrim.length >= 3
        && passwordForSave.length >= 6
        && (!hasAppLogin || loginChanged || appPassword.length >= 6);
    return { loginTrim, loginChanged, passwordForSave, shouldSave };
  };

  const markCredentialsSaved = (loginTrim: string) => {
    setHasAppLogin(true);
    setSavedAppUsername(loginTrim);
    setAppLogin(loginTrim);
    setAppPassword('');
    setAppCredError(null);
  };

  const handleToggleAppLoginAccess = async () => {
    const clientId = client?.id;
    if (!clientId || appLoginAccessBusy) return;
    const next = !appLoginEnabled;
    setAppLoginAccessBusy(true);
    setAppCredError(null);
    try {
      const res = await api.setClientAppLoginActive(clientId, next);
      if (res.hasCredentials) {
        setHasAppLogin(true);
        setSavedAppUsername(res.username);
        setAppLogin(res.username);
        setAppLoginEnabled(res.isActive !== false);
      } else {
        setAppLoginEnabled(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setAppCredError(msg.replace(/^HTTP \d+:\s*/i, '') || t.appCredentialsError);
    } finally {
      setAppLoginAccessBusy(false);
    }
  };

  const handleSaveAppCredentialsOnly = async () => {
    const clientId = client?.id;
    if (!clientId) {
      setAppCredError(t.appCredentialsError);
      return;
    }
    const { loginTrim, passwordForSave } = resolveCredentialPayload(true);
    if (loginTrim.length < 3) {
      setAppCredError(t.appLoginRequired);
      return;
    }
    if (passwordForSave.length < 6) {
      setAppCredError(t.appPasswordRequired);
      return;
    }
    const ok = await verifyAppLoginAvailable(loginTrim);
    if (!ok) return;
    setAppCredError(null);
    try {
      await api.updateClient(clientId, {
        appUsername: loginTrim,
        appPassword: passwordForSave,
      });
      markCredentialsSaved(loginTrim);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setAppCredError(msg.includes('409') || msg.toLowerCase().includes('band') || msg.toLowerCase().includes('занят')
        ? msg.replace(/^HTTP \d+:\s*/i, '')
        : msg);
      setAppLoginTaken(true);
    }
  };

  const handleSave = async () => {
    if (!onSave) { onClose(); return; }
    setAppCredError(null);
    const { loginTrim, loginChanged, passwordForSave, shouldSave } = resolveCredentialPayload();

    if (shouldSave) {
      const ok = await verifyAppLoginAvailable(loginTrim);
      if (!ok) {
        setActiveTab('kirish');
        return;
      }
    }

    const kodDigits = (form.kod || '').replace(/\D/g, '');
    if (form.kod && !kodDigits) {
      setAppCredError("Mijoz kodi faqat raqam bo'lishi kerak");
      return;
    }

    const contactRows = contacts.map((c) => ({
      name: c.name.trim(),
      phone: c.phone.trim(),
      role: c.role.trim(),
    }));

    const primary = contactRows[0];
    const extraPhones = contactRows
      .slice(1)
      .filter((c) => c.phone.replace(/\D/g, '').length >= 9)
      .map((c) => ({
        phone: c.phone,
        note: c.role || undefined,
      }));

    const orgIds = [...selectedOrgIds];
    if (orgIds.length === 0) {
      setAppCredError(t.orgRequired);
      setActiveTab('yonalish');
      return;
    }

    const payload: SavePayload = {
      code: kodDigits,
      name: form.name,
      fullName: form.officialName || form.name,
      line: form.liniya,
      priceCat: form.priceZone,
      territory: (form.landmark || form.territory || '').trim(),
      inn: form.inn,
      legalAddr: form.legalAddr,
      phone: form.phones,
      contact: primary?.name || '',
      extraPhones,
      companyIds: orgIds,
      companyId: orgIds[0],
      cls: form.cls,
      gps: form.gps,
      agent: form.agent,
      distributorId: form.distributorId || agents.find(a => a.name === form.agent)?.id,
      category: form.category,
      photoUrl: photoUrl || null,
      canSeePromotions: form.canSeePromotions === true,
      isActive: form.status !== 'inactive',
      hasAppLogin,
      appLoginChanged: loginChanged,
      appUsername: shouldSave ? loginTrim : undefined,
      appPassword: shouldSave ? passwordForSave : undefined,
    };

    const persist = async (body: SavePayload) => {
      setSaveBusy(true);
      try {
        if (isEdit && client) {
          await onSave({ ...body, id: client.id });
        } else {
          await onSave(body);
        }
        if (shouldSave) markCredentialsSaved(loginTrim);
        setSimilarityMatch(null);
        setPendingSave(null);
        onClose();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const clean = msg.replace(/^HTTP \d+:\s*/i, '');
        setAppCredError(clean);
        if (msg.includes('409') || /band|занят|taken/i.test(msg)) setAppLoginTaken(true);
        setActiveTab('kirish');
      } finally {
        setSaveBusy(false);
      }
    };

    // Manager APK dagi kabi: belgilangan orgdagi mijozlar bilan o‘xshashlik (nom, tel, INN, hudud…)
    setSaveBusy(true);
    try {
      const lists = await Promise.all(
        orgIds.map((id) => api.getClients(id).catch(() => [])),
      );
      const byId = new Map<string, (typeof lists)[number][number]>();
      for (const list of lists) {
        if (!Array.isArray(list)) continue;
        for (const row of list) {
          if (row?.id) byId.set(row.id, row);
        }
      }
      const match = findBestSimilarityMatch(
        {
          name: payload.name || '',
          fullName: payload.fullName,
          phone: payload.phone,
          inn: payload.inn,
          territory: payload.territory,
        },
        [...byId.values()],
        { excludeClientId: client?.id },
      );
      if (match) {
        setPendingSave(isEdit && client ? { ...payload, id: client.id } : payload);
        setSimilarityMatch(match);
        setSaveBusy(false);
        return;
      }
      await persist(payload);
    } catch (e) {
      setSaveBusy(false);
      const msg = e instanceof Error ? e.message : String(e);
      setAppCredError(msg.replace(/^HTTP \d+:\s*/i, ''));
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('api_access_token')) return;
    let cancelled = false;
    api.getCompanies()
      .then((list) => {
        if (cancelled) return;
        setOrgList(
          list.map((c) => ({
            id: c.id,
            name: c.name,
            shortName: c.shortName,
          })),
        );
        // Yangi mijoz: joriy tashkilot avtomatik
        if (!client && companyId) {
          setSelectedOrgIds((prev) => (prev.size > 0 ? prev : new Set([companyId])));
        }
      })
      .catch(() => {
        if (!cancelled) setOrgList([]);
      });
    return () => { cancelled = true; };
  }, [client, companyId]);

  useEffect(() => {
    if (!localStorage.getItem('api_access_token')) return;
    let cancelled = false;
    api.getLines(companyId)
      .then((list) => {
        if (cancelled) return;
        const labels = list
          .map((l) => formatLineDisplay(l.code, [{ code: l.code, name: l.name }]))
          .filter(Boolean);
        setLineApiOptions(labels);

        // Joriy kodni to'liq "02 - Nomi" ga aylantirish
        setForm((prev) => {
          const cur = (prev.liniya || '').trim();
          if (!cur) return prev;
          const code = cur.split(/\s*[-–—]\s*/)[0]?.trim() || cur;
          const full = labels.find((l) => {
            const lc = l.split(/\s*[-–—]\s*/)[0]?.trim() || l;
            return lc === code;
          });
          if (full && full !== cur) return { ...prev, liniya: full };
          return prev;
        });
      })
      .catch(() => {
        if (!cancelled) setLineApiOptions([]);
      });
    return () => { cancelled = true; };
  }, [companyId, client?.id]);

  useEffect(() => {
    if (!localStorage.getItem('api_access_token')) return;
    let cancelled = false;
    api.getClientCategories(companyId)
      .then((list) => {
        if (cancelled) return;
        const fromApi = list
          .filter((c) => c.isActive !== false)
          .map((c) => c.name?.trim())
          .filter(Boolean) as string[];
        const cur = (form.category || client?.category || '').trim();
        setCategoryOptions([
          ...new Set([...fromApi, ...CATEGORIES, ...(cur ? [cur] : [])]),
        ]);
      })
      .catch(() => {
        if (cancelled) return;
        const cur = (form.category || client?.category || '').trim();
        setCategoryOptions([
          ...new Set([...CATEGORIES, ...(cur ? [cur] : [])]),
        ]);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, client?.id, client?.category]);

  useEffect(() => {
    if (!client?.id || !localStorage.getItem('api_access_token')) return;
    let cancelled = false;
    setAppCredLoading(true);
    api.getClientAppCredentials(client.id)
      .then(cred => {
        if (cancelled) return;
        if (cred.hasCredentials) {
          setHasAppLogin(true);
          setSavedAppUsername(cred.username);
          setAppLogin(cred.username);
          setAppPassword('');
          setAppLoginEnabled(cred.isActive !== false);
        } else {
          setHasAppLogin(false);
          setSavedAppUsername(null);
          setAppLoginTouched(false);
          setAppLoginEnabled(true);
          setAppLogin(
            cred.suggestedUsername
            ?? clientNameToLogin(client.name, client.code),
          );
          setAppPassword(DEFAULT_CLIENT_APP_PASSWORD);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppLogin(clientNameToLogin(client.name, client.code));
          setAppPassword(DEFAULT_CLIENT_APP_PASSWORD);
        }
      })
      .finally(() => {
        if (!cancelled) setAppCredLoading(false);
      });
    return () => { cancelled = true; };
  }, [client?.id, client?.code, client?.name]);

  useEffect(() => {
    if (hasAppLogin || appLoginTouched || appCredLoading) return;
    const name = form.name.trim();
    if (!name) return;
    const next = clientNameToLogin(name, form.kod || client?.code);
    setAppLogin(prev => (prev === next ? prev : next));
  }, [form.name, form.kod, client?.code, hasAppLogin, appLoginTouched, appCredLoading]);

  useLayoutEffect(() => {
    if (!keepNameFocus.current) return;
    keepNameFocus.current = false;
    const el = nameInputRef.current;
    if (el && document.activeElement !== el) {
      el.focus();
      const len = el.value.length;
      try { el.setSelectionRange(len, len); } catch { /* ignore */ }
    }
  });

  useEffect(() => {
    if (activeTab !== 'xarita' || !mapContainerRef.current || mapRef.current) return;

    const init: [number, number] = gpsCoords ? [gpsCoords.lat, gpsCoords.lng] : [NAVOIY.lat, NAVOIY.lng];

    const updateCoords = (lat: number, lng: number) => {
      setGpsCoords({ lat, lng });
      set('gps', `${lat.toFixed(6)},${lng.toFixed(6)}`);
    };

    const pinIcon = L.divIcon({
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
      html: `<div style="width:28px;height:28px;background:#6366f1;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.35);"></div>`,
    });

    const map = L.map(mapContainerRef.current, {
      center: init,
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });
    switchTileLayer(map, tileRef, activeLayer, D);
    mapRef.current = map;

    const placeMarker = (lat: number, lng: number) => {
      if (markerRef.current) markerRef.current.remove();
      const marker = L.marker([lat, lng], { icon: pinIcon, draggable: true });
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        updateCoords(pos.lat, pos.lng);
      });
      marker.addTo(map);
      markerRef.current = marker;
    };

    placeMarker(init[0], init[1]);

    map.on('click', (e: L.LeafletMouseEvent) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
      updateCoords(e.latlng.lat, e.latlng.lng);
    });

    if (!gpsCoords && !isEdit && navigator.geolocation) {
      setLoadingLoc(true);
      navigator.geolocation.getCurrentPosition(p => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        map.setView([lat, lng], 16);
        placeMarker(lat, lng);
        updateCoords(lat, lng);
        setLoadingLoc(false);
      }, () => {
        placeMarker(NAVOIY.lat, NAVOIY.lng);
        updateCoords(NAVOIY.lat, NAVOIY.lng);
        setLoadingLoc(false);
      });
    } else if (!gpsCoords && isEdit) {
      placeMarker(NAVOIY.lat, NAVOIY.lng);
      updateCoords(NAVOIY.lat, NAVOIY.lng);
    }

    setTimeout(() => map.invalidateSize(true), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [activeTab, D]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || activeTab !== 'xarita') return;
    switchTileLayer(map, tileRef, activeLayer, D);
  }, [activeLayer, D, activeTab]);

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
    key: (['rekvizit', 'kirish', 'kontakt', 'yonalish', 'xarita', 'foto', 'status'] as TabKey[])[i],
    label: lbl,
  }));

  const fieldTokens: FieldTokens = useMemo(() => ({
    bg, divClr, lblClr, valClr, inpBg, inpBdr, focClr, dropBg, dropBdr, D,
  }), [bg, divClr, lblClr, valClr, inpBg, inpBdr, focClr, dropBg, dropBdr, D]);

  /* ── Helpers ── */
  const inpStyle = (extra?: CSSProperties): CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: inpBg, border: `1.5px solid ${inpBdr}`,
    borderRadius: 8, padding: '7px 10px',
    fontSize: 13, color: valClr, outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
    ...extra,
  });

  const onFoc = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = focClr;
    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
  };
  const onBlr = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = inpBdr;
    e.target.style.boxShadow = 'none';
  };

  /* ── Modal size ── */
  const modalWrap: CSSProperties = isMaximized
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
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: valClr }}>
            {isEdit ? t.editNew : t.addNew}
          </div>
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
            {FormMetaInp({
              value: form.kod,
              onChange: v => set('kod', v.replace(/\D/g, '')),
              width: 60,
              mono: true,
              placeholder: '123',
              tokens: fieldTokens,
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 160, maxWidth: 280 }}>
            <span style={{ fontSize: 12, color: lblClr, flexShrink: 0 }}>{t.liniya}:</span>
            {FormMetaDrop({
              value: form.liniya,
              options: lineOptions,
              width: 200,
              menuMinWidth: 260,
              open: openDrop === 'liniya',
              onToggle: () => setOpenDrop(openDrop === 'liniya' ? null : 'liniya'),
              onPick: v => { set('liniya', v); setOpenDrop(null); },
              onClose: () => setOpenDrop(null),
              tokens: fieldTokens,
            })}
          </div>
          <button
            type="button"
            onClick={() => set('status', form.status === 'active' ? 'inactive' : 'active')}
            style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: form.status === 'active'
                ? 'rgba(16,185,129,0.12)'
                : (D ? 'rgba(244,63,94,0.15)' : 'rgba(244,63,94,0.12)'),
              color: form.status === 'active' ? '#10b981' : (D ? '#fb7185' : '#e11d48'),
            }}
          >
            {form.status === 'active' ? t.statusActive : t.statusInactive}
          </button>
          {/* Category dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              ref={categoryBtnRef}
              type="button"
              onClick={() => {
                if (openDrop === 'category') {
                  setOpenDrop(null);
                  return;
                }
                const el = categoryBtnRef.current;
                if (el) {
                  const r = el.getBoundingClientRect();
                  const menuH = Math.min(280, categoryOptions.length * 36 + 8);
                  const spaceBelow = window.innerHeight - r.bottom;
                  const top = spaceBelow < menuH && r.top > menuH
                    ? r.top - menuH - 4
                    : r.bottom + 4;
                  setCatMenuPos({ top, left: Math.max(8, r.left) });
                }
                setOpenDrop('category');
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px',
                borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: form.category === 'VIP' ? 'rgba(139,92,246,0.12)'
                  : form.category === 'Premium' ? 'rgba(167,139,250,0.12)' : 'rgba(99,102,241,0.1)',
                color: form.category === 'VIP' ? '#8b5cf6' : form.category === 'Premium' ? '#a78bfa' : focClr,
              }}
            >
              {form.category || '—'} <ChevronDown size={11} />
            </button>
            {openDrop === 'category' && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 500 }} onClick={() => setOpenDrop(null)} />
                <div style={{
                  position: 'fixed',
                  top: catMenuPos.top,
                  left: catMenuPos.left,
                  zIndex: 501,
                  background: dropBg,
                  border: `1px solid ${dropBdr}`,
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  minWidth: 140,
                  maxHeight: 280,
                  overflowY: 'auto',
                }}>
                  {categoryOptions.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { set('category', c); setOpenDrop(null); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                        fontSize: 12,
                        color: form.category === c ? focClr : valClr,
                        fontWeight: form.category === c ? 700 : 500,
                        background: form.category === c ? (D ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)') : 'none',
                        border: 'none',
                        borderBottom: `1px solid ${divClr}`,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        if (form.category !== c) {
                          (e.currentTarget as HTMLElement).style.background = D ? 'rgba(255,255,255,0.05)' : '#f5f5f5';
                        }
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background =
                          form.category === c ? (D ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)') : 'none';
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
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
            {FormSec({ label: t.secNomi, secBg, secClr, divClr })}
            <FormGrid2 divClr={divClr}>
              <FormCell
                label={t.name}
                value={form.name}
                onChange={v => {
                  keepNameFocus.current = true;
                  set('name', v);
                }}
                tokens={fieldTokens}
                inputRef={nameInputRef}
              />
              <FormCell label={t.officialName} value={form.officialName} onChange={v => set('officialName', v)} tokens={fieldTokens} />
            </FormGrid2>
            <FormGrid2 divClr={divClr}>
              <FormCell label={t.legalAddr} value={form.legalAddr} onChange={v => set('legalAddr', v)} tokens={fieldTokens} />
              <FormCell label={t.landmark} value={form.landmark} onChange={v => set('landmark', v)} tokens={fieldTokens} />
            </FormGrid2>
            <FormGrid2 divClr={divClr}>
              <FormCell label={t.phones} value={form.phones} onChange={v => set('phones', v)} tokens={fieldTokens} phone />
              <FormCell label={t.bankAcc} value={form.bankAcc} onChange={v => set('bankAcc', v)} tokens={fieldTokens} mono />
            </FormGrid2>

            {FormSec({ label: t.secBank, secBg, secClr, divClr })}
            <FormGrid2 divClr={divClr}>
              <FormCell label={t.mfo} value={form.mfo} onChange={v => set('mfo', v)} tokens={fieldTokens} mono />
              <FormCell label={t.bank} value={form.bank} onChange={v => set('bank', v)} tokens={fieldTokens} />
            </FormGrid2>

            {FormSec({ label: t.secOrg, secBg, secClr, divClr })}
            <FormGrid2 divClr={divClr}>
              <FormDropCell
                label={t.cls}
                value={form.cls}
                options={CLASSES}
                open={openDrop === 'cls'}
                onToggle={() => setOpenDrop(openDrop === 'cls' ? null : 'cls')}
                onPick={v => { set('cls', v); setOpenDrop(null); }}
                onClose={() => setOpenDrop(null)}
                tokens={fieldTokens}
              />
              <FormDropCell
                label={t.type}
                value={form.type}
                options={TYPES}
                open={openDrop === 'type'}
                onToggle={() => setOpenDrop(openDrop === 'type' ? null : 'type')}
                onPick={v => { set('type', v); setOpenDrop(null); }}
                onClose={() => setOpenDrop(null)}
                tokens={fieldTokens}
              />
            </FormGrid2>
            <FormGrid2 divClr={divClr}>
              <FormCell label={t.director} value={form.director} onChange={v => set('director', v)} tokens={fieldTokens} />
              <FormCell label={t.chiefAcc} value={form.chiefAcc} onChange={v => set('chiefAcc', v)} tokens={fieldTokens} />
            </FormGrid2>
            <FormGrid2 divClr={divClr}>
              <FormDropCell
                label={t.channel}
                value={form.channel}
                options={CHANNELS}
                open={openDrop === 'channel'}
                onToggle={() => setOpenDrop(openDrop === 'channel' ? null : 'channel')}
                onPick={v => { set('channel', v); setOpenDrop(null); }}
                onClose={() => setOpenDrop(null)}
                tokens={fieldTokens}
              />
              <div style={{
                padding: '8px 12px', position: 'relative',
                borderRight: `1px solid ${divClr}`, background: bg,
              }}>
                <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{t.agent}</div>
                <button
                  onClick={() => setOpenDrop(openDrop === 'agent' ? null : 'agent')}
                  style={{
                    ...inpStyle({ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }),
                    borderColor: openDrop === 'agent' ? focClr : inpBdr,
                    boxShadow: openDrop === 'agent' ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
                  } as CSSProperties}
                >
                  <span style={{ fontSize: 13, color: form.agent ? valClr : lblClr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                    {form.agent || (agents.length === 0 ? '...' : '...')}
                  </span>
                  <ChevronDown size={14} color={lblClr} style={{ flexShrink: 0, transform: openDrop === 'agent' ? 'rotate(180deg)' : '', transition: 'transform .15s' }} />
                </button>
                {openDrop === 'agent' && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 400 }} onClick={() => setOpenDrop(null)} />
                    <div style={{
                      position: 'absolute', left: 12, right: 12, top: 'calc(100% - 4px)', zIndex: 401,
                      background: dropBg, border: `1px solid ${dropBdr}`, borderRadius: 10,
                      boxShadow: '0 8px 28px rgba(0,0,0,0.18)', overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
                    }}>
                      {agentNames.length === 0 ? (
                        <div style={{ padding: '10px 14px', fontSize: 12, color: lblClr }}>...</div>
                      ) : agentNames.map(name => (
                        <button key={name} onClick={() => {
                          const picked = agents.find(a => a.name === name);
                          set('agent', name);
                          set('distributorId', picked?.id ?? '');
                          setOpenDrop(null);
                        }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13,
                            background: form.agent === name ? (D ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)') : 'none',
                            color: form.agent === name ? focClr : valClr,
                            border: 'none', borderBottom: `1px solid ${divClr}`, cursor: 'pointer',
                          }}
                        >{name}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </FormGrid2>

            {FormSec({ label: t.secGps, secBg, secClr, divClr })}
            <FormGrid2 divClr={divClr}>
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
              <FormDropCell
                label={t.priceZone}
                value={form.priceZone}
                options={priceZoneOptions}
                open={openDrop === 'priceZone'}
                onToggle={() => setOpenDrop(openDrop === 'priceZone' ? null : 'priceZone')}
                onPick={v => { set('priceZone', v); setOpenDrop(null); }}
                onClose={() => setOpenDrop(null)}
                tokens={fieldTokens}
              />
            </FormGrid2>
            <FormGrid2 divClr={divClr}>
              <FormCell label={t.budget} value={form.budget} onChange={v => set('budget', v)} tokens={fieldTokens} />
              <FormCell label={t.mainContract} value={form.mainContract} onChange={v => set('mainContract', v)} tokens={fieldTokens} />
            </FormGrid2>
            <FormGrid2 divClr={divClr}>
              <FormCell label={t.note} value={form.note} onChange={v => set('note', v)} tokens={fieldTokens} span />
            </FormGrid2>

            {FormSec({ label: t.secInn, secBg, secClr, divClr })}
            <FormGrid2 divClr={divClr}>
              <FormCell label={t.inn} value={form.inn} onChange={v => set('inn', v)} tokens={fieldTokens} mono />
              <FormCell label={t.territory} value={form.territory} onChange={v => set('territory', v)} tokens={fieldTokens} />
            </FormGrid2>
            <FormGrid2 divClr={divClr}>
              <FormCell label={t.settlement} value={form.settlement} onChange={v => set('settlement', v)} tokens={fieldTokens} />
              <FormCell label={t.pinfl} value={form.pinfl} onChange={v => set('pinfl', v)} tokens={fieldTokens} mono />
            </FormGrid2>
            <FormGrid2 divClr={divClr}>
              <FormCell label={t.telegram} value={form.telegram} onChange={v => set('telegram', v)} tokens={fieldTokens} />
              {/* empty right cell */}
              <div style={{ padding: '8px 12px', background: bg }} />
            </FormGrid2>

          </>)}

          {/* ════ KIRISH (APK) ════ */}
          {activeTab === 'kirish' && (<>
            {FormSec({ label: t.appLoginTitle.toUpperCase(), secBg, secClr, divClr })}
            <div style={{
              margin: '0 12px 12px',
              padding: '14px 16px',
              borderRadius: 12,
              background: D ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
              border: `1px solid ${D ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)'}`,
            }}>
              <div style={{ marginBottom: 10 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                  background: hasAppLogin ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                  color: hasAppLogin ? '#10b981' : '#ef4444',
                }}>
                  {hasAppLogin ? `✓ ${t.appSaved}` : t.appNotSaved}
                </span>
              </div>
              {appCredLoading ? (
                <p style={{ fontSize: 12, color: lblClr, margin: 0 }}>...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {isEdit && client?.id && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      padding: '10px 12px', borderRadius: 10,
                      background: D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${divClr}`,
                    }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, color: valClr, fontWeight: 600 }}>{t.appLoginAccess}</div>
                        <div style={{ fontSize: 11, color: lblClr, marginTop: 3, lineHeight: 1.35 }}>
                          {t.appLoginAccessHint}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={appLoginAccessBusy}
                        onClick={() => void handleToggleAppLoginAccess()}
                        style={{
                          flexShrink: 0, height: 34, minWidth: 100, padding: '0 12px', borderRadius: 10,
                          border: 'none', cursor: appLoginAccessBusy ? 'wait' : 'pointer',
                          fontWeight: 700, fontSize: 12, opacity: appLoginAccessBusy ? 0.7 : 1,
                          background: appLoginEnabled ? 'rgba(16,185,129,0.14)' : inpBg,
                          color: appLoginEnabled ? '#059669' : lblClr,
                        }}
                      >
                        {appLoginEnabled ? t.appLoginAccessOn : t.appLoginAccessOff}
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ minWidth: 72, fontSize: 12, color: lblClr }}>{t.appLogin}:</span>
                    <input
                      value={appLogin}
                      onChange={e => {
                        const v = e.target.value;
                        setAppLogin(v);
                        setAppLoginTouched(true);
                        setAppLoginTaken(false);
                        setAppCredError(null);
                        scheduleLoginCheck(v);
                      }}
                      onBlur={() => { void verifyAppLoginAvailable(appLogin); }}
                      placeholder="sherinmarket"
                      style={{
                        ...inpStyle({ flex: 1, minWidth: 140 }),
                        fontFamily: 'monospace',
                        borderColor: appLoginTaken ? '#ef4444' : undefined,
                      }}
                      onFocus={onFoc}
                    />
                    {appLoginChecking && (
                      <span style={{ fontSize: 10, color: lblClr }}>{t.appLoginChecking}</span>
                    )}
                    {hasAppLogin && savedAppUsername && !appLoginTaken && (
                      <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>
                        ✓ {savedAppUsername}
                      </span>
                    )}
                    {appLoginTaken && (
                      <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>
                        ✕ {t.appLoginTaken}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ minWidth: 72, fontSize: 12, color: lblClr }}>{t.appPassword}:</span>
                    <div style={{ flex: 1, minWidth: 140, position: 'relative' }}>
                      <input
                        type={showAppPassword ? 'text' : 'password'}
                        value={appPassword}
                        onChange={e => { setAppPassword(e.target.value); setAppCredError(null); }}
                        placeholder={hasAppLogin ? t.appPasswordNew : '••••••••'}
                        style={{ ...inpStyle({ width: '100%', paddingRight: 36 }), fontFamily: 'monospace' }}
                        onFocus={onFoc} onBlur={onBlr}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAppPassword(v => !v)}
                        style={{
                          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: lblClr, padding: 2,
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        {showAppPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: lblClr, margin: 0, lineHeight: 1.45 }}>
                    {t.appHint}
                    {hasAppLogin && (
                      <span style={{ display: 'block', marginTop: 4 }}>{t.appPasswordKeep}</span>
                    )}
                  </p>
                  {appCredError && (
                    <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{appCredError}</p>
                  )}
                  {isEdit && client?.id && (
                    <button
                      type="button"
                      onClick={handleSaveAppCredentialsOnly}
                      disabled={appLoginTaken || appLoginChecking}
                      style={{
                        marginTop: 4, padding: '9px 14px', borderRadius: 10, border: 'none',
                        background: focClr, color: '#fff', fontSize: 12, fontWeight: 600,
                        cursor: appLoginTaken || appLoginChecking ? 'not-allowed' : 'pointer',
                        opacity: appLoginTaken || appLoginChecking ? 0.55 : 1,
                      }}
                    >
                      {t.appSaveLogin}
                    </button>
                  )}
                </div>
              )}
            </div>
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
                <FormGrid2 divClr={divClr}>
                  {/* Name */}
                  <div style={{ padding: '8px 12px', borderRight: `1px solid ${divClr}`, background: bg }}>
                    <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{t.contactPerson}</div>
                    <input value={c.name} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder="..." style={inpStyle({})} onFocus={onFoc} onBlur={onBlr} />
                  </div>
                  {/* Phone */}
                  <div style={{ padding: '8px 12px', background: bg }}>
                    <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{t.contactPhone}</div>
                    <input type="tel" value={c.phone} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, phone: formatUzPhoneInput(e.target.value) } : x))}
                      placeholder="+998 99 999 99 99" style={inpStyle({})} onFocus={onFoc} onBlur={onBlr} />
                  </div>
                </FormGrid2>
                {/* Role - full width */}
                <div style={{ padding: '8px 12px', borderBottom: `1px solid ${divClr}`, background: bg }}>
                  <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{t.contactRole}</div>
                  <input value={c.role} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                    placeholder="..." style={inpStyle({})} onFocus={onFoc} onBlur={onBlr} />
                </div>
              </div>
            ))}
            <div style={{ padding: 12 }}>
              <button onClick={() => setContacts([...contacts, { name: '', phone: UZ_PHONE_DEFAULT, role: '' }])}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
                  border: `1.5px solid ${inpBdr}`, background: inpBg,
                  color: focClr, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <Plus size={13} /> {t.addContact}
              </button>
            </div>
          </>)}

          {/* ════ ORGANIZATSIYA ════ */}
          {activeTab === 'yonalish' && (
            <div>
              <p style={{ fontSize: 12, color: lblClr, margin: '0 0 12px' }}>{t.orgHint}</p>
              {orgList.length === 0 ? (
                <p style={{ fontSize: 13, color: lblClr }}>{t.orgEmpty}</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: secBg, borderBottom: `1px solid ${divClr}` }}>
                      <th style={{ width: 44, padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: secClr }}>{t.directionNo}</th>
                      <th style={{ width: 36, padding: '8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: secClr }}>✓</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: secClr }}>{t.directionName}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgList.map((org, i) => {
                      const on = selectedOrgIds.has(org.id);
                      const label = org.shortName?.trim() || org.name;
                      return (
                        <tr
                          key={org.id}
                          onClick={() => {
                            setSelectedOrgIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(org.id)) next.delete(org.id);
                              else next.add(org.id);
                              return next;
                            });
                          }}
                          style={{
                            borderBottom: `1px solid ${divClr}`,
                            cursor: 'pointer',
                            background: on ? (D ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)') : bg,
                          }}
                        >
                          <td style={{ padding: '11px 16px', fontSize: 13, color: lblClr }}>{i + 1}</td>
                          <td style={{ padding: '11px 8px', textAlign: 'center' }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: 4, margin: '0 auto',
                              border: `2px solid ${on ? focClr : inpBdr}`,
                              background: on ? focClr : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {on && <Check size={11} color="#fff" />}
                            </div>
                          </td>
                          <td style={{
                            padding: '11px 8px', fontSize: 13,
                            fontWeight: on ? 600 : 400,
                            color: on ? (D ? '#a5b4fc' : '#4338ca') : valClr,
                          }}>
                            {label}
                            {org.shortName && org.name !== org.shortName && (
                              <span style={{ marginLeft: 8, fontSize: 11, color: lblClr, fontWeight: 400 }}>{org.name}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
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
                <MapLayerSwitcher activeLayer={activeLayer} onChange={setActiveLayer} bottom={12} left={12} />
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
            {FormSec({ label: t.photoSection.toUpperCase(), secBg, secClr, divClr })}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={e => {
                void handlePhotoPick(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, background: bg }}>
              {photos.map((src, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => { setPhotos([]); setPhotoUrl(null); }}
                    style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 6,
                      background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <X size={11} />
                  </button>
                  {photoUploading && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 11, fontWeight: 600,
                    }}>
                      …
                    </div>
                  )}
                </div>
              ))}
              {photos.length === 0 && (
                <button
                  type="button"
                  disabled={photoUploading}
                  onClick={() => photoInputRef.current?.click()}
                  style={{ aspectRatio: '1', borderRadius: 12, border: `2px dashed ${inpBdr}`,
                    background: inpBg, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8, color: lblClr,
                    opacity: photoUploading ? 0.6 : 1 }}
                >
                  <Camera size={22} />
                  <span style={{ fontSize: 12 }}>{photoUploading ? '…' : t.addPhoto}</span>
                </button>
              )}
              {photos.length > 0 && (
                <button
                  type="button"
                  disabled={photoUploading}
                  onClick={() => photoInputRef.current?.click()}
                  style={{ aspectRatio: '1', borderRadius: 12, border: `2px dashed ${inpBdr}`,
                    background: inpBg, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8, color: lblClr }}
                >
                  <Camera size={22} />
                  <span style={{ fontSize: 12 }}>{t.addPhoto}</span>
                </button>
              )}
            </div>
          </>)}

          {/* ════ HOLAT ════ */}
          {activeTab === 'status' && (<>
            {FormSec({ label: t.statusSection.toUpperCase(), secBg, secClr, divClr })}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderBottom: `1px solid ${divClr}`, background: bg }}>
              <span style={{ fontSize: 13, color: lblClr }}>{t.statusSection}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ key: 'active', label: t.statusActive }, { key: 'inactive', label: t.statusInactive }].map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => set('status', s.key)}
                    style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', border: 'none',
                      background: form.status === s.key
                        ? s.key === 'active'
                          ? 'rgba(16,185,129,0.12)'
                          : (D ? 'rgba(244,63,94,0.15)' : 'rgba(244,63,94,0.12)')
                        : 'transparent',
                      color: form.status === s.key
                        ? s.key === 'active'
                          ? '#10b981'
                          : (D ? '#fb7185' : '#e11d48')
                        : lblClr,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: '12px 16px', borderBottom: `1px solid ${divClr}`, background: bg }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, color: lblClr, fontWeight: 600 }}>{t.canSeePromotions}</div>
                <div style={{ fontSize: 11, color: lblClr, opacity: 0.75, marginTop: 3, lineHeight: 1.35 }}>
                  {t.canSeePromotionsHint}
                </div>
              </div>
              <button
                type="button"
                onClick={() => set('canSeePromotions', !form.canSeePromotions)}
                style={{
                  flexShrink: 0, minWidth: 108, padding: '6px 12px', borderRadius: 20,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: form.canSeePromotions ? 'rgba(16,185,129,0.14)' : inpBg,
                  color: form.canSeePromotions ? '#059669' : lblClr,
                }}
              >
                {form.canSeePromotions ? t.canSeePromotionsOn : t.canSeePromotionsOff}
              </button>
            </div>
            <FormGrid2 divClr={divClr}>
              <div style={{ padding: '8px 12px', borderRight: `1px solid ${divClr}`, background: bg }}>
                <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{t.registrationDate}</div>
                <SingleDatePicker
                  value={form.regDate}
                  onChange={(v) => set('regDate', v)}
                  D={D}
                  readOnly
                  className="w-full"
                />
                {isEdit && client?.createdBy ? (
                  <div style={{ fontSize: 11, color: lblClr, marginTop: 6, opacity: 0.85 }}>
                    {client.createdBy}
                  </div>
                ) : null}
              </div>
              <div style={{ padding: '8px 12px', background: bg }} />
            </FormGrid2>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${divClr}`, background: bg }}>
              <div style={{ fontSize: 11, color: lblClr, marginBottom: 4, fontWeight: 500 }}>{t.comment}</div>
              <textarea rows={4} value={form.comment} onChange={e => set('comment', e.target.value)}
                placeholder="..."
                style={{ ...inpStyle({}), resize: 'none' } as CSSProperties}
                onFocus={onFoc} onBlur={onBlr} />
            </div>
          </>)}

        </div>

        {/* ── BOTTOM ── */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '10px 14px',
          borderTop: `1px solid ${divClr}`, background: topBg }}>
          <button
            onClick={handleSave}
            disabled={appLoginTaken || appLoginChecking || saveBusy}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: 11, background: focClr, color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 600,
              cursor: appLoginTaken || appLoginChecking || saveBusy ? 'not-allowed' : 'pointer',
              opacity: appLoginTaken || appLoginChecking || saveBusy ? 0.55 : 1,
            }}
          >
            <Save size={14} /> {t.saveClose}
          </button>
          <button onClick={onClose}
            style={{ padding: '11px 18px', borderRadius: 10, border: `1.5px solid ${inpBdr}`,
              cursor: 'pointer', background: inpBg, color: lblClr, fontSize: 13, fontWeight: 500 }}>
            {t.close}
          </button>
        </div>

      </div>
      {similarityMatch && (
        <ClientSimilarityWarningModal
          D={D}
          match={similarityMatch}
          busy={saveBusy}
          title={t.simTitle}
          confirmLabel={isEdit ? t.simConfirmSave : t.simConfirmAdd}
          cancelLabel={t.simCancel}
          labels={{
            probability: t.simProbability,
            riskHigh: t.simRiskHigh,
            riskMedium: t.simRiskMedium,
            riskLow: t.simRiskLow,
            foundClient: t.simFoundClient,
            innBlocked: t.simInnBlocked,
            understand: t.simUnderstand,
            fieldName: t.simFieldName,
            fieldFullName: t.simFieldFullName,
            fieldPhone: t.simFieldPhone,
            fieldInn: t.simFieldInn,
            fieldTerritory: t.simFieldTerritory,
          }}
          onCancel={() => { setSimilarityMatch(null); setPendingSave(null); }}
          onClose={() => { setSimilarityMatch(null); setPendingSave(null); }}
          onConfirm={() => {
            if (!pendingSave || !onSave) return;
            void (async () => {
              setSaveBusy(true);
              try {
                await onSave(pendingSave);
                const login = pendingSave.appUsername?.trim();
                if (pendingSave.appLoginChanged && login) markCredentialsSaved(login);
                setSimilarityMatch(null);
                setPendingSave(null);
                onClose();
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                setAppCredError(msg.replace(/^HTTP \d+:\s*/i, ''));
                setSimilarityMatch(null);
                setPendingSave(null);
              } finally {
                setSaveBusy(false);
              }
            })();
          }}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}