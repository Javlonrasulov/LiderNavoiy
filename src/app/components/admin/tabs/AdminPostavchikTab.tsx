import { useState, useEffect, useRef } from 'react';
import {
  Download,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, X, Package, Plus,
  TrendingUp, TrendingDown, Scale,
} from 'lucide-react';
import { fmt } from '../../../data/adminData';
import { demo } from '../../../data/demoLimit';
import { api, type UsdExchangeRates } from '../../../api/client';
import { DateRangePickerCalendar } from '../DateRangePickerCalendar';
import { PostupleniyaModal } from '../PostupleniyaModal';
import { PostupleniyaDetailModal, type PostRowRef } from '../PostupleniyaDetailModal';
import { VozvratDetailModal, type VozRowRef } from '../VozvratDetailModal';
import { AktSverkiModal } from '../AktSverkiModal';
import { BonusStrafCreateModal } from '../BonusStrafCreateModal';
import { formatDisplayDate } from '../../../utils/dateFormat';

const POST_RECEIPTS_KEY = 'lider_goods_receipts';
const POST_IMPORTED_KEY = 'lider_goods_receipts_imported';

function loadLocalPostReceipts(): PostRowRef[] {
  try {
    const raw = localStorage.getItem(POST_RECEIPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PostRowRef[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapApiReceipt(r: Awaited<ReturnType<typeof api.getGoodsReceipts>>[number]): PostRowRef {
  return {
    id: r.id,
    date: r.date,
    num: r.num,
    ox: r.ox,
    supplier: r.supplier,
    org: r.org,
    warehouse: r.warehouse,
    wagon: r.wagon || '',
    dir: r.dir || '',
    invoice: r.invoice || '',
    sum: Number(r.sum) || 0,
    netto: Number(r.netto) || 0,
    type: r.type,
    author: r.author || '',
    authorId: r.authorId || undefined,
    items: (r.items || []).map((it, i) => ({
      id: i + 1,
      productId: it.productId || undefined,
      tovar: it.tovar,
      artikul: it.artikul || '',
      kolFakt: Number(it.kolFakt) || 0,
      kolBrak: Number(it.kolBrak) || 0,
      upakovka: it.upakovka || '',
      tsenaPost: Number(it.tsenaPost) || 0,
      skid: Number(it.skid) || 0,
      tsenaPriv: Number(it.tsenaPriv) || 0,
      summa: Number(it.summa) || 0,
      ves: Number(it.ves) || 0,
    })),
    companyId: r.companyId,
    reconciliationStatus: r.reconciliationStatus,
  };
}

interface Props {
  D: boolean;
  card: string;
  divider: string;
  cardHover: string;
  sub: string;
  text: string;
  input: string;
  t: Record<string, string>;
  companyId?: string;
}

interface SupRow {
  id: number;
  name: string;
  d_open: number;
  c_open: number;
  debit: number;
  credit: number;
  d_close: number;
  c_close: number;
}

export const SUP_DATA = demo([
  { id:  1, name: '"IMILKY" MCHJ',            d_open:           0, c_open:          0, debit: 108_519_050, credit:  65_000_000, d_close:  43_519_050, c_close:          0 },
  { id:  2, name: 'ASMO ICE CREAM',            d_open:           0, c_open: 15_615_200, debit: 146_321_000, credit:  99_093_000, d_close:  31_612_800, c_close:          0 },
  { id:  3, name: 'EXCLUSIVE FOOD IMPORT',     d_open:   8_877_600, c_open:          0, debit:     874_000, credit:           0, d_close:   9_751_600, c_close:          0 },
  { id:  4, name: 'Jahongir Zubayda — XORAZM', d_open: 373_262_388, c_open:          0, debit: 607_824_930, credit: 560_926_370, d_close: 420_160_948, c_close:          0 },
  { id:  5, name: 'Nodir Invest',              d_open:           0, c_open:          0, debit:  51_594_000, credit:  10_000_000, d_close:  41_594_000, c_close:          0 },
  { id:  6, name: 'REGION FOODS — XORAZM',    d_open: 887_576_078, c_open:          0, debit: 456_882_762, credit: 1_040_000_000, d_close: 304_458_838, c_close:         0 },
  { id:  7, name: 'RUMYA CHEESE',              d_open:   2_335_000, c_open:          0, debit:  23_758_947, credit:  10_000_000, d_close:  16_093_947, c_close:          0 },
  { id:  8, name: 'SOLPRO ALLEANCE (PILLER)',  d_open: 155_258_330, c_open:          0, debit: 171_530_000, credit: 219_640_000, d_close: 107_148_330, c_close:          0 },
  { id:  9, name: 'Беларус Сыр Голланд',       d_open:  15_327_455, c_open:          0, debit:           0, credit:           0, d_close:  15_327_455, c_close:          0 },
  { id: 10, name: 'Ботир Ака. Бухоро',         d_open:           0, c_open:          0, debit:  17_290_946, credit:  62_376_662, d_close:           0, c_close:  45_085_716 },
  { id: 11, name: 'Жамшид ака Бухоро',         d_open:           0, c_open:          0, debit:  25_192_300, credit:  74_861_276, d_close:           0, c_close:  49_668_976 },
  { id: 12, name: 'Сыр Голланд Хоразм. 2',    d_open:           0, c_open:          0, debit:  25_459_000, credit:   9_330_000, d_close:  16_129_000, c_close:          0 },
  { id: 13, name: 'Сыр Хоразм Галланд',        d_open: 176_294_600, c_open:          0, debit: 295_251_000, credit: 290_090_000, d_close: 181_455_600, c_close:          0 },
  { id: 14, name: 'ЧП "SALAR MEAT PRODUCT"',  d_open:           0, c_open:          0, debit:  18_697_528, credit:  10_411_000, d_close:   8_286_528, c_close:          0 },
]);

function N(n: number) {
  if (n === 0) return '—';
  return n.toLocaleString('ru-RU');
}

const REPORT_TAB_KEYS = ['supTabSchyot', 'supTabPartiya', 'supTabGuruh', 'supTabPostup'] as const;
const REPORT_TAB_IDS  = ['schyot', 'partiya', 'guruh', 'postupleniya'] as const;
type ReportTab = typeof REPORT_TAB_IDS[number] | 'vozvrat' | 'bonusstraf';

interface BonusStrafRow {
  id:         number;
  date:       string;
  num:        string;
  supplier:   string;
  org:        string;
  bonusType:  string;
  bonus:      number;
  strafType:  string;
  straf:      number;
  dir:        string;
  bonusNote:  string;
  strafNote:  string;
  author:     string;
}

const BONUS_STRAF_DATA: BonusStrafRow[] = [
  { id:1, date:'31.01.2026 12:00:00', num:'1', supplier:'"IMILKY" MCHJ', org:'OOO "BORAN L..."', bonusType:'', bonus:745_000,   strafType:'', straf:0, dir:'SHERIN', bonusNote:'Январ ойи Скитка',  strafNote:'', author:'Менеджер' },
  { id:2, date:'28.02.2026 12:00:00', num:'2', supplier:'"IMILKY" MCHJ', org:'OOO "BORAN L..."', bonusType:'', bonus:1_620_000, strafType:'', straf:0, dir:'SHERIN', bonusNote:'Феврал Ойи скитка', strafNote:'', author:'Менеджер' },
];


interface VozvratRow {
  id:         number;
  dateSend:   string;
  dateAccept: string;
  num:        string;
  supplier:   string;
  org:        string;
  warehouse:  string;
  note:       string;
  dir:        string;
  sum:        number;
}

const VOZVRAT_DATA = demo([
  { id:1,  dateSend:'10.02.2026 00:00', dateAccept:'10.02.2026 00:00', num:'44', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:19_372_700 },
  { id:2,  dateSend:'11.02.2026 00:00', dateAccept:'11.02.2026 00:00', num:'45', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:4_097_574  },
  { id:3,  dateSend:'12.02.2026 13:15', dateAccept:'12.02.2026 13:15', num:'46', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'',             note:'', dir:'SOF IN', sum:4_227_638  },
  { id:4,  dateSend:'13.02.2026 10:29', dateAccept:'13.02.2026 10:29', num:'49', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'',             note:'', dir:'SOF IN', sum:4_057_784  },
  { id:5,  dateSend:'14.02.2026 19:55', dateAccept:'14.02.2026 19:55', num:'50', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:7_757_320  },
  { id:6,  dateSend:'17.02.2026 15:00', dateAccept:'17.02.2026 15:00', num:'51', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:1_204_490  },
  { id:7,  dateSend:'18.02.2026 16:34', dateAccept:'18.02.2026 16:34', num:'52', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:5_999_105  },
  { id:8,  dateSend:'19.02.2026 20:57', dateAccept:'19.02.2026 20:57', num:'53', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:10_044_779 },
  { id:9,  dateSend:'20.02.2026 16:39', dateAccept:'20.02.2026 16:39', num:'54', supplier:'Жамшид ака Бухоро', org:'OOO «BORAN L…»', warehouse:'Склад SHERIN', note:'', dir:'SHERIN', sum:25_192_300 },
  { id:10, dateSend:'20.02.2026 23:48', dateAccept:'20.02.2026 23:48', num:'55', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:4_762_333  },
  { id:11, dateSend:'22.02.2026 01:49', dateAccept:'22.02.2026 01:49', num:'56', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:696_400    },
  { id:12, dateSend:'24.02.2026 20:29', dateAccept:'24.02.2026 20:29', num:'57', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:0          },
  { id:13, dateSend:'24.02.2026 21:07', dateAccept:'24.02.2026 21:07', num:'58', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:11_021_135 },
  { id:14, dateSend:'25.02.2026 19:58', dateAccept:'25.02.2026 19:58', num:'59', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:3_611_263  },
  { id:15, dateSend:'26.02.2026 22:50', dateAccept:'26.02.2026 22:50', num:'60', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:4_617_894  },
  { id:16, dateSend:'27.02.2026 20:11', dateAccept:'27.02.2026 20:11', num:'61', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:3_189_904  },
  { id:17, dateSend:'02.03.2026 19:54', dateAccept:'02.03.2026 19:54', num:'62', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:5_947_360  },
  { id:18, dateSend:'03.03.2026 15:09', dateAccept:'03.03.2026 15:09', num:'63', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:5_428_606  },
  { id:19, dateSend:'04.03.2026 17:57', dateAccept:'04.03.2026 17:57', num:'64', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:8_965_645  },
  { id:20, dateSend:'05.03.2026 19:31', dateAccept:'05.03.2026 19:31', num:'65', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:6_764_470  },
  { id:21, dateSend:'06.03.2026 13:00', dateAccept:'06.03.2026 13:00', num:'66', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Склад SOFIN',  note:'', dir:'SOF IN', sum:3_421_400  },
  { id:22, dateSend:'06.03.2026 17:50', dateAccept:'06.03.2026 17:50', num:'67', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'',             note:'', dir:'SOF IN', sum:0          },
  { id:23, dateSend:'06.03.2026 17:51', dateAccept:'06.03.2026 17:51', num:'68', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Склад SOFIN',  note:'', dir:'SOF IN', sum:0          },
  { id:24, dateSend:'09.03.2026 20:03', dateAccept:'09.03.2026 20:03', num:'69', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'',             note:'', dir:'SOF IN', sum:9_032_300  },
  { id:25, dateSend:'10.03.2026 15:35', dateAccept:'10.03.2026 15:35', num:'70', supplier:'Янги асорт «Соф…»', org:'LEADERS BARAKA',  warehouse:'Брак',         note:'', dir:'SOF IN', sum:0          },
]);

export function AdminPostavchikTab({ D, card, divider, sub, text, t, companyId }: Props) {
  const [aktSup, setAktSup] = useState<SupRow | null>(null);

  const [reportTab, setReportTab] = useState<ReportTab>('schyot');
  const [date1, setDate1] = useState('2026-01-01');
  const [date2, setDate2] = useState('2026-03-10');
  const [currency, setCurrency] = useState('UZS');
  const [usdtRate, setUsdtRate] = useState('');
  const [exchangeRates, setExchangeRates] = useState<UsdExchangeRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const rows = SUP_DATA.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const tot = (k: keyof SupRow) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const totalDebit  = tot('debit');
  const totalCredit = tot('credit');
  const totalDClose = tot('d_close');
  const totalCClose = tot('c_close');

  const fmtDate = (d: string) => d.split('-').reverse().join('-');

  useEffect(() => {
    if (!currencyOpen) return;
    const handler = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node))
        setCurrencyOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [currencyOpen]);

  const formatRateInput = (rate: number) =>
    rate > 0 ? rate.toFixed(2) : '';

  useEffect(() => {
    let cancelled = false;
    setRatesLoading(true);
    api.getUsdExchangeRates()
      .then(data => {
        if (cancelled) return;
        setExchangeRates(data);
        if (currency === 'USDT') {
          setUsdtRate(formatRateInput(data.cbu.rate));
        }
      })
      .catch(() => { /* rates strip stays empty; input remains editable */ })
      .finally(() => { if (!cancelled) setRatesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (currency === 'USDT' && exchangeRates) {
      setUsdtRate(formatRateInput(exchangeRates.cbu.rate));
    }
  }, [currency, exchangeRates]);

  const selectCurrency = (opt: string) => {
    setCurrency(opt);
    setCurrencyOpen(false);
  };

  const fmtRate = (v: number) =>
    v > 0 ? v.toLocaleString('ru-RU') : '—';

  const MARKED: Set<string> = new Set([
    '2026-01-05','2026-01-12','2026-01-19','2026-01-26',
    '2026-02-03','2026-02-10','2026-02-17','2026-02-24',
    '2026-03-03','2026-03-07','2026-03-10',
  ]);

  const [postData, setPostData] = useState<PostRowRef[]>([]);
  const [postLoading, setPostLoading] = useState(true);
  const [postFilter, setPostFilter] = useState<'all'|'opt'|'chakana'|'ishlab'>('all');
  const [postSearch, setPostSearch] = useState('');
  const [postExpanded, setPostExpanded] = useState<Set<string | number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostRowRef | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPostLoading(true);
      try {
        let rows = await api.getGoodsReceipts({ companyId });
        // Bir marta localStorage → API import
        if (rows.length === 0 && !localStorage.getItem(POST_IMPORTED_KEY)) {
          const local = loadLocalPostReceipts();
          if (local.length > 0) {
            await api.importGoodsReceipts(
              local.map(r => ({
                legacyId: r.id,
                companyId: companyId || undefined,
                date: r.date,
                num: r.num,
                ox: r.ox,
                supplier: r.supplier,
                org: r.org,
                warehouse: r.warehouse,
                wagon: r.wagon,
                dir: r.dir,
                invoice: r.invoice,
                sum: r.sum,
                netto: r.netto,
                type: r.type,
                author: r.author,
                authorId: r.authorId,
                items: (r.items || []).map(it => ({
                  productId: it.productId,
                  tovar: it.tovar,
                  artikul: it.artikul,
                  kolFakt: it.kolFakt,
                  kolBrak: it.kolBrak,
                  upakovka: it.upakovka,
                  tsenaPost: it.tsenaPost,
                  skid: it.skid,
                  tsenaPriv: it.tsenaPriv,
                  summa: it.summa,
                  ves: it.ves,
                })),
              })),
            );
            localStorage.setItem(POST_IMPORTED_KEY, '1');
            rows = await api.getGoodsReceipts({ companyId });
          } else {
            localStorage.setItem(POST_IMPORTED_KEY, '1');
          }
        }
        if (!cancelled) setPostData(rows.map(mapApiReceipt));
      } catch (e) {
        console.error('Failed to load goods receipts', e);
        if (!cancelled) {
          // Offline fallback
          setPostData(loadLocalPostReceipts());
        }
      } finally {
        if (!cancelled) setPostLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  // table scroll refs
  const postTableRef = useRef<HTMLDivElement>(null);
  const scrollPostTable = (dir: 'left' | 'right') => {
    if (postTableRef.current) postTableRef.current.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
  };
  const vozTableRef = useRef<HTMLDivElement>(null);
  const scrollVozTable = (dir: 'left' | 'right') => {
    if (vozTableRef.current) vozTableRef.current.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
  };
  const supTableRef = useRef<HTMLDivElement>(null);
  const scrollSupTable = (dir: 'left' | 'right') => {
    if (supTableRef.current) supTableRef.current.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
  };

  // bonusstraf state
  const bnsTableRef = useRef<HTMLDivElement>(null);
  const scrollBnsTable = (dir: 'left' | 'right') => {
    if (bnsTableRef.current) bnsTableRef.current.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
  };
  const [bnsSearch, setBnsSearch] = useState('');
  const [bnsFilter, setBnsFilter] = useState<'all'|'bonus'|'straf'>('all');
  const [bnsExpanded, setBnsExpanded] = useState<Set<number>>(new Set());
  const [showBnsCreate, setShowBnsCreate] = useState(false);
  const toggleBns = (id: number) =>
    setBnsExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const bnsRows = BONUS_STRAF_DATA.filter(r => {
    const matchFilter =
      bnsFilter === 'all' ? true :
      bnsFilter === 'bonus' ? r.bonus > 0 :
      r.straf > 0;
    const q = bnsSearch.toLowerCase();
    const matchSearch = r.supplier.toLowerCase().includes(q) ||
      r.num.includes(q) || r.org.toLowerCase().includes(q) ||
      r.dir.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
  const bnsTotalBonus = bnsRows.reduce((s, r) => s + r.bonus, 0);
  const bnsTotalStraf = bnsRows.reduce((s, r) => s + r.straf, 0);

  // vozvrat state
  const [vozSearch, setVozSearch] = useState('');
  const [vozExpanded, setVozExpanded] = useState<Set<number>>(new Set());
  const [selectedVoz, setSelectedVoz] = useState<VozRowRef | null>(null);
  const toggleVoz = (id: number) =>
    setVozExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const vozRows = VOZVRAT_DATA.filter(r =>
    r.supplier.toLowerCase().includes(vozSearch.toLowerCase()) ||
    r.num.includes(vozSearch) ||
    r.org.toLowerCase().includes(vozSearch.toLowerCase())
  );
  const vozTotalSum = vozRows.reduce((s, r) => s + r.sum, 0);

  const togglePost = (id: string | number) =>
    setPostExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const nextPostNum = String(
    Math.max(0, ...postData.map(r => parseInt(r.num, 10) || 0)) + 1,
  ).padStart(5, '0');

  const handlePostSave = async (row: PostRowRef) => {
    try {
      const saved = await api.createGoodsReceipt({
        legacyId: typeof row.id === 'number' ? row.id : undefined,
        companyId: companyId || undefined,
        date: row.date,
        num: row.num,
        ox: row.ox,
        supplier: row.supplier,
        org: row.org,
        warehouse: row.warehouse,
        wagon: row.wagon,
        dir: row.dir,
        invoice: row.invoice,
        sum: row.sum,
        netto: row.netto,
        type: row.type,
        author: row.author,
        authorId: row.authorId,
        items: (row.items || []).map(it => ({
          productId: it.productId,
          tovar: it.tovar,
          artikul: it.artikul,
          kolFakt: it.kolFakt,
          kolBrak: it.kolBrak,
          upakovka: it.upakovka,
          tsenaPost: it.tsenaPost,
          skid: it.skid,
          tsenaPriv: it.tsenaPriv,
          summa: it.summa,
          ves: it.ves,
        })),
      });
      const full = await api.getGoodsReceipts({ companyId });
      const mapped = full.map(mapApiReceipt);
      setPostData(mapped);
      const created = mapped.find(r => r.id === saved.id);
      if (created) setSelectedPost(created);
    } catch (e) {
      console.error('Failed to save goods receipt', e);
      // Fallback: keep local list so admin ishni yo'qotmasin
      setPostData(prev => [row, ...prev]);
      try {
        localStorage.setItem(POST_RECEIPTS_KEY, JSON.stringify([row, ...postData]));
      } catch { /* ignore */ }
    }
    setShowCreateModal(false);
  };

  const postRows = postData.filter(r => {
    const matchFilter = postFilter === 'all' || r.type === postFilter;
    const matchSearch = r.supplier.toLowerCase().includes(postSearch.toLowerCase()) ||
                        r.num.includes(postSearch) || r.org.toLowerCase().includes(postSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPostSum   = postRows.reduce((s, r) => s + r.sum, 0);
  const totalPostNetto = postRows.reduce((s, r) => s + r.netto, 0);

  /* Date range picker labels from translations */
  const labelStart = `📅 ${(t.supFrom || 'Dan:').replace(/:$/, '')}`;
  const labelEnd   = `📅 ${(t.supTo || 'Gacha:').replace(/:$/, '')}`;

  const handleDateRange = (from: string, to: string) => {
    setDate1(from);
    setDate2(to);
  };

  const navBtnCls = (active: boolean) =>
    `w-full flex items-center gap-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all justify-center min-w-0 overflow-hidden ${
      active
        ? D ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
             : 'bg-indigo-600 text-white shadow-md shadow-indigo-300/30'
        : D ? `${sub} hover:bg-white/5`
             : 'text-gray-500 hover:bg-white hover:text-gray-900'
    }`;

  return (
    /* No overflow-x-hidden on root — it clips absolute-positioned calendar popups.
       Instead each child section uses max-w-full + overflow-x-auto where needed. */
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }} className="space-y-4">

      {/* ── TOP SECTION NAV ── */}
      <div
        style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
        className={`grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-2xl border p-1.5 ${D ? 'border-gray-800 bg-[#111]' : 'border-gray-200 bg-gray-100'}`}
      >
        <button
          onClick={() => setReportTab('schyot')}
          className={navBtnCls(reportTab !== 'postupleniya' && reportTab !== 'vozvrat' && reportTab !== 'bonusstraf')}
        >
          <Package size={13} className="flex-shrink-0" />
          <span className="truncate min-w-0">{t.supTitle2 ?? 'Поставщики'}</span>
        </button>

        <button
          onClick={() => setReportTab('postupleniya')}
          className={navBtnCls(reportTab === 'postupleniya')}
        >
          <Download size={13} className="flex-shrink-0" />
          <span className="truncate min-w-0">{t.supTabPostup}</span>
        </button>

        <button
          onClick={() => setReportTab('vozvrat')}
          className={navBtnCls(reportTab === 'vozvrat')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
          </svg>
          <span className="truncate min-w-0">{t.supTabVozvrat ?? 'Возврат'}</span>
        </button>

        <button
          onClick={() => setReportTab('bonusstraf')}
          className={navBtnCls(reportTab === 'bonusstraf')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <span className="truncate min-w-0">{t.bnsTabLabel ?? 'Бонус/Штраф'}</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════
          POSTUPLENIYA VIEW
      ══════════════════════════════════════════ */}
      {reportTab === 'postupleniya' && (
        <div style={{ width: '100%', maxWidth: '100%' }} className="space-y-4">

          {/* Sub-filter tabs */}
          <div style={{ width: '100%', maxWidth: '100%' }} className="flex flex-col gap-2">

            {/* Row 1: Create button + filter tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20 flex-shrink-0"
              >
                <Plus size={14} className="flex-shrink-0" />
                <span>{t.postCreate ?? t.vozCreateBtn ?? 'Yaratish'}</span>
              </button>

              <div className={`w-px h-6 flex-shrink-0 ${D ? 'bg-gray-700' : 'bg-gray-200'}`} />

              {([
                { id: 'all',     key: 'postAll' },
                { id: 'opt',     key: 'postWholesale' },
                { id: 'chakana', key: 'postRetail' },
                { id: 'ishlab',  key: 'postProd' },
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => setPostFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border flex-shrink-0 ${
                    postFilter === f.id
                      ? D ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-indigo-600 text-white border-indigo-600'
                      : D ? `border-gray-700 ${sub} hover:bg-gray-800` : `border-gray-200 ${sub} hover:bg-gray-50`
                  }`}
                >
                  {t[f.key]}
                </button>
              ))}
            </div>

            {/* Row 2: Search — always full width */}
            <div
              style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${D ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}
            >
              <Search size={13} className={`${sub} flex-shrink-0`} />
              <input
                style={{ minWidth: 0, width: 0 }}
                className="bg-transparent outline-none text-sm flex-1"
                placeholder={t.supSearch}
                value={postSearch}
                onChange={e => setPostSearch(e.target.value)}
              />
              {postSearch && <button onClick={() => setPostSearch('')}><X size={12} className={sub} /></button>}
            </div>
          </div>

          {/* ── DESKTOP TABLE ── */}
          <div className={`hidden md:block rounded-2xl border overflow-hidden ${card}`}>
            <div className={`px-5 py-3.5 border-b ${divider} flex items-center justify-between`}>
              <div>
                <h3 className="font-semibold">{t.supTabPostup}</h3>
                <p className={`text-xs ${sub} mt-0.5`}>{postRows.length} {t.postCount}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => scrollPostTable('left')} className={`flex items-center justify-center w-7 h-7 rounded-lg border ${divider} ${D ? 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><ChevronLeft size={14} /></button>
                <button onClick={() => scrollPostTable('right')} className={`flex items-center justify-center w-7 h-7 rounded-lg border ${divider} ${D ? 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><ChevronRight size={14} /></button>
              </div>
            </div>
            <div className="overflow-x-auto" ref={postTableRef}>
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className={`border-b ${divider} ${D ? 'bg-white/[0.02]' : 'bg-gray-50/70'}`}>
                    {['postDate','postNum','postOx','postSupplier','postOrg','postWarehouse','postWagon','postDir','postInvoice','detAvtor','postSum','postNetto'].map(k => (
                      <th key={k} className={`px-4 py-3 text-left text-xs font-medium ${sub} whitespace-nowrap`}>{t[k]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {postRows.length === 0 && (
                    <tr>
                      <td colSpan={12} className={`px-4 py-14 text-center text-sm ${sub}`}>
                        {t.postListEmpty ?? "Hali kirim qayd etilmagan — «Yaratish» tugmasini bosing"}
                      </td>
                    </tr>
                  )}
                  {postRows.map((r, i) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedPost(r)}
                      className={`${i < postRows.length - 1 ? `border-b ${divider}` : ''} ${D ? 'hover:bg-white/[0.025]' : 'hover:bg-indigo-50/40'} transition-colors cursor-pointer`}
                    >
                      <td className={`px-4 py-3 text-xs tabular-nums whitespace-nowrap ${sub}`}>{formatDisplayDate(r.date)}</td>
                      <td className="px-4 py-3 text-sm font-semibold tabular-nums">{r.num}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex w-5 h-5 rounded items-center justify-center text-[10px] font-bold ${r.ox ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {r.ox ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[140px] truncate">{r.supplier}</td>
                      <td className={`px-4 py-3 text-sm max-w-[120px] truncate ${sub}`}>{r.org}</td>
                      <td className={`px-4 py-3 text-sm whitespace-nowrap ${sub}`}>{r.warehouse}</td>
                      <td className={`px-4 py-3 text-sm text-center ${r.wagon ? '' : sub}`}>{r.wagon || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                          r.dir === 'SOF IN'
                            ? D ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'
                            : D ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-600'
                        }`}>{r.dir}</span>
                      </td>
                      <td className={`px-4 py-3 text-sm tabular-nums ${r.invoice ? '' : sub}`}>{r.invoice || '—'}</td>
                      <td className={`px-4 py-3 text-sm max-w-[120px] truncate ${sub}`}>{r.author || '—'}</td>
                      <td className="px-4 py-3 text-sm font-semibold tabular-nums text-right">
                        {r.sum > 0 ? N(r.sum) : <span className={sub}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold tabular-nums text-right text-emerald-400">
                        {N(r.netto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`border-t-2 ${D ? 'border-gray-700 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                    <td colSpan={10} className="px-4 py-3.5 text-sm font-bold">{t.postTotal} ({postRows.length})</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums text-right">{N(totalPostSum)}</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums text-right text-emerald-400">{N(totalPostNetto)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── MOBILE CARDS ── */}
          <div style={{ width: '100%', maxWidth: '100%' }} className={`md:hidden rounded-2xl border overflow-hidden ${card}`}>
            <div className={`px-4 py-3.5 border-b ${divider}`}>
              <h3 className="font-semibold">{t.supTabPostup}</h3>
              <p className={`text-xs ${sub} mt-0.5`}>{postRows.length} {t.postCount}</p>
            </div>

            {postRows.map((r, i) => (
              <div key={r.id} className={i < postRows.length - 1 ? `border-b ${divider}` : ''}>
                <button
                  onClick={() => setSelectedPost(r)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${D ? 'hover:bg-white/[0.025]' : 'hover:bg-indigo-50/40'}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <span className={`inline-flex w-6 h-6 rounded-lg items-center justify-center text-xs font-bold ${r.ox ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {r.ox ? '✓' : '✗'}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }} className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-bold flex-shrink-0">#{r.num}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                        r.dir === 'SOF IN'
                          ? D ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'
                          : D ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-600'
                      }`}>{r.dir}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{r.supplier}</p>
                    <p className={`text-xs ${sub}`}>{formatDisplayDate(r.date)}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {r.sum > 0 && <p className="text-xs font-semibold tabular-nums">{fmt(r.sum)}</p>}
                    <p className="text-xs font-semibold tabular-nums text-emerald-400">{fmt(r.netto)}</p>
                  </div>
                  <ChevronDown size={14} className={`flex-shrink-0 mt-1 ${sub}`} />
                </button>
              </div>
            ))}

            <div className={`border-t-2 ${D ? 'border-gray-700' : 'border-gray-200'} px-4 py-3.5 ${D ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-xl px-3 py-2.5 border ${card}`}>
                  <p className={`text-[10px] ${sub} mb-0.5`}>{t.postSum}</p>
                  <p className="text-sm font-bold tabular-nums">{N(totalPostSum)}</p>
                </div>
                <div className={`rounded-xl px-3 py-2.5 border ${card}`}>
                  <p className={`text-[10px] ${sub} mb-0.5`}>{t.postNetto}</p>
                  <p className="text-sm font-bold tabular-nums text-emerald-400">{N(totalPostNetto)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          VOZVRAT VIEW
      ══════════════════════════════════════════ */}
      {reportTab === 'vozvrat' && (
        <div style={{ width: '100%', maxWidth: '100%' }} className="space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold">{t.vozTitle ?? 'Возврат товаров поставщику'}</h2>
              <p className={`text-sm ${sub} mt-0.5`}>{vozRows.length} {t.vozCount}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20`}>
                <Plus size={14} className="flex-shrink-0" /> <span>{t.vozCreateBtn ?? 'Yaratish'}</span>
              </button>
              <button className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                <Download size={14} /> {t.vozExport ?? 'Экспорт'}
              </button>
            </div>
          </div>

          {/* Search */}
          <div
            style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${D ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}
          >
            <Search size={13} className={`${sub} flex-shrink-0`} />
            <input
              style={{ minWidth: 0, width: 0 }}
              className="bg-transparent outline-none text-sm flex-1"
              placeholder={t.vozSearch ?? 'Поиск...'}
              value={vozSearch}
              onChange={e => setVozSearch(e.target.value)}
            />
            {vozSearch && <button onClick={() => setVozSearch('')}><X size={12} className={sub} /></button>}
          </div>

          {/* ── DESKTOP TABLE ── */}
          <div className={`hidden md:block rounded-2xl border overflow-hidden ${card}`}>
            <div className={`flex justify-end gap-1 px-3 py-2 border-b ${divider}`}>
              <button onClick={() => scrollVozTable('left')} className={`flex items-center justify-center w-7 h-7 rounded-lg border ${divider} ${D ? 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><ChevronLeft size={14} /></button>
              <button onClick={() => scrollVozTable('right')} className={`flex items-center justify-center w-7 h-7 rounded-lg border ${divider} ${D ? 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><ChevronRight size={14} /></button>
            </div>
            <div className="overflow-x-auto" ref={vozTableRef}>
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className={`border-b ${divider} ${D ? 'bg-white/[0.02]' : 'bg-gray-50/70'}`}>
                    {[
                      { k: 'vozDateSend',   def: 'Дата отгрузки' },
                      { k: 'vozDateAccept', def: 'Дата принятия' },
                      { k: 'vozNum',        def: 'Номер' },
                      { k: 'postSupplier',  def: 'Поставщик' },
                      { k: 'postOrg',       def: 'Организация' },
                      { k: 'postWarehouse', def: 'Склад' },
                      { k: 'vozNote',       def: 'Примечание' },
                      { k: 'vozDir',        def: 'Направление' },
                      { k: 'vozSum',        def: 'Сумма' },
                    ].map(col => (
                      <th key={col.k} className={`px-4 py-3 text-left text-xs font-medium ${sub} whitespace-nowrap`}>
                        {t[col.k] ?? col.def}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vozRows.map((r, i) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedVoz(r)}
                      className={`${i < vozRows.length - 1 ? `border-b ${divider}` : ''} ${D ? 'hover:bg-white/[0.025]' : 'hover:bg-rose-50/30'} transition-colors cursor-pointer`}
                    >
                      <td className={`px-4 py-2.5 text-xs tabular-nums whitespace-nowrap ${sub}`}>{formatDisplayDate(r.dateSend)}</td>
                      <td className={`px-4 py-2.5 text-xs tabular-nums whitespace-nowrap ${sub}`}>{formatDisplayDate(r.dateAccept)}</td>
                      <td className="px-4 py-2.5 font-semibold tabular-nums text-sm">{r.num}</td>
                      <td className="px-4 py-2.5 max-w-[140px] truncate">{r.supplier}</td>
                      <td className={`px-4 py-2.5 max-w-[130px] truncate ${sub}`}>{r.org || '—'}</td>
                      <td className={`px-4 py-2.5 whitespace-nowrap ${r.warehouse ? '' : sub}`}>{r.warehouse || '—'}</td>
                      <td className={`px-4 py-2.5 ${sub}`}>{r.note || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                          r.dir === 'SOF IN'
                            ? D ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'
                            : D ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-600'
                        }`}>{r.dir}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                        {r.sum > 0
                          ? <span className="text-rose-400">{N(r.sum)}</span>
                          : <span className={sub}>—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`border-t-2 ${D ? 'border-gray-700 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                    <td colSpan={8} className="px-4 py-3.5 text-sm font-bold">
                      {t.vozTotal ?? 'Итого'} ({vozRows.length})
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums text-right text-rose-400">
                      {vozTotalSum > 0 ? N(vozTotalSum) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── MOBILE CARDS ── */}
          <div style={{ width: '100%', maxWidth: '100%' }} className={`md:hidden rounded-2xl border overflow-hidden ${card}`}>
            <div className={`px-4 py-3.5 border-b ${divider} flex items-center justify-between`}>
              <div>
                <h3 className="font-semibold">{t.vozTitle ?? 'Возврат'}</h3>
                <p className={`text-xs ${sub} mt-0.5`}>{vozRows.length} {t.vozCount}</p>
              </div>
              {vozTotalSum > 0 && (
                <div className="text-right">
                  <p className={`text-[9px] uppercase tracking-wide ${sub}`}>{t.vozTotal}</p>
                  <p className="text-sm font-bold tabular-nums text-rose-400">{N(vozTotalSum)}</p>
                </div>
              )}
            </div>

            {vozRows.map((r, i) => {
              return (
                <div key={r.id} className={i < vozRows.length - 1 ? `border-b ${divider}` : ''}>
                  <button
                    onClick={() => setSelectedVoz(r)}
                    className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${D ? 'hover:bg-white/[0.025]' : 'hover:bg-rose-50/30'}`}
                  >
                    {/* Number badge */}
                    <span className={`flex-shrink-0 min-w-[28px] h-7 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5 ${D ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-500'}`}>
                      {r.num}
                    </span>

                    {/* Main info */}
                    <div style={{ minWidth: 0 }} className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${
                          r.dir === 'SOF IN'
                            ? D ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'
                            : D ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-600'
                        }`}>{r.dir}</span>
                        {r.warehouse && (
                          <span className={`text-[10px] ${sub} truncate`}>{r.warehouse}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold truncate">{r.supplier}</p>
                      <p className={`text-xs ${sub} mt-0.5 tabular-nums`}>{r.dateSend}</p>
                    </div>

                    {/* Sum + chevron */}
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <div className="text-right">
                        {r.sum > 0
                          ? <p className="text-sm font-bold tabular-nums text-rose-400">{fmt(r.sum)}</p>
                          : <p className={`text-sm ${sub}`}>—</p>
                        }
                      </div>
                      <ChevronDown size={13} className={`${sub} -rotate-90`} />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SUPPLIER BALANCE VIEW (schyot/partiya/guruh)
      ═════════════════════════════════════════ */}
      {reportTab !== 'postupleniya' && reportTab !== 'vozvrat' && reportTab !== 'bonusstraf' && (
        <>
          {/* ── HEADER ── */}
          <div style={{ width: '100%', maxWidth: '100%' }} className="flex items-center justify-between flex-wrap gap-3">
            <div style={{ minWidth: 0 }} className="flex-1">
              <h2 className="text-xl font-bold">{t.supTitle}</h2>
              <p className={`text-sm ${sub} mt-0.5`}>
                {t.supSubtitle} — {fmtDate(date1)} – {fmtDate(date2)}
              </p>
            </div>
            <button className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium flex-shrink-0 ${D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
              <Download size={14} />
              {t.exportBtn}
            </button>
          </div>

          {/* ── REPORT TYPE TABS ── */}
          <div style={{ width: '100%', maxWidth: '100%' }} className="flex items-center gap-2 flex-wrap">
            {(['schyot', 'partiya', 'guruh'] as const).map((id, i) => (
              <button
                key={id}
                onClick={() => setReportTab(id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0 ${
                  reportTab === id
                    ? D ? 'bg-white text-black' : 'bg-gray-900 text-white'
                    : `${sub} ${D ? 'hover:bg-gray-800 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900'}`
                }`}
              >
                {t[REPORT_TAB_KEYS[i]]}
              </button>
            ))}
          </div>

          {/* ── FILTER ROW ── */}
          <div
            style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
            className={`rounded-2xl border ${card} p-3`}
          >
            {/* flex-col: always stacked rows */}
            <div style={{ width: '100%', maxWidth: '100%' }} className="flex flex-col gap-2">

              {/* Row 1: Currency + USDT + Date pickers (desktop inline, mobile hidden) */}
              <div className="flex items-center gap-2 flex-wrap">

                {/* Currency select */}
                <div ref={currencyRef} className="relative flex-shrink-0">
                  <button
                    onClick={() => setCurrencyOpen(v => !v)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 transition-colors ${
                      D
                        ? `border-gray-700 bg-[#1a1a1a] hover:border-gray-600 ${currencyOpen ? 'border-indigo-500' : ''}`
                        : `border-gray-200 bg-white hover:border-gray-300 ${currencyOpen ? 'border-indigo-400' : ''}`
                    }`}
                  >
                    <span className={`text-sm font-bold ${D ? 'text-white' : 'text-gray-900'}`}>{currency}</span>
                    <ChevronDown size={13} className={`${sub} transition-transform duration-200 ${currencyOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {currencyOpen && (
                    <div
                      className="absolute z-50 top-full mt-1.5 left-0 rounded-xl shadow-xl border overflow-hidden"
                      style={{ minWidth: 90, background: D ? '#1c1c1e' : '#fff', borderColor: D ? '#333' : '#e5e7eb' }}
                    >
                      {['UZS', 'USDT'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => selectCurrency(opt)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors ${
                            currency === opt
                              ? D ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
                              : D ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          {opt}
                          {currency === opt && <span className={`w-1.5 h-1.5 rounded-full ${D ? 'bg-indigo-400' : 'bg-indigo-500'}`} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* USDT rate input */}
                {currency === 'USDT' && (
                  <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 flex-shrink-0 ${D ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}>
                    <span className={`text-xs font-medium ${sub} whitespace-nowrap`}>1$ =</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={usdtRate}
                      onChange={e => setUsdtRate(e.target.value)}
                      className={`bg-transparent outline-none text-sm font-semibold tabular-nums ${D ? 'text-white' : 'text-gray-900'}`}
                      style={{ width: 88 }}
                      placeholder={exchangeRates ? formatRateInput(exchangeRates.cbu.rate) : '12200.00'}
                    />
                    <span className={`text-xs ${sub}`}>UZS</span>
                  </div>
                )}

                {/* Bank rates strip */}
                {currency === 'USDT' && (
                  <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                    {ratesLoading && !exchangeRates ? (
                      <span className={`text-[11px] ${sub}`}>{t.supRateLoading}</span>
                    ) : exchangeRates && (
                      <>
                        {([
                          { key: 'cbu', label: t.supRateCbu, buy: exchangeRates.cbu.rate, sell: exchangeRates.cbu.rate, official: true },
                          { key: 'hamkor', label: t.supRateHamkor, ...exchangeRates.banks.hamkorbank },
                          { key: 'ipoteka', label: t.supRateIpoteka, ...exchangeRates.banks.ipoteka },
                          { key: 'agro', label: t.supRateAgro, ...exchangeRates.banks.agrobank },
                        ] as const).map(bank => (
                          <div
                            key={bank.key}
                            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] flex-shrink-0 ${
                              D ? 'border-gray-700/80 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'
                            }`}
                            title={'official' in bank && bank.official
                              ? `${bank.label}: ${fmtRate(bank.sell)}`
                              : `${bank.label} — ${t.supRateBuy}: ${fmtRate(bank.buy)}, ${t.supRateSell}: ${fmtRate(bank.sell)}`}
                          >
                            <span className={`font-semibold whitespace-nowrap ${D ? 'text-gray-300' : 'text-gray-600'}`}>{bank.label}</span>
                            {'official' in bank && bank.official ? (
                              <span className={`font-bold tabular-nums ${D ? 'text-indigo-300' : 'text-indigo-600'}`}>{fmtRate(bank.sell)}</span>
                            ) : (
                              <>
                                <span className={`tabular-nums ${D ? 'text-emerald-400' : 'text-emerald-600'}`}>{fmtRate(bank.buy)}</span>
                                <span className={sub}>/</span>
                                <span className={`tabular-nums ${D ? 'text-rose-400' : 'text-rose-500'}`}>{fmtRate(bank.sell)}</span>
                              </>
                            )}
                          </div>
                        ))}
                        <span
                          className={`text-[10px] tabular-nums whitespace-nowrap flex-shrink-0 ${sub}`}
                          title={`${t.supRateAsOf}: ${exchangeRates.cbu.date}, ${exchangeRates.fetchedAt.time}`}
                        >
                          {t.supRateAsOf}: {exchangeRates.cbu.date}, {exchangeRates.fetchedAt?.time ?? ''}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Date range picker — single calendar */}
                <DateRangePickerCalendar
                  start={date1}
                  end={date2}
                  onChange={handleDateRange}
                  labelFrom={labelStart}
                  labelTo={labelEnd}
                  D={D}
                  sub={sub}
                  markedDates={MARKED}
                  t={t}
                />
              </div>

              {/* Row 2: Search — always full width */}
              <div
                style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${D ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}
              >
                <Search size={13} className={`${sub} flex-shrink-0`} />
                <input
                  style={{ minWidth: 0, width: 0 }}
                  className="bg-transparent outline-none text-sm flex-1"
                  placeholder={t.supSearch}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && <button onClick={() => setSearch('')}><X size={12} className={sub} /></button>}
              </div>
            </div>
          </div>

          {/* ── DESKTOP TABLE ── */}
          <div className={`hidden md:block rounded-2xl border overflow-hidden ${card}`}>
            <div className={`px-5 py-4 border-b ${divider} flex items-center justify-between`}>
              <div>
                <h3 className="font-semibold">{t.supListTitle}</h3>
                <p className={`text-xs ${sub} mt-0.5`}>{rows.length} {t.supCountSuffix}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => scrollSupTable('left')} className={`flex items-center justify-center w-7 h-7 rounded-lg border ${divider} ${D ? 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><ChevronLeft size={14} /></button>
                <button onClick={() => scrollSupTable('right')} className={`flex items-center justify-center w-7 h-7 rounded-lg border ${divider} ${D ? 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><ChevronRight size={14} /></button>
              </div>
            </div>
            <div className="overflow-x-auto" ref={supTableRef}>
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${divider}`}>
                    <th className={`px-5 py-3 text-left text-xs font-medium ${sub} w-8`}>№</th>
                    <th className={`px-5 py-3 text-left text-xs font-medium ${sub}`}>{t.supColName}</th>
                    <th className={`px-5 py-3 text-center text-xs font-medium ${sub}`} colSpan={2}>{t.supOpenBal}</th>
                    <th className={`px-5 py-3 text-center text-xs font-medium ${sub}`} colSpan={2}>{t.supTurnover}</th>
                    <th className={`px-5 py-3 text-center text-xs font-medium ${sub}`} colSpan={2}>{t.supCloseBal}</th>
                  </tr>
                  <tr className={`border-b ${divider} ${D ? 'bg-white/[0.02]' : 'bg-gray-50/70'}`}>
                    <th className="px-5 py-2.5" /><th className="px-5 py-2.5" />
                    <th className={`px-5 py-2.5 text-right text-xs font-medium ${sub}`}>{t.supDebet}</th>
                    <th className={`px-5 py-2.5 text-right text-xs font-medium ${sub}`}>{t.supKredit}</th>
                    <th className={`px-5 py-2.5 text-right text-xs font-medium ${sub}`}>{t.supDebet}</th>
                    <th className={`px-5 py-2.5 text-right text-xs font-medium ${sub}`}>{t.supKredit}</th>
                    <th className={`px-5 py-2.5 text-right text-xs font-medium ${sub}`}>{t.supDebet}</th>
                    <th className={`px-5 py-2.5 text-right text-xs font-medium ${sub}`}>{t.supKredit}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r.id}
                      onClick={() => setAktSup(r)}
                      className={`${i < rows.length - 1 ? `border-b ${divider}` : ''} ${D ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50'} transition-colors cursor-pointer`}
                    >
                      <td className={`px-5 py-3.5 text-sm ${sub}`}>{r.id}</td>
                      <td className="px-5 py-3.5 text-sm font-medium">{r.name}</td>
                      <td className="px-5 py-3.5 text-sm text-right tabular-nums">
                        {r.d_open > 0 ? <span className="font-semibold text-indigo-400">{N(r.d_open)}</span> : <span className={sub}>—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right tabular-nums">
                        {r.c_open > 0 ? <span className="font-semibold text-rose-400">{N(r.c_open)}</span> : <span className={sub}>—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right tabular-nums font-medium">
                        {r.debit > 0 ? N(r.debit) : <span className={sub}>—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right tabular-nums font-medium">
                        {r.credit > 0 ? N(r.credit) : <span className={sub}>—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right tabular-nums">
                        {r.d_close > 0 ? <span className="font-semibold text-emerald-400">{N(r.d_close)}</span> : <span className={sub}>—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right tabular-nums">
                        {r.c_close > 0 ? <span className="font-semibold text-rose-400">{N(r.c_close)}</span> : <span className={sub}></span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`border-t-2 ${D ? 'border-gray-700 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                    <td colSpan={2} className="px-5 py-3.5 text-sm font-bold">{t.supTotal} ({rows.length})</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-right tabular-nums text-indigo-400">{N(tot('d_open'))}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-right tabular-nums text-rose-400">{N(tot('c_open'))}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-right tabular-nums">{N(totalDebit)}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-right tabular-nums">{N(totalCredit)}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-right tabular-nums text-emerald-400">{N(totalDClose)}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-right tabular-nums text-rose-400">{N(totalCClose)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── MOBILE CARDS ── */}
          <div style={{ width: '100%', maxWidth: '100%' }} className={`md:hidden rounded-2xl border overflow-hidden ${card}`}>
            <div className={`px-4 py-4 border-b ${divider}`}>
              <h3 className="font-semibold">{t.supListTitle}</h3>
              <p className={`text-xs ${sub} mt-0.5`}>{rows.length} {t.supCountSuffix}</p>
            </div>

            {rows.map((r, i) => {
              const isExp = expanded.has(r.id);
              return (
                <div key={r.id} className={i < rows.length - 1 ? `border-b ${divider}` : ''}>
                  <button
                    onClick={() => toggle(r.id)}
                    className={`w-full flex items-center gap-2 px-4 py-3.5 text-left transition-colors ${D ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50'}`}
                  >
                    <span className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-bold ${D ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                      {r.id}
                    </span>
                    <span style={{ minWidth: 0 }} className="flex-1 text-sm font-medium leading-tight truncate">{r.name}</span>
                    <div className="flex-shrink-0 text-right">
                      {r.d_close > 0 && <p className="text-xs font-semibold text-emerald-400">{fmt(r.d_close)}</p>}
                      {r.c_close > 0 && <p className="text-xs font-semibold text-rose-400">-{fmt(r.c_close)}</p>}
                      {r.d_close === 0 && r.c_close === 0 && <p className={`text-xs ${sub}`}>{t.supNoBalance}</p>}
                    </div>
                    {isExp
                      ? <ChevronUp size={15} className={`flex-shrink-0 ${sub}`} />
                      : <ChevronDown size={15} className={`flex-shrink-0 ${sub}`} />}
                  </button>

                  {isExp && (
                    <div className={`px-4 pb-4 space-y-3 border-t ${divider} pt-3 ${D ? 'bg-white/[0.015]' : 'bg-gray-50/60'}`}>
                      {[
                        { label: t.supOpenBal,  d: r.d_open,  c: r.c_open,  dc: 'text-indigo-400',  cc: 'text-rose-400' },
                        { label: t.supTurnover, d: r.debit,   c: r.credit,  dc: text,               cc: text },
                        { label: t.supCloseBal, d: r.d_close, c: r.c_close, dc: 'text-emerald-400', cc: 'text-rose-400' },
                      ].map(g => (
                        <div key={g.label}>
                          <p className={`text-[11px] font-medium ${sub} mb-1.5`}>{g.label}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className={`rounded-xl px-3 py-2.5 border ${card}`}>
                              <p className={`text-[10px] ${sub} mb-0.5`}>{t.supDebet}</p>
                              <p className={`text-sm font-semibold tabular-nums ${g.d > 0 ? g.dc : sub}`}>{g.d > 0 ? N(g.d) : '—'}</p>
                            </div>
                            <div className={`rounded-xl px-3 py-2.5 border ${card}`}>
                              <p className={`text-[10px] ${sub} mb-0.5`}>{t.supKredit}</p>
                              <p className={`text-sm font-semibold tabular-nums ${g.c > 0 ? g.cc : sub}`}>{g.c > 0 ? N(g.c) : '—'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Mobile total */}
            <div className={`border-t-2 ${D ? 'border-gray-700' : 'border-gray-200'} px-4 py-4 ${D ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
              <p className="text-sm font-bold mb-3">{t.supTotal} — {rows.length}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: t.supDebetTurn,   val: N(totalDebit),  cls: '' },
                  { label: t.supKreditTurn,  val: N(totalCredit), cls: '' },
                  { label: t.supCloseDebet,  val: N(totalDClose), cls: 'text-emerald-400' },
                  { label: t.supCloseKredit, val: N(totalCClose), cls: 'text-rose-400' },
                ].map((s, i) => (
                  <div key={i} className={`rounded-xl px-3 py-2.5 border ${card}`}>
                    <p className={`text-[10px] ${sub} mb-0.5`}>{s.label}</p>
                    <p className={`text-sm font-bold tabular-nums ${s.cls || text}`}>{s.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          BONUS VA SHTRAF VIEW
      ══════════════════════════════════════════ */}
      {reportTab === 'bonusstraf' && (
        <div style={{ width: '100%', maxWidth: '100%' }} className="space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold">{t.bnsTitle ?? 'Бонусы и штрафы'}</h2>
              <p className={`text-sm ${sub} mt-0.5`}>{bnsRows.length} {t.bnsCount ?? 'документов'}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowBnsCreate(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
              >
                <Plus size={14} className="flex-shrink-0" /> <span>{t.bnsCreate ?? 'Yaratish'}</span>
              </button>
              <button className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                <Download size={14} /> {t.bnsExport ?? 'Экспорт'}
              </button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: t.bnsTotalBonus ?? 'Итого бонус', val: bnsTotalBonus, cls: 'text-emerald-400', iconCls: 'text-emerald-400', Icon: TrendingUp   },
              { label: t.bnsTotalStraf ?? 'Итого штраф', val: bnsTotalStraf, cls: 'text-rose-400',    iconCls: 'text-rose-400',    Icon: TrendingDown },
              { label: t.bnsTotal ?? 'Итого', val: bnsTotalBonus - bnsTotalStraf, cls: bnsTotalBonus - bnsTotalStraf >= 0 ? 'text-indigo-400' : 'text-rose-400', iconCls: bnsTotalBonus - bnsTotalStraf >= 0 ? 'text-indigo-400' : 'text-rose-400', Icon: Scale },
            ].map((k, i) => (
              <div key={i} className={`rounded-2xl border px-4 py-3.5 ${card}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <k.Icon size={13} className={k.iconCls} />
                  <p className={`text-[11px] font-medium ${sub} leading-tight`}>{k.label}</p>
                </div>
                <p className={`text-sm font-bold tabular-nums ${k.cls}`}>
                  {k.val !== 0 ? N(Math.abs(k.val)) : '—'}
                </p>
              </div>
            ))}
          </div>

          {/* Filter + Search */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {([
                { id: 'all',   key: 'bnsAllFilter'   },
                { id: 'bonus', key: 'bnsBonusFilter'  },
                { id: 'straf', key: 'bnsStrafFilter'  },
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => setBnsFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border flex-shrink-0 ${
                    bnsFilter === f.id
                      ? D ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-indigo-600 text-white border-indigo-600'
                      : D ? `border-gray-700 ${sub} hover:bg-gray-800` : `border-gray-200 ${sub} hover:bg-gray-50`
                  }`}
                >
                  {t[f.key] ?? f.id}
                </button>
              ))}
            </div>

            <div
              style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${D ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}
            >
              <Search size={13} className={`${sub} flex-shrink-0`} />
              <input
                style={{ minWidth: 0, width: 0 }}
                className="bg-transparent outline-none text-sm flex-1"
                placeholder={t.bnsSearch ?? 'Поиск...'}
                value={bnsSearch}
                onChange={e => setBnsSearch(e.target.value)}
              />
              {bnsSearch && <button onClick={() => setBnsSearch('')}><X size={12} className={sub} /></button>}
            </div>
          </div>

          {/* ── DESKTOP TABLE ── */}
          <div className={`hidden md:block rounded-2xl border overflow-hidden ${card}`}>
            {/* scroll nav buttons */}
            <div className={`flex justify-end gap-1 px-3 py-2 border-b ${divider}`}>
              <button
                onClick={() => scrollBnsTable('left')}
                className={`flex items-center justify-center w-7 h-7 rounded-lg border ${divider} ${D ? 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => scrollBnsTable('right')}
                className={`flex items-center justify-center w-7 h-7 rounded-lg border ${divider} ${D ? 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="overflow-x-auto" ref={bnsTableRef}>
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className={`border-b ${divider} ${D ? 'bg-white/[0.02]' : 'bg-gray-50/70'}`}>
                    {[
                      { k: 'bnsColDate',       def: 'Дата' },
                      { k: 'bnsColNum',        def: '№' },
                      { k: 'bnsColSupplier',   def: 'Поставщик' },
                      { k: 'bnsColOrg',        def: 'Организация' },
                      { k: 'bnsColBonusType',  def: 'Вид бонус' },
                      { k: 'bnsColBonus',      def: 'Бонус' },
                      { k: 'bnsColStrafType',  def: 'Вид штраф' },
                      { k: 'bnsColStraf',      def: 'Штраф' },
                      { k: 'bnsColDir',        def: 'Направление' },
                      { k: 'bnsColBonusNote',  def: 'Прим. бонус' },
                      { k: 'bnsColStrafNote',  def: 'Прим. штраф' },
                      { k: 'bnsColAuthor',     def: 'Автор' },
                    ].map(col => (
                      <th key={col.k} className={`px-3 py-3 text-left text-xs font-medium ${sub} whitespace-nowrap`}>
                        {t[col.k] ?? col.def}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bnsRows.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`${i < bnsRows.length - 1 ? `border-b ${divider}` : ''} ${D ? 'hover:bg-white/[0.025]' : 'hover:bg-indigo-50/40'} transition-colors`}
                    >
                      <td className={`px-3 py-2.5 text-xs tabular-nums whitespace-nowrap ${sub}`}>{formatDisplayDate(r.date)}</td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums">{r.num}</td>
                      <td className="px-3 py-2.5 max-w-[160px] truncate font-medium">{r.supplier}</td>
                      <td className={`px-3 py-2.5 max-w-[120px] truncate ${sub}`}>{r.org}</td>
                      <td className={`px-3 py-2.5 ${r.bonusType ? '' : sub}`}>{r.bonusType || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                        {r.bonus > 0
                          ? <span className="text-emerald-400">{N(r.bonus)}</span>
                          : <span className={sub}>—</span>
                        }
                      </td>
                      <td className={`px-3 py-2.5 ${r.strafType ? '' : sub}`}>{r.strafType || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                        {r.straf > 0
                          ? <span className="text-rose-400">{N(r.straf)}</span>
                          : <span className={sub}>—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                          r.dir === 'SOF IN'
                            ? D ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'
                            : D ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-600'
                        }`}>{r.dir}</span>
                      </td>
                      <td className={`px-3 py-2.5 text-xs max-w-[140px] truncate ${r.bonusNote ? 'text-emerald-400' : sub}`}>
                        {r.bonusNote || '—'}
                      </td>
                      <td className={`px-3 py-2.5 text-xs max-w-[140px] truncate ${r.strafNote ? 'text-rose-400' : sub}`}>
                        {r.strafNote || '—'}
                      </td>
                      <td className={`px-3 py-2.5 text-xs ${sub}`}>{r.author}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`border-t-2 ${D ? 'border-gray-700 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                    <td colSpan={5} className="px-3 py-3.5 text-sm font-bold">
                      {t.bnsTotal ?? 'Итого'} ({bnsRows.length})
                    </td>
                    <td className="px-3 py-3.5 text-sm font-bold tabular-nums text-right text-emerald-400">
                      {bnsTotalBonus > 0 ? N(bnsTotalBonus) : '—'}
                    </td>
                    <td />
                    <td className="px-3 py-3.5 text-sm font-bold tabular-nums text-right text-rose-400">
                      {bnsTotalStraf > 0 ? N(bnsTotalStraf) : '—'}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── MOBILE CARDS ── */}
          <div style={{ width: '100%', maxWidth: '100%' }} className={`md:hidden rounded-2xl border overflow-hidden ${card}`}>
            <div className={`px-4 py-3.5 border-b ${divider} flex items-center justify-between`}>
              <div>
                <h3 className="font-semibold">{t.bnsTitle ?? 'Бонус/Штраф'}</h3>
                <p className={`text-xs ${sub} mt-0.5`}>{bnsRows.length} {t.bnsCount ?? 'документов'}</p>
              </div>
              <div className="text-right">
                {bnsTotalBonus > 0 && (
                  <p className="text-xs font-bold tabular-nums text-emerald-400">+{N(bnsTotalBonus)}</p>
                )}
                {bnsTotalStraf > 0 && (
                  <p className="text-xs font-bold tabular-nums text-rose-400">−{N(bnsTotalStraf)}</p>
                )}
              </div>
            </div>

            {bnsRows.map((r, i) => {
              const isExp = bnsExpanded.has(r.id);
              return (
                <div key={r.id} className={i < bnsRows.length - 1 ? `border-b ${divider}` : ''}>
                  {/* Collapsed row */}
                  <button
                    onClick={() => toggleBns(r.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${D ? 'hover:bg-white/[0.025]' : 'hover:bg-indigo-50/30'}`}
                  >
                    {/* Number badge */}
                    <span className={`flex-shrink-0 min-w-[28px] h-7 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5 ${D ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                      {r.num}
                    </span>

                    {/* Info */}
                    <div style={{ minWidth: 0 }} className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${
                          r.dir === 'SOF IN'
                            ? D ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'
                            : D ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-600'
                        }`}>{r.dir}</span>
                        {r.bonus > 0 && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${D ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                            +{fmt(r.bonus)}
                          </span>
                        )}
                        {r.straf > 0 && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${D ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                            −{fmt(r.straf)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold truncate">{r.supplier}</p>
                      <p className={`text-xs ${sub} tabular-nums mt-0.5`}>{formatDisplayDate(r.date)}</p>
                    </div>

                    {isExp
                      ? <ChevronUp size={14} className={`flex-shrink-0 mt-1 ${sub}`} />
                      : <ChevronDown size={14} className={`flex-shrink-0 mt-1 ${sub}`} />}
                  </button>

                  {/* Expanded details */}
                  {isExp && (
                    <div className={`px-4 pb-4 pt-3 space-y-3 border-t ${divider} ${D ? 'bg-white/[0.015]' : 'bg-gray-50/60'}`}>
                      {/* Org + Dir */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`rounded-xl px-3 py-2.5 border ${card}`}>
                          <p className={`text-[10px] ${sub} mb-0.5`}>{t.bnsColOrg ?? 'Организация'}</p>
                          <p className="text-xs font-semibold truncate">{r.org}</p>
                        </div>
                        <div className={`rounded-xl px-3 py-2.5 border ${card}`}>
                          <p className={`text-[10px] ${sub} mb-0.5`}>{t.bnsColAuthor ?? 'Автор'}</p>
                          <p className="text-xs font-semibold">{r.author}</p>
                        </div>
                      </div>

                      {/* Bonus block */}
                      <div className={`rounded-xl px-3 py-3 border ${D ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-100 bg-emerald-50/50'}`}>
                        <p className={`text-[10px] font-semibold text-emerald-500 mb-2 uppercase tracking-wide`}>{t.bnsColBonus ?? 'Бонус'}</p>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className={`text-[10px] ${sub}`}>{t.bnsColBonusType ?? 'Вид'}</p>
                            <p className="text-xs font-medium">{r.bonusType || '—'}</p>
                          </div>
                          <p className={`text-sm font-bold tabular-nums ${r.bonus > 0 ? 'text-emerald-400' : sub}`}>
                            {r.bonus > 0 ? N(r.bonus) : '—'}
                          </p>
                        </div>
                        {r.bonusNote && (
                          <p className={`text-xs mt-1.5 text-emerald-400 italic`}>{r.bonusNote}</p>
                        )}
                      </div>

                      {/* Straf block */}
                      <div className={`rounded-xl px-3 py-3 border ${D ? 'border-rose-500/20 bg-rose-500/5' : 'border-rose-100 bg-rose-50/50'}`}>
                        <p className={`text-[10px] font-semibold text-rose-500 mb-2 uppercase tracking-wide`}>{t.bnsColStraf ?? 'Штраф'}</p>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className={`text-[10px] ${sub}`}>{t.bnsColStrafType ?? 'Вид'}</p>
                            <p className="text-xs font-medium">{r.strafType || '—'}</p>
                          </div>
                          <p className={`text-sm font-bold tabular-nums ${r.straf > 0 ? 'text-rose-400' : sub}`}>
                            {r.straf > 0 ? N(r.straf) : '—'}
                          </p>
                        </div>
                        {r.strafNote && (
                          <p className={`text-xs mt-1.5 text-rose-400 italic`}>{r.strafNote}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Mobile footer totals */}
            <div className={`border-t-2 ${D ? 'border-gray-700' : 'border-gray-200'} px-4 py-3.5 ${D ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-xl px-3 py-2.5 border ${card}`}>
                  <p className={`text-[10px] ${sub} mb-0.5`}>{t.bnsTotalBonus ?? 'Итого бонус'}</p>
                  <p className="text-sm font-bold tabular-nums text-emerald-400">
                    {bnsTotalBonus > 0 ? N(bnsTotalBonus) : '—'}
                  </p>
                </div>
                <div className={`rounded-xl px-3 py-2.5 border ${card}`}>
                  <p className={`text-[10px] ${sub} mb-0.5`}>{t.bnsTotalStraf ?? 'Итого штраф'}</p>
                  <p className="text-sm font-bold tabular-nums text-rose-400">
                    {bnsTotalStraf > 0 ? N(bnsTotalStraf) : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <PostupleniyaModal
          D={D}
          t={t}
          suppliers={SUP_DATA.map(s => s.name)}
          nextNum={nextPostNum}
          onSave={handlePostSave}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showBnsCreate && (
        <BonusStrafCreateModal
          D={D}
          t={t}
          onClose={() => setShowBnsCreate(false)}
        />
      )}

      {selectedPost && (() => {
        const idx = postRows.findIndex(r => r.id === selectedPost.id);
        return (
          <PostupleniyaDetailModal
            D={D}
            t={t}
            row={selectedPost}
            onClose={() => setSelectedPost(null)}
            hasPrev={idx > 0}
            hasNext={idx < postRows.length - 1}
            onPrev={() => idx > 0 && setSelectedPost(postRows[idx - 1])}
            onNext={() => idx < postRows.length - 1 && setSelectedPost(postRows[idx + 1])}
          />
        );
      })()}

      {selectedVoz && (
        <VozvratDetailModal
          D={D}
          t={t}
          row={selectedVoz}
          onClose={() => setSelectedVoz(null)}
        />
      )}

      {aktSup && (
        <AktSverkiModal
          sup={aktSup}
          D={D}
          card={card}
          divider={divider}
          sub={sub}
          text={text}
          t={t}
          onClose={() => setAktSup(null)}
        />
      )}
    </div>
  );
}