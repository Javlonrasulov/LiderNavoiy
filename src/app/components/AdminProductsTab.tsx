import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity, Check, ChevronLeft, ChevronRight,
  Edit2, LayoutGrid, List as ListIcon, Package,
  Plus, Search, Tag, Trash2, X, FolderOpen,
  Pencil, ChevronDown, ChevronUp, FolderPlus,
  ImagePlus, Smile, Maximize2, Minimize2,
} from 'lucide-react';
import { type AdminProduct } from '../data/adminProducts';
import { AddProductDrawer, type AddForm } from './AddProductDrawer';
import { brandColor } from '../data/adminData';
import { api } from '../api/client';
import {
  adminToCreatePayload,
  adminToUpdatePayload,
  backendToAdminProduct,
} from '../api/productMapper';
import { compressCategoryImage, compressDataUrlIfNeeded } from '../utils/compressImage';
import { normalizeProductImageForSave } from '../utils/productImageUrl';
import { formatProductSaveError, formatProductSaveReason } from '../utils/productSaveError';

// ── Brand color helpers ────────────────────────────────────────────────────
const BCOLORS: Record<string, string> = {
  SHERIN: '#10b981', TIM: '#f59e0b', SIR: '#3b82f6',
  ANDALUS: '#ef4444', PILLER: '#6366f1', "A'LO TA'M": '#8b5cf6',
};

const CAT_PALETTE = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f59e0b',
  '#10b981','#06b6d4','#3b82f6','#84cc16','#f97316',
  '#64748b','#a16207',
];
const CAT_EMOJIS = ['📦','🧀','🥩','🥛','🧈','🍖','🥓','🌮','🛒','🏪','⭐','🔥'];
const CAT_META_KEY = 'admin_product_categories_meta';

type CategoryMeta = Record<string, { color?: string; emoji?: string; image?: string }>;

function loadCategoryMeta(): CategoryMeta {
  try {
    const raw = localStorage.getItem(CAT_META_KEY);
    return raw ? JSON.parse(raw) as CategoryMeta : {};
  } catch {
    return {};
  }
}

function saveCategoryMeta(categories: Category[]) {
  const meta: CategoryMeta = {};
  for (const cat of categories) {
    meta[cat.name] = { color: cat.color, emoji: cat.emoji, image: cat.image };
  }
  try {
    localStorage.setItem(CAT_META_KEY, JSON.stringify(meta));
  } catch (error) {
    console.error('Category meta local backup failed', error);
    const slim: CategoryMeta = {};
    for (const cat of categories) {
      slim[cat.name] = { color: cat.color, emoji: cat.emoji };
    }
    try {
      localStorage.setItem(CAT_META_KEY, JSON.stringify(slim));
    } catch { /* ignore */ }
  }
}

function removeCategoryFromLocalMeta(name: string) {
  const meta = loadCategoryMeta();
  if (!(name in meta)) return;
  delete meta[name];
  try {
    localStorage.setItem(CAT_META_KEY, JSON.stringify(meta));
  } catch { /* ignore */ }
}

type BackendCategoryMeta = {
  id: string;
  name: string;
  color: string;
  emoji: string;
  imageUrl: string | null;
};

function backendMetaToCategory(
  row: BackendCategoryMeta,
  index: number,
  local?: CategoryMeta[string],
): Category {
  return {
    id: row.name,
    metaId: row.id,
    name: row.name,
    color: row.color || local?.color || CAT_PALETTE[index % CAT_PALETTE.length],
    emoji: row.emoji || local?.emoji || CAT_EMOJIS[index % CAT_EMOJIS.length],
    image: row.imageUrl ?? local?.image,
  };
}

interface Category {
  id: string;
  metaId?: string;
  name: string;
  color: string;
  emoji: string;
  image?: string; // base64 or URL
}

const PAGE_SIZE = 20;

interface Props {
  D: boolean;
  card: string;
  divider: string;
  cardHover: string;
  text: string;
  sub: string;
  input: string;
  t: Record<string, string>;
  viewOrg: string;
  activeIds: string[];
}

// ── Category icon helper: rasm bo'lsa img, aks holda emoji ────────────────
function CatIcon({ cat, size = 'sm' }: { cat: Category; size?: 'xs' | 'sm' | 'md' }) {
  const dim = size === 'xs' ? 'w-4 h-4 text-xs' : size === 'md' ? 'w-8 h-8 text-xl' : 'w-5 h-5 text-sm';
  return (
    <span
      className={`${dim} rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden`}
      style={{ background: cat.color + '33', border: `1.5px solid ${cat.color}` }}
    >
      {cat.image
        ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
        : cat.emoji
      }
    </span>
  );
}

// ── Inline category picker popover ────────────────────────────────────────
function CategoryPicker({
  D, sub, categories, currentCatId, onSelect, onClose, t = {},
}: {
  D: boolean; sub: string;
  categories: Category[];
  currentCatId: string | null;
  onSelect: (catId: string | null) => void;
  onClose: () => void;
  t?: Record<string, string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute z-50 top-full mt-1 right-0 min-w-[180px] rounded-2xl border shadow-2xl overflow-hidden ${
        D ? 'bg-[#1c1c1e] border-gray-700' : 'bg-white border-gray-200'
      }`}
      style={{ boxShadow: D ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)' }}
    >
      <div className={`px-3 py-2 border-b ${D ? 'border-gray-700' : 'border-gray-100'}`}>
        <p className={`text-[11px] font-semibold ${sub} uppercase tracking-wide`}>{t.catPickerTitle ?? 'Kategoriya tanlash'}</p>
      </div>
      <div className="py-1 max-h-52 overflow-y-auto">
        {/* No category option */}
        <button
          onClick={() => { onSelect(null); onClose(); }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
            !currentCatId
              ? D ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
              : D ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-gray-400/20">—</span>
          <span>{t.drawerNoCat ?? 'Kategoriyasiz'}</span>
          {!currentCatId && <Check size={10} className="ml-auto" />}
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => { onSelect(cat.id); onClose(); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
              currentCatId === cat.id
                ? D ? 'bg-white/10' : 'bg-gray-100'
                : D ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
            }`}
          >
            <CatIcon cat={cat} size="sm" />
            <span className={`truncate ${D ? 'text-gray-200' : 'text-gray-700'}`}>{cat.name}</span>
            {currentCatId === cat.id && (
              <Check size={10} className="ml-auto flex-shrink-0" style={{ color: cat.color }} />
            )}
          </button>
        ))}
        {categories.length === 0 && (
          <p className={`px-3 py-3 text-[11px] ${sub} text-center`}>{t.catPickerEmpty ?? "Hali kategoriya yo'q"}</p>
        )}
      </div>
    </div>
  );
}

export function AdminProductsTab({ D, card, divider, cardHover, text, sub, input, t, viewOrg, activeIds }: Props) {
  const [search,          setSearch]          = useState('');
  const [selectedBrends,  setSelectedBrends]  = useState<Set<string>>(new Set());
  const [stockOnly,       setStockOnly]       = useState(false);
  const [products,        setProducts]        = useState<AdminProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [viewMode,        setViewMode]        = useState<'list' | 'card'>(() =>
    typeof window !== 'undefined' ? (window.innerWidth < 768 ? 'card' : 'list') : 'list'
  );
  const [page,      setPage]      = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalKey, setAddModalKey]   = useState(0);
  const [addSaveError, setAddSaveError] = useState<string | null>(null);
  const [addTab, setAddTab] = useState<'asosiy'|'extra'|'balans'>('asosiy');
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [deleteProductConfirm, setDeleteProductConfirm] = useState<AdminProduct | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prodTableRef   = useRef<HTMLDivElement>(null);
  const prodFsTableRef = useRef<HTMLDivElement>(null);

  // ── Category state ──────────────────────────────────────────────────────
  const [categories,       setCategories]       = useState<Category[]>([]);
  const [categoryMetaRows, setCategoryMetaRows] = useState<BackendCategoryMeta[]>([]);
  const [selectedCatId,    setSelectedCatId]    = useState<string | null>(null);
  const [catSectionOpen,   setCatSectionOpen]   = useState(true);
  // create/edit form
  const [showCatForm,      setShowCatForm]      = useState(false);
  const [editCatId,        setEditCatId]        = useState<string | null>(null);
  const [newCatName,       setNewCatName]       = useState('');
  const [newCatColor,      setNewCatColor]      = useState(CAT_PALETTE[0]);
  const [newCatEmoji,      setNewCatEmoji]      = useState(CAT_EMOJIS[0]);
  const [newCatImage,      setNewCatImage]      = useState<string | null>(null);
  const [iconMode,         setIconMode]         = useState<'emoji' | 'image'>('emoji');
  // per-product picker open state
  const [openPickerProdId, setOpenPickerProdId] = useState<string | null>(null);
  // delete confirmation modal
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<Category | null>(null);
  const catNameRef  = useRef<HTMLInputElement>(null);
  const catImgRef   = useRef<HTMLInputElement>(null);

  const scrollProdTable = (dir: 'left' | 'right') => {
    const ref = isFullscreen ? prodFsTableRef : prodTableRef;
    if (ref.current) ref.current.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
  };

  const buildCategoriesFromProducts = (
    items: AdminProduct[],
    metaRows: BackendCategoryMeta[] = [],
  ): Category[] => {
    const local = loadCategoryMeta();
    const metaByName = new Map(metaRows.map(row => [row.name, row]));
    const productNames = Array.from(new Set(items.map(p => p.gruppa).filter(Boolean)));
    const allNames = Array.from(new Set([
      ...productNames,
      ...metaRows.map(row => row.name),
      ...Object.keys(local),
    ]));

    return allNames.map((name, index) => {
      const row = metaByName.get(name);
      if (row) return backendMetaToCategory(row, index, local[name]);
      const saved = local[name];
      return {
        id: name,
        name,
        color: saved?.color ?? CAT_PALETTE[index % CAT_PALETTE.length],
        emoji: saved?.emoji ?? CAT_EMOJIS[index % CAT_EMOJIS.length],
        image: saved?.image,
      };
    });
  };

  const migrateLocalCategories = async (metaRows: BackendCategoryMeta[]) => {
    const local = loadCategoryMeta();
    const existing = new Set(metaRows.map(row => row.name));
    let migrated = false;
    for (const [name, data] of Object.entries(local)) {
      if (existing.has(name)) continue;
      try {
        await api.createProductCategoryMeta({
          name,
          color: data.color,
          emoji: data.emoji,
          imageUrl: data.image ?? null,
        });
        migrated = true;
      } catch (error) {
        console.error('Category migration failed for', name, error);
      }
    }
    if (migrated) {
      try {
        localStorage.removeItem(CAT_META_KEY);
      } catch { /* ignore */ }
    }
    return migrated;
  };

  const loadCategoryMetaRows = async (): Promise<BackendCategoryMeta[]> => {
    try {
      let rows = await api.getProductCategoryMeta();
      const migrated = await migrateLocalCategories(rows);
      if (migrated) rows = await api.getProductCategoryMeta();
      return rows;
    } catch (error) {
      console.error('Failed to load category meta', error);
      return [];
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const [data, metaRows] = await Promise.all([
        api.getProducts(),
        loadCategoryMetaRows(),
      ]);
      const mapped = data.map((item) => backendToAdminProduct(item));
      setProducts(mapped);
      setCategoryMetaRows(metaRows);
      setCategories(buildCategoriesFromProducts(mapped, metaRows));
    } catch (error) {
      console.error('Failed to load products', error);
      setProducts([]);
      const metaRows = await loadCategoryMetaRows();
      setCategoryMetaRows(metaRows);
      setCategories(buildCategoriesFromProducts([], metaRows));
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const onProductsChanged = () => { loadProducts(); };
    window.addEventListener('admin-products-changed', onProductsChanged);
    return () => window.removeEventListener('admin-products-changed', onProductsChanged);
  }, []);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth < 768) setViewMode('card'); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const emptyForm: AddForm = {
    ismi:'', kodShort:'', artikul:'', brend:'', gruppa:'',
    postavshik:'', org: viewOrg === 'all' ? 'boran' : viewOrg,
    tipTo:'Штучн.', shtUpakovka:'1', netto:'0.000', brutto:'0.000',
    srok:'12', rtl:'0', balance:'0', shtrixKod:'', ikpu:'',
    hajmM3:'0.000', format:'', edIzmUpak:'шт', edIzmSht:'шт',
    sotuv:'Штучный (Упаков.)', asosiyEd:'Блок/упак', holat:'Доступ открыт',
    mobil:true, buyurtmaQoldiq:true, markalangan:false,
    buTara:false, tara:'', donaTarada:'0',
    categoryId: '',
    imageUrl: '',
  };
  const [addForm, setAddForm] = useState<AddForm>(emptyForm);

  function setF(k: keyof AddForm, v: string | boolean) {
    setAddSaveError(null);
    setAddForm(prev => ({ ...prev, [k]: v }));
  }

  function patchForm(patch: Partial<AddForm>) {
    setAddSaveError(null);
    setAddForm(prev => ({ ...prev, ...patch }));
  }

  function resolveCategoryFields(form: AddForm) {
    const selected = form.categoryId
      ? categories.find(c => c.id === form.categoryId)
      : null;
    const catName = form.gruppa.trim() || form.brend.trim() || selected?.name || '';
    return {
      gruppa: catName,
      brend: form.brend.trim() || catName,
    };
  }

  function findDuplicateProduct(
    candidate: { ismi: string; kod: string; artikul: string },
    excludeId?: string,
  ): AdminProduct | undefined {
    const normName = candidate.ismi.trim().toLowerCase();
    const normKod = candidate.kod.trim().toLowerCase();
    const normArt = candidate.artikul.trim().toLowerCase();
    return products.find((p) => {
      if (excludeId && p.id === excludeId) return false;
      if (normName && p.ismi.trim().toLowerCase() === normName) return true;
      if (normKod && p.kod.trim().toLowerCase() === normKod) return true;
      if (
        normArt &&
        normArt !== normKod &&
        p.artikul.trim().toLowerCase() === normArt &&
        p.kod.trim().toLowerCase() !== normArt
      ) return true;
      return false;
    });
  }

  async function resolveProductImageForSave(raw: string): Promise<string | null> {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('/uploads/') || trimmed.startsWith('http')) {
      return normalizeProductImageForSave(trimmed);
    }
    let dataUrl = trimmed;
    if (dataUrl.startsWith('data:')) {
      dataUrl = await compressDataUrlIfNeeded(dataUrl);
      try {
        const uploaded = await api.uploadProductImage(dataUrl);
        return uploaded.url;
      } catch {
        return normalizeProductImageForSave(dataUrl);
      }
    }
    return normalizeProductImageForSave(trimmed);
  }

  async function saveNewProduct() {
    setAddSaveError(null);
    try {
      const { gruppa, brend } = resolveCategoryFields(addForm);
      const savedImageUrl = await resolveProductImageForSave(addForm.imageUrl);

      if (editingProduct) {
        const editName = (addForm.ismi || editingProduct.ismi).trim();
        const editArtikul = (addForm.artikul || editingProduct.artikul).trim();
        const duplicate = findDuplicateProduct({
          ismi: editName,
          kod: editingProduct.kod,
          artikul: editArtikul,
        }, editingProduct.id);
        if (duplicate) {
          setAddSaveError(formatProductSaveReason(
            t.prodDuplicate
            ?? `"${duplicate.ismi}" nomli yoki "${duplicate.kod}" kodli mahsulot allaqachon mavjud`,
            t,
          ));
          return;
        }

        const updated: AdminProduct = {
          ...editingProduct,
          ismi: editName || editingProduct.ismi,
          org: addForm.org || editingProduct.org,
          tipTo: (addForm.tipTo as AdminProduct['tipTo']) || editingProduct.tipTo,
          artikul: addForm.artikul || editingProduct.artikul,
          brend,
          gruppa,
          srok: Number(addForm.srok) || editingProduct.srok,
          postavshik: addForm.postavshik || editingProduct.postavshik,
          shtUpakovka: Number(addForm.shtUpakovka) || editingProduct.shtUpakovka,
          netto: Number(addForm.netto) || editingProduct.netto,
          brutto: Number(addForm.brutto) || editingProduct.brutto,
          rtl: Number(addForm.rtl) || editingProduct.rtl,
          shtrixKod: addForm.shtrixKod || editingProduct.shtrixKod,
          ikpu: addForm.ikpu || editingProduct.ikpu,
          balance: Number(addForm.balance) || editingProduct.balance,
          imageUrl: savedImageUrl,
        };
        const saved = await api.updateProduct(editingProduct.id, adminToUpdatePayload(updated));
        const mapped = backendToAdminProduct(saved, updated.org);
        setProducts(prev => prev.map(p => (p.id === editingProduct.id ? mapped : p)));
        setCategories(buildCategoriesFromProducts(
          products.map(p => (p.id === editingProduct.id ? mapped : p)),
          categoryMetaRows,
        ));
        setEditingProduct(null);
      } else {
        const suffix = String(Date.now()).slice(-5);
        const newKod = addForm.kodShort?.trim() || addForm.artikul?.trim() || `10${suffix}`;
        const productName = addForm.ismi.trim() || 'Yangi mahsulot';
        const artikul = addForm.artikul.trim() || newKod;

        const duplicate = findDuplicateProduct({
          ismi: productName,
          kod: newKod,
          artikul,
        });
        if (duplicate) {
          setAddSaveError(formatProductSaveReason(
            t.prodDuplicate
            ?? `"${duplicate.ismi}" nomli yoki "${duplicate.kod}" kodli mahsulot allaqachon mavjud`,
            t,
          ));
          return;
        }

        const np: AdminProduct = {
          id: `temp-${suffix}`,
          kod: newKod,
          org: addForm.org || (viewOrg === 'all' ? 'boran' : viewOrg),
          ismi: productName,
          p1: 9,
          tipTo: (addForm.tipTo as AdminProduct['tipTo']) || 'Штучн.',
          artikul,
          brend,
          gruppa,
          srok: Number(addForm.srok) || 12,
          postavshik: addForm.postavshik,
          shtUpakovka: Number(addForm.shtUpakovka) || 1,
          netto: Number(addForm.netto) || 0,
          brutto: Number(addForm.brutto) || 0,
          exId: Number(suffix) || 0,
          rtl: Number(addForm.rtl) || 0,
          shtrixKod: addForm.shtrixKod || `46001${suffix.padStart(11, '0')}`,
          ikpu: addForm.ikpu || `102${suffix.padStart(5, '0')}`,
          balance: Number(addForm.balance) || 0,
          imageUrl: savedImageUrl,
        };
        const saved = await api.createProduct(adminToCreatePayload(np));
        const mapped = backendToAdminProduct(saved, np.org);
        const nextProducts = [mapped, ...products];
        setProducts(nextProducts);
        setCategories(buildCategoriesFromProducts(nextProducts, categoryMetaRows));
      }
      setShowAddModal(false);
      setAddForm(emptyForm);
      setAddSaveError(null);
    } catch (error) {
      console.error('Failed to save product', error);
      setAddSaveError(formatProductSaveError(error, t));
    }
  }

  function openEditProduct(p: AdminProduct) {
    setAddSaveError(null);
    setEditingProduct(p);
    const cat = categories.find(c => c.name === p.gruppa);
    setAddForm({
      ismi: p.ismi, kodShort: p.kod, artikul: p.artikul, brend: p.brend,
      gruppa: p.gruppa, postavshik: p.postavshik, org: p.org,
      tipTo: p.tipTo, shtUpakovka: String(p.shtUpakovka),
      netto: String(p.netto), brutto: String(p.brutto),
      srok: String(p.srok), rtl: String(p.rtl), balance: String(p.balance),
      shtrixKod: p.shtrixKod, ikpu: p.ikpu,
      hajmM3: '0.000', format: '', edIzmUpak: 'шт', edIzmSht: 'шт',
      sotuv: 'Штучный (Упаков.)', asosiyEd: 'Блок/упак', holat: 'Доступ открыт',
      mobil: true, buyurtmaQoldiq: true, markalangan: false,
      buTara: false, tara: '', donaTarada: '0',
      categoryId: cat?.id ?? (p.gruppa || ''),
      imageUrl: p.imageUrl ?? '',
    });
    setAddTab('asosiy');
    setAddModalKey(k => k + 1);
    setShowAddModal(true);
  }

  const orgFilteredProducts = useMemo(() => {
    if (viewOrg === 'all') return products.filter(p => activeIds.includes(p.org));
    return products.filter(p => p.org === viewOrg);
  }, [products, viewOrg, activeIds]);

  const brends = useMemo(() =>
    Array.from(new Set(
      orgFilteredProducts
        .map(p => p.brend?.trim())
        .filter((b): b is string => !!b),
    )), [orgFilteredProducts]);

  const prevViewOrg = useRef(viewOrg);
  useEffect(() => {
    if (prevViewOrg.current !== viewOrg) {
      setSelectedBrends(new Set());
      setSelectedCatId(null);
      prevViewOrg.current = viewOrg;
    }
    setPage(1);
  }, [viewOrg]);

  useEffect(() => {
    setSelectedBrends(prev => {
      const next = new Set([...prev].filter(b => brends.includes(b)));
      return next.size === prev.size ? prev : next;
    });
  }, [brends]);

  useEffect(() => { setPage(1); }, [search, stockOnly, selectedBrends, selectedCatId]);

  function toggleBrend(b: string) {
    setSelectedBrends(prev => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b); else next.add(b);
      return next;
    });
  }

  // ── Get category for a product (direct assignment) ────────────────────
  function getProductCat(productId: string): Category | null {
    const product = products.find(p => p.id === productId);
    if (!product?.gruppa) return null;
    return categories.find(c => c.name === product.gruppa) ?? null;
  }

  // ── Category product counts ───────────────────────────────────────────
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of orgFilteredProducts) {
      if (p.gruppa) counts[p.gruppa] = (counts[p.gruppa] ?? 0) + 1;
    }
    return counts;
  }, [orgFilteredProducts]);

  // ── Filter by selected category ───────────────────────────────────────
  const catFilteredProducts = useMemo(() => {
    if (!selectedCatId) return orgFilteredProducts;
    return orgFilteredProducts.filter(p => p.gruppa === selectedCatId);
  }, [orgFilteredProducts, selectedCatId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return catFilteredProducts.filter(p => {
      if (selectedBrends.size > 0 && !selectedBrends.has(p.brend)) return false;
      if (stockOnly && p.balance <= 0) return false;
      if (!q) return true;
      return (
        p.kod.toLowerCase().includes(q)     ||
        p.ismi.toLowerCase().includes(q)    ||
        p.artikul.toLowerCase().includes(q) ||
        p.brend.toLowerCase().includes(q)   ||
        p.gruppa.toLowerCase().includes(q)  ||
        String(p.exId).includes(q)          ||
        p.shtrixKod.includes(q)             ||
        p.ikpu.includes(q)
      );
    });
  }, [catFilteredProducts, search, selectedBrends, stockOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function fmtR(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' mln';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' ming';
    return String(n);
  }

  // ── Category CRUD ─────────────────────────────────────────────────────
  function openCreateCatForm() {
    setEditCatId(null);
    setNewCatName('');
    setNewCatColor(CAT_PALETTE[categories.length % CAT_PALETTE.length]);
    setNewCatEmoji(CAT_EMOJIS[categories.length % CAT_EMOJIS.length]);
    setNewCatImage(null);
    setIconMode('emoji');
    setShowCatForm(true);
    setTimeout(() => catNameRef.current?.focus(), 50);
  }

  function openEditCatForm(cat: Category) {
    setEditCatId(cat.id);
    setNewCatName(cat.name);
    setNewCatColor(cat.color);
    setNewCatEmoji(cat.emoji);
    setNewCatImage(cat.image ?? null);
    setIconMode(cat.image ? 'image' : 'emoji');
    setShowCatForm(true);
    setTimeout(() => catNameRef.current?.focus(), 50);
  }

  async function saveCatForm() {
    if (!newCatName.trim()) return;
    const payload = {
      name: newCatName.trim(),
      color: newCatColor,
      emoji: newCatEmoji,
      imageUrl: iconMode === 'image' ? (newCatImage ?? null) : null,
    };
    try {
      if (editCatId) {
        const oldCat = categories.find(c => c.id === editCatId);
        const saved = oldCat?.metaId
          ? await api.updateProductCategoryMeta(oldCat.metaId, payload)
          : await api.createProductCategoryMeta(payload);
        const mappedCat: Category = {
          id: saved.name,
          metaId: saved.id,
          name: saved.name,
          color: saved.color,
          emoji: saved.emoji,
          image: saved.imageUrl ?? undefined,
        };
        setCategoryMetaRows(prev => (
          oldCat?.metaId
            ? prev.map(r => r.id === oldCat.metaId ? saved : r)
            : [...prev, saved]
        ));
        setCategories(prev => {
          const next = prev.map(c => c.id === editCatId ? mappedCat : c);
          saveCategoryMeta(next);
          return next;
        });
        if (oldCat && oldCat.name !== saved.name) {
          if (selectedCatId === oldCat.id) setSelectedCatId(saved.name);
          const affected = products.filter(p => p.gruppa === oldCat.name);
          Promise.all(
            affected.map(async (product) => {
              const updated = { ...product, gruppa: saved.name };
              const updatedProduct = await api.updateProduct(product.id, adminToUpdatePayload(updated));
              return backendToAdminProduct(updatedProduct, product.org);
            }),
          ).then((mapped) => {
            const byId = new Map(mapped.map(item => [item.id, item]));
            setProducts(prev => prev.map(p => byId.get(p.id) ?? p));
          }).catch(console.error);
        }
      } else {
        const saved = await api.createProductCategoryMeta(payload);
        const mappedCat: Category = {
          id: saved.name,
          metaId: saved.id,
          name: saved.name,
          color: saved.color,
          emoji: saved.emoji,
          image: saved.imageUrl ?? undefined,
        };
        setCategoryMetaRows(prev => [...prev, saved]);
        setCategories(prev => {
          const next = [...prev, mappedCat];
          saveCategoryMeta(next);
          return next;
        });
      }
      setShowCatForm(false);
      setEditCatId(null);
    } catch (error) {
      console.error('Failed to save category', error);
    }
  }

  async function handleCatImage(file: File) {
    if (!file.type.startsWith('image/')) return;
    try {
      const compressed = await compressCategoryImage(file);
      setNewCatImage(compressed);
      setIconMode('image');
    } catch (error) {
      console.error('Failed to process category image', error);
    }
  }

  async function deleteCat(id: string) {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    try {
      const affected = products.filter(
        p => p.gruppa === cat.name || p.brend === cat.name,
      );

      let nextProducts = products;
      if (affected.length > 0) {
        const mapped = await Promise.all(
          affected.map(async (product) => {
            const saved = await api.updateProduct(product.id, {
              category: '',
              brand: '',
            });
            return backendToAdminProduct(saved, product.org);
          }),
        );
        const byId = new Map(mapped.map(item => [item.id, item]));
        nextProducts = products.map(p => byId.get(p.id) ?? p);
        setProducts(nextProducts);
      }

      let nextMetaRows = categoryMetaRows;
      if (cat.metaId) {
        await api.deleteProductCategoryMeta(cat.metaId);
        nextMetaRows = categoryMetaRows.filter(r => r.id !== cat.metaId);
        setCategoryMetaRows(nextMetaRows);
      }

      removeCategoryFromLocalMeta(cat.name);
      const nextCategories = buildCategoriesFromProducts(nextProducts, nextMetaRows);
      setCategories(nextCategories);
      saveCategoryMeta(nextCategories);

      if (selectedCatId === id) setSelectedCatId(null);
    } catch (error) {
      console.error('Failed to delete category', error);
      throw error;
    }
  }

  // ── Assign product to category ─────────────────────────────────────────
  async function assignProductCat(productId: string, catId: string | null) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const categoryName = catId ? categories.find(c => c.id === catId)?.name ?? '' : '';
    const updated: AdminProduct = { ...product, gruppa: categoryName };
    try {
      const saved = await api.updateProduct(productId, adminToUpdatePayload(updated));
      const mapped = backendToAdminProduct(saved, product.org);
      const nextProducts = products.map(p => (p.id === productId ? mapped : p));
      setProducts(nextProducts);
      setCategories(buildCategoriesFromProducts(nextProducts, categoryMetaRows));
    } catch (error) {
      console.error('Failed to assign category', error);
    }
  }

  const thCls = `px-3 py-3 text-left text-[11px] font-semibold ${sub} whitespace-nowrap select-none`;
  const tdCls = `px-3 py-2.5 text-xs whitespace-nowrap`;

  function PaginationBar() {
    if (totalPages <= 1) return null;
    const delta = 2;
    const range: (number | '…')[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) range.push(i);
      else if (range[range.length - 1] !== '…') range.push('…');
    }
    const btnBase = `min-w-[32px] h-8 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center`;
    return (
      <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3">
        <p className={`text-xs ${sub}`}>
          {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
        </p>
        <div className="flex items-center gap-1">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className={`${btnBase} ${page === 1 ? `opacity-30 cursor-not-allowed ${D ? 'bg-gray-800' : 'bg-gray-100'}` : D ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <ChevronLeft size={14} />
          </button>
          {range.map((r, i) =>
            r === '…' ? (
              <span key={`sep-${i}`} className={`${btnBase} ${sub} cursor-default`}>…</span>
            ) : (
              <button key={r} onClick={() => setPage(r as number)}
                className={`${btnBase} ${page === r ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30' : D ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {r}
              </button>
            )
          )}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            className={`${btnBase} ${page === totalPages ? `opacity-30 cursor-not-allowed ${D ? 'bg-gray-800' : 'bg-gray-100'}` : D ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  function FooterStats() {
    return (
      <div className={`flex items-center gap-6 px-4 py-3 border-t ${divider} ${D ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
        <p className={`text-xs ${sub}`}>{t.prodTotal ?? 'Jami'}: <span className={`font-semibold ${text}`}>{filtered.length}</span></p>
        <p className={`text-xs ${sub}`}>{t.prodInStock ?? 'Mavjud'}: <span className="font-semibold text-emerald-400">{filtered.filter(p => p.balance > 0).length}</span></p>
        <p className={`text-xs ${sub}`}>{t.prodOutOfStock ?? 'Tugagan'}: <span className="font-semibold text-rose-400">{filtered.filter(p => p.balance <= 0).length}</span></p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .prod-fs-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; flex-direction: column;
          animation: prodFsIn 0.18s ease;
        }
        @keyframes prodFsIn {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ══ FULLSCREEN OVERLAY ══ */}
      {isFullscreen && viewMode === 'list' && (
        <div className="prod-fs-overlay" style={{ background: D ? '#0d0d0d' : '#f4f5f7' }}>
          {/* top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px', background: D ? '#1c1c1e' : '#ffffff',
            borderBottom: `1px solid ${D ? '#2a2a2e' : '#e5e7eb'}`,
            height: 44, flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, color: D ? '#f2f2f7' : '#111827', fontWeight: 600 }}>
              {t.navProducts ?? 'Mahsulotlar'}&nbsp;
              <span style={{ color: D ? '#6b7280' : '#9ca3af', fontWeight: 400 }}>— {filtered.length}</span>
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['left','right'] as const).map(dir => (
                <button key={dir} onClick={() => scrollProdTable(dir)} style={{
                  display:'flex', alignItems:'center', justifyContent:'center',
                  width:28, height:28, borderRadius:6,
                  border:`1px solid ${D?'#2a2a2e':'#e5e7eb'}`,
                  background: D?'#1c1c1e':'#fff', color: D?'#f2f2f7':'#111827', cursor:'pointer',
                }}>
                  {dir === 'left' ? <ChevronLeft size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
                </button>
              ))}
              <button onClick={() => setIsFullscreen(false)} style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                width:28, height:28, borderRadius:6, marginLeft:4,
                border:`1px solid ${D?'#2a2a2e':'#e5e7eb'}`,
                background: D?'#1c1c1e':'#fff', color: D?'#f2f2f7':'#111827', cursor:'pointer',
              }}>
                <X size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
          {/* table */}
          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', background: D ? '#1c1c1e' : '#ffffff' }}>
            <div className="overflow-x-auto flex-1" ref={prodFsTableRef} style={{ overflow:'auto' }}>
              <table style={{ minWidth: 1220, tableLayout: 'auto', width: '100%' }}>
                <thead>
                  <tr className={`border-b ${divider} ${D ? 'bg-gray-900/60' : 'bg-gray-50'}`}>
                    <th className={thCls} style={{ position:'sticky', left:0, zIndex:2, background: D?'#111827':'#f9fafb', width:32, minWidth:32 }}>#</th>
                    <th className={thCls} style={{ position:'sticky', left:32, zIndex:2, background: D?'#111827':'#f9fafb', minWidth:60 }}>{t.colKod ?? 'Kod'}</th>
                    <th className={thCls} style={{ minWidth:180 }}>{t.colName ?? 'Mahsulot'}</th>
                    <th className={thCls} style={{ minWidth:80 }}>Brend</th>
                    <th className={thCls} style={{ minWidth:120 }}>{t.colCat ?? 'Kategoriya'}</th>
                    <th className={thCls} style={{ minWidth:36 }}>П1</th>
                    <th className={thCls} style={{ minWidth:72 }}>TipTo</th>
                    <th className={thCls} style={{ minWidth:72 }}>Artikul</th>
                    <th className={thCls} style={{ minWidth:100 }}>Gruppa</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:56 }}>шт.упак</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:56 }}>Netto</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:56 }}>Brutto</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:48 }}>{t.colSrok ?? 'Srok'}</th>
                    <th className={thCls} style={{ minWidth:120 }}>{t.colPostavshik ?? 'Postavshik'}</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:52 }}>ExID</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:110 }}>{t.colShtrixKod ?? 'Shtrix kod'}</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:80 }}>IKPU</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:72 }}>RTL</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:64 }}>{t.prodBalanceLabel ?? 'Qoldiq'}</th>
                    <th className={thCls} style={{ minWidth:64 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p, idx) => {
                    const inStock = p.balance > 0;
                    const bc = brandColor(p.brend);
                    const isEditing = editingProduct?.id === p.id;
                    const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
                    const stickyBg = D ? (isEditing ? '#1e1b4b' : '#0d1117') : (isEditing ? '#eef2ff' : '#ffffff');
                    const prodCat = getProductCat(p.id);
                    const isPickerOpen = openPickerProdId === p.id;
                    return (
                      <tr key={p.id}
                        className={`${cardHover} transition-colors ${idx < paginated.length - 1 ? `border-b ${divider}` : ''} ${isEditing ? D ? 'bg-indigo-950/30' : 'bg-indigo-50' : ''}`}>
                        <td className={`${tdCls} ${sub}`} style={{ position:'sticky', left:0, zIndex:1, background: stickyBg }}>{globalIdx}</td>
                        <td className={`${tdCls} font-mono font-semibold ${D ? 'text-indigo-400' : 'text-indigo-600'}`} style={{ position:'sticky', left:32, zIndex:1, background: stickyBg }}>{p.kod}</td>
                        <td className={tdCls}><p className={`${text} text-xs leading-snug`} style={{ maxWidth: 200 }}>{p.ismi}</p></td>
                        <td className={tdCls}>
                          {p.brend?.trim() ? (
                            <span className="px-2 py-0.5 rounded-lg text-white text-[10px] font-bold whitespace-nowrap" style={{ background: bc }}>{p.brend.slice(0, 10)}</span>
                          ) : (
                            <span className={sub}>—</span>
                          )}
                        </td>
                        <td className={tdCls}>
                          <div className="relative">
                            <button onClick={() => setOpenPickerProdId(isPickerOpen ? null : p.id)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-medium border transition-all w-full max-w-[110px] ${prodCat ? 'text-white border-transparent' : D ? `${sub} border-dashed border-gray-600 hover:border-indigo-500 hover:text-indigo-400` : `text-gray-400 border-dashed border-gray-300 hover:border-indigo-400 hover:text-indigo-500`}`}
                              style={prodCat ? { background: prodCat.color } : {}}>
                              {prodCat ? (<>{prodCat.image ? <img src={prodCat.image} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" /> : <span>{prodCat.emoji}</span>}<span className="truncate">{prodCat.name}</span></>) : (<><Plus size={9} /><span>{t.catAssign ?? 'Belgilash'}</span></>)}
                            </button>
                            {isPickerOpen && (<CategoryPicker D={D} sub={sub} categories={categories} currentCatId={prodCat?.id ?? null} onSelect={catId => assignProductCat(p.id, catId)} onClose={() => setOpenPickerProdId(null)} t={t} />)}
                          </div>
                        </td>
                        <td className={`${tdCls} ${sub} font-mono text-center`}>{p.p1}</td>
                        <td className={tdCls}>
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap ${p.tipTo === 'Штучн.' ? D ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-100 text-sky-700' : p.tipTo === 'Тарози' ? D ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700' : D ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>{p.tipTo}</span>
                        </td>
                        <td className={`${tdCls} font-mono ${sub}`}>{p.artikul}</td>
                        <td className={`${tdCls} ${sub} text-[11px]`}><span className="truncate block" style={{ maxWidth: 120 }}>{p.gruppa}</span></td>
                        <td className={`${tdCls} text-right font-semibold ${text}`}>{p.shtUpakovka}</td>
                        <td className={`${tdCls} ${sub} font-mono text-right`}>{p.netto.toFixed(3)}</td>
                        <td className={`${tdCls} ${sub} font-mono text-right`}>{p.brutto.toFixed(3)}</td>
                        <td className={`${tdCls} ${sub} text-right`}>{p.srok} {t.monthShort ?? 'oy'}</td>
                        <td className={`${tdCls} ${sub} text-[11px]`}><span className="truncate block" style={{ maxWidth: 130 }}>{p.postavshik}</span></td>
                        <td className={`${tdCls} font-mono text-right ${D ? 'text-violet-400' : 'text-violet-600'}`}>{p.exId}</td>
                        <td className={`${tdCls} font-mono text-right text-[10px] ${sub}`}>{p.shtrixKod}</td>
                        <td className={`${tdCls} font-mono text-right text-[10px] ${sub}`}>{p.ikpu}</td>
                        <td className={`${tdCls} font-semibold text-right ${text} whitespace-nowrap`}>{fmtR(p.rtl)}</td>
                        <td className={`${tdCls} text-right`}>
                          <span className={`text-xs font-semibold ${inStock ? 'text-emerald-400' : 'text-rose-400'}`}>{inStock ? p.balance.toFixed(3) : '—'}</span>
                        </td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditProduct(p)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isEditing ? 'bg-indigo-600 text-white' : D ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}><Edit2 size={11} /></button>
                            <button onClick={() => setDeleteProductConfirm(p)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${D ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`}><Trash2 size={11} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <PaginationBar />
              <FooterStats />
            </div>
          </div>
        </div>
      )}

    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">{t.navProducts ?? 'Mahsulotlar'}</h2>
          <p className={`text-sm ${sub} mt-0.5`}>
            {filtered.length} {t.productCount ?? 'ta mahsulot'}
            {orgFilteredProducts.length !== filtered.length && (
              <span className="ml-1 opacity-60">({orgFilteredProducts.length} {t.pageOf ?? 'dan'})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`hidden md:flex items-center rounded-xl overflow-hidden border ${D ? 'border-gray-700' : 'border-gray-200'}`}>
            <button onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-indigo-600 text-white' : D ? `${sub} bg-gray-800 hover:bg-gray-700` : `text-gray-500 bg-white hover:bg-gray-50`
              }`}>
              <ListIcon size={13} /><span className="hidden sm:inline">{t.viewList ?? 'Jadval'}</span>
            </button>
            <button onClick={() => setViewMode('card')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-l ${D ? 'border-gray-700' : 'border-gray-200'} ${
                viewMode === 'card' ? 'bg-indigo-600 text-white' : D ? `${sub} bg-gray-800 hover:bg-gray-700` : `text-gray-500 bg-white hover:bg-gray-50`
              }`}>
              <LayoutGrid size={13} /><span className="hidden sm:inline">{t.viewCard ?? 'Kartochka'}</span>
            </button>
          </div>
          <button onClick={() => setStockOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${stockOnly ? 'bg-indigo-600 text-white' : D ? `${sub} bg-gray-800 hover:bg-gray-700` : `text-gray-600 bg-gray-100 hover:bg-gray-200`}`}>
            <Activity size={12} /> {t.inStock ?? 'Mavjud'}
          </button>
          <button onClick={() => { setEditingProduct(null); setAddForm(emptyForm); setAddSaveError(null); setAddTab('asosiy'); setAddModalKey(k => k + 1); setShowAddModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
            <Plus size={12} /> {t.addProd ?? "Qo'shish"}
          </button>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${card}`}>
            <Search size={13} className={sub} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t.searchLabel ?? 'Qidirish...'}
              className={`bg-transparent outline-none text-xs ${text} w-40`} />
            {search && <button onClick={() => setSearch('')}><X size={12} className={sub} /></button>}
          </div>
        </div>
      </div>

      {/* ══ KATEGORIYALAR SECTION ══════════════════════════════════════════ */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        {/* Section header */}
        <button
          onClick={() => setCatSectionOpen(v => !v)}
          className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${D ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'}`}
        >
          <div className="flex items-center gap-2">
            <FolderOpen size={15} className="text-indigo-400" />
            <span className={`text-sm font-semibold ${text}`}>{t.categories ?? 'Kategoriyalar'}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-lg font-medium ${D ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              {categories.length}
            </span>
            {selectedCatId && (() => {
              const cat = categories.find(c => c.id === selectedCatId);
              return cat ? (
                <span className="text-xs px-2 py-0.5 rounded-lg text-white font-medium ml-1 flex items-center gap-1.5"
                  style={{ background: cat.color }}>
                  {cat.image
                    ? <img src={cat.image} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                    : <span>{cat.emoji}</span>
                  }
                  {cat.name}
                </span>
              ) : null;
            })()}
          </div>
          <div className="flex items-center gap-2">
            {selectedCatId && (
              <button onClick={e => { e.stopPropagation(); setSelectedCatId(null); }}
                className={`text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 ${D ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} transition-colors`}>
                <X size={10} /> {t.clearFilter ?? 'Tozalash'}
              </button>
            )}
            {catSectionOpen ? <ChevronUp size={14} className={sub} /> : <ChevronDown size={14} className={sub} />}
          </div>
        </button>

        {catSectionOpen && (
          <div className={`border-t ${divider}`}>
            {/* Category chips */}
            <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
              {/* All */}
              <button onClick={() => setSelectedCatId(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex-shrink-0 ${
                  !selectedCatId
                    ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-900/30'
                    : D ? `${sub} bg-gray-800/60 border-gray-700 hover:bg-gray-700` : `text-gray-600 bg-white border-gray-200 hover:bg-gray-50`
                }`}>
                <Package size={11} />
                {t.allProducts}
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${!selectedCatId ? 'bg-white/20' : D ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {orgFilteredProducts.length}
                </span>
              </button>

              {categories.map(cat => {
                const cnt = catCounts[cat.id] ?? 0;
                const isActive = selectedCatId === cat.id;
                return (
                  <div key={cat.id} className="relative group flex-shrink-0">
                    <button
                      onClick={() => setSelectedCatId(isActive ? null : cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        isActive
                          ? 'text-white border-transparent shadow-md'
                          : D ? `${sub} bg-gray-800/60 border-gray-700 hover:bg-gray-700` : `text-gray-600 bg-white border-gray-200 hover:bg-gray-50`
                      }`}
                      style={isActive ? { background: cat.color } : {}}>
                      {cat.image
                        ? <img src={cat.image} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                        : <span>{cat.emoji}</span>
                      }
                      <span className="max-w-[110px] truncate">{cat.name}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        isActive ? 'bg-white/25' : D ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>{cnt}</span>
                    </button>
                    {/* Edit/Delete on hover */}
                    <div className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center gap-0.5 z-10">
                      <button onClick={e => { e.stopPropagation(); openEditCatForm(cat); }}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white shadow-lg"
                        style={{ background: cat.color }}>
                        <Pencil size={8} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteCatConfirm(cat); }}
                        className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg">
                        <X size={8} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add button */}
              <button onClick={openCreateCatForm}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex-shrink-0 ${
                  D ? 'border-dashed border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                    : 'border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50'
                }`}>
                <FolderPlus size={12} />
                {t.addCat ?? "Kategoriya qo'shish"}
              </button>
            </div>

            {/* Create / Edit form */}
            {showCatForm && (
              <div className={`border-t ${divider} px-4 py-4`}>
                {/* Preview + title */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner"
                    style={{ background: newCatColor + '22', border: `2px solid ${newCatColor}` }}
                  >
                    {iconMode === 'image' && newCatImage
                      ? <img src={newCatImage} alt="cat" className="w-full h-full object-cover" />
                      : <span className="text-2xl">{newCatEmoji}</span>
                    }
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${text}`}>
                      {editCatId ? (t.catEditTitle ?? 'Kategoriyani tahrirlash') : (t.newCategory ?? 'Yangi kategoriya')}
                    </p>
                    <p className={`text-xs ${sub}`}>{newCatName || (t.catNamePlaceholder ?? 'Kategoriya nomi...')}</p>
                  </div>
                  <button onClick={() => { setShowCatForm(false); setEditCatId(null); }} className="ml-auto flex-shrink-0">
                    <X size={14} className={sub} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <p className={`text-[11px] font-semibold ${sub} uppercase tracking-wide`}>{t.catNameLabel ?? 'Nom'}</p>
                    <input ref={catNameRef} value={newCatName} onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveCatForm()}
                      placeholder={t.catNamePlaceholder ?? 'Kategoriya nomi...'}
                      className={`w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors ${
                        D ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-400'
                      }`} />
                  </div>

                  {/* Icon: Emoji / Rasm tabs */}
                  <div className="space-y-1.5">
                    {/* Tab switcher */}
                    <div className={`inline-flex rounded-xl overflow-hidden border ${D ? 'border-gray-700' : 'border-gray-200'}`}>
                      <button
                        onClick={() => setIconMode('emoji')}
                        className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold transition-all ${
                          iconMode === 'emoji' ? 'text-white' : D ? `${sub} hover:text-gray-200` : `text-gray-500 hover:text-gray-700`
                        }`}
                        style={iconMode === 'emoji' ? { background: newCatColor } : {}}
                      >
                        <Smile size={11} /> {t.catEmojiLabel ?? 'Emoji'}
                      </button>
                      <button
                        onClick={() => setIconMode('image')}
                        className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold transition-all border-l ${D ? 'border-gray-700' : 'border-gray-200'} ${
                          iconMode === 'image' ? 'text-white' : D ? `${sub} hover:text-gray-200` : `text-gray-500 hover:text-gray-700`
                        }`}
                        style={iconMode === 'image' ? { background: newCatColor } : {}}
                      >
                        <ImagePlus size={11} /> {t.catImageLabel ?? 'Rasm'}
                      </button>
                    </div>

                    {iconMode === 'emoji' ? (
                      <div className="flex flex-wrap gap-1.5">
                        {CAT_EMOJIS.map(em => (
                          <button key={em} onClick={() => setNewCatEmoji(em)}
                            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                              newCatEmoji === em ? 'scale-110' : D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                            style={newCatEmoji === em ? { boxShadow: `0 0 0 2px ${newCatColor}` } : {}}>
                            {em}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div>
                        {newCatImage ? (
                          <div className="relative rounded-xl overflow-hidden w-full h-20">
                            <img src={newCatImage} alt="preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center gap-1.5"
                              style={{ background: 'rgba(0,0,0,0.42)' }}>
                              <button
                                onClick={() => catImgRef.current?.click()}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-white text-[10px] font-medium"
                                style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)' }}
                              >
                                <ImagePlus size={10} /> {t.catReplaceImg ?? 'Almashtirish'}
                              </button>
                              <button
                                onClick={() => { setNewCatImage(null); setIconMode('emoji'); }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-white text-[10px] font-medium"
                                style={{ background: 'rgba(239,68,68,0.7)' }}
                              >
                                <X size={10} /> {t.catRemoveImg ?? "O'chirish"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => catImgRef.current?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCatImage(f); }}
                            className={`w-full h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all border-2 border-dashed ${
                              D ? 'border-gray-600 hover:border-indigo-500 bg-gray-800/50 hover:bg-indigo-500/10'
                                : 'border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50'
                            }`}
                          >
                            <ImagePlus size={18} style={{ color: newCatColor }} />
                            <p className={`text-[10px] ${sub}`}>{t.catUploadImg ?? 'Rasm yuklash yoki suring'}</p>
                          </button>
                        )}
                        <input
                          ref={catImgRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleCatImage(f); }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Color */}
                  <div className="space-y-1.5">
                    <p className={`text-[11px] font-semibold ${sub} uppercase tracking-wide`}>{t.catColorLabel ?? 'Rang'}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CAT_PALETTE.map(clr => (
                        <button key={clr} onClick={() => setNewCatColor(clr)}
                          className="w-7 h-7 rounded-lg transition-all hover:scale-110"
                          style={{
                            background: clr,
                            boxShadow: newCatColor === clr ? `0 0 0 2px ${D ? '#1c1c1e' : '#fff'}, 0 0 0 4px ${clr}` : undefined,
                            transform: newCatColor === clr ? 'scale(1.15)' : undefined,
                          }} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button onClick={saveCatForm} disabled={!newCatName.trim()}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all ${
                      newCatName.trim() ? 'hover:opacity-90 shadow-md' : 'opacity-40 cursor-not-allowed'
                    }`}
                    style={{ background: newCatColor }}>
                    <Check size={12} />
                    {editCatId ? (t.catUpdateBtn ?? 'Yangilash') : (t.save ?? 'Saqlash')}
                  </button>
                  <button onClick={() => { setShowCatForm(false); setEditCatId(null); }}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                      D ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {t.cancel ?? 'Bekor qilish'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Brend filter */}
      {brends.length > 0 && (
      <div className="flex items-center gap-2 flex-wrap">
        {selectedBrends.size > 0 && (
          <button onClick={() => setSelectedBrends(new Set())}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${D ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
            <X size={11} /> {t.clearFilter ?? 'Tozalash'}
          </button>
        )}
        {brends.map(b => {
          const active = selectedBrends.has(b);
          return (
            <button key={b} onClick={() => toggleBrend(b)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                active ? 'text-white border-transparent' : D ? `${sub} bg-gray-800/60 border-gray-700 hover:bg-gray-700` : `text-gray-600 bg-white border-gray-200 hover:bg-gray-50`
              }`}
              style={active ? { background: brandColor(b) } : {}}>
              {active && <Check size={10} />}
              {b}
            </button>
          );
        })}
      </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        viewMode === 'list' ? (
          <div className={`rounded-2xl border ${card}`}>
            <div className={`flex justify-end gap-1 px-3 py-2 border-b ${divider}`}>
              <button onClick={() => scrollProdTable('left')} className={`flex items-center justify-center w-7 h-7 rounded-lg border ${D ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><ChevronLeft size={14} /></button>
              <button onClick={() => scrollProdTable('right')} className={`flex items-center justify-center w-7 h-7 rounded-lg border ${D ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><ChevronRight size={14} /></button>
              <button
                onClick={() => setIsFullscreen(f => !f)}
                title={isFullscreen ? 'Kichraytirish' : "To'liq ekran"}
                className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
                  isFullscreen
                    ? 'bg-indigo-600 text-white border-transparent'
                    : D ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}>
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </div>
            <div className="overflow-x-auto" ref={prodTableRef}>
              <table style={{ minWidth: 1220, tableLayout: 'auto', width: '100%' }}>
                <thead>
                  <tr className={`border-b ${divider} ${D ? 'bg-gray-900/60' : 'bg-gray-50'}`}>
                    <th className={thCls} style={{ position:'sticky', left:0, zIndex:2, background: D?'#111827':'#f9fafb', width:32, minWidth:32 }}>#</th>
                    <th className={thCls} style={{ position:'sticky', left:32, zIndex:2, background: D?'#111827':'#f9fafb', minWidth:60 }}>{t.colKod ?? 'Kod'}</th>
                    <th className={thCls} style={{ minWidth:180 }}>{t.colName ?? 'Mahsulot'}</th>
                    <th className={thCls} style={{ minWidth:80 }}>Brend</th>
                    {/* Category column */}
                    <th className={thCls} style={{ minWidth:120 }}>{t.colCat ?? 'Kategoriya'}</th>
                    <th className={thCls} style={{ minWidth:36 }}>П1</th>
                    <th className={thCls} style={{ minWidth:72 }}>TipTo</th>
                    <th className={thCls} style={{ minWidth:72 }}>Artikul</th>
                    <th className={thCls} style={{ minWidth:100 }}>Gruppa</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:56 }}>шт.упак</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:56 }}>Netto</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:56 }}>Brutto</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:48 }}>{t.colSrok ?? 'Srok'}</th>
                    <th className={thCls} style={{ minWidth:120 }}>{t.colPostavshik ?? 'Postavshik'}</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:52 }}>ExID</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:110 }}>{t.colShtrixKod ?? 'Shtrix kod'}</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:80 }}>IKPU</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:72 }}>RTL</th>
                    <th className={`${thCls} text-right`} style={{ minWidth:64 }}>{t.prodBalanceLabel ?? 'Qoldiq'}</th>
                    <th className={thCls} style={{ minWidth:64 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p, idx) => {
                    const inStock = p.balance > 0;
                    const bc = brandColor(p.brend);
                    const isEditing = editingProduct?.id === p.id;
                    const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
                    const stickyBg = D ? (isEditing ? '#1e1b4b' : '#0d1117') : (isEditing ? '#eef2ff' : '#ffffff');
                    const prodCat = getProductCat(p.id);
                    const isPickerOpen = openPickerProdId === p.id;
                    return (
                      <tr key={p.id}
                        className={`${cardHover} transition-colors ${idx < paginated.length - 1 ? `border-b ${divider}` : ''} ${isEditing ? D ? 'bg-indigo-950/30' : 'bg-indigo-50' : ''}`}>
                        <td className={`${tdCls} ${sub}`} style={{ position:'sticky', left:0, zIndex:1, background: stickyBg }}>{globalIdx}</td>
                        <td className={`${tdCls} font-mono font-semibold ${D ? 'text-indigo-400' : 'text-indigo-600'}`} style={{ position:'sticky', left:32, zIndex:1, background: stickyBg }}>{p.kod}</td>
                        <td className={tdCls}>
                          <p className={`${text} text-xs leading-snug`} style={{ maxWidth: 200 }}>{p.ismi}</p>
                        </td>
                        <td className={tdCls}>
                          {p.brend?.trim() ? (
                            <span className="px-2 py-0.5 rounded-lg text-white text-[10px] font-bold whitespace-nowrap" style={{ background: bc }}>
                              {p.brend.slice(0, 10)}
                            </span>
                          ) : (
                            <span className={sub}>—</span>
                          )}
                        </td>
                        {/* Category cell */}
                        <td className={tdCls}>
                          <div className="relative">
                            <button
                              onClick={() => setOpenPickerProdId(isPickerOpen ? null : p.id)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-medium border transition-all w-full max-w-[110px] ${
                                prodCat
                                  ? 'text-white border-transparent'
                                  : D ? `${sub} border-dashed border-gray-600 hover:border-indigo-500 hover:text-indigo-400`
                                      : `text-gray-400 border-dashed border-gray-300 hover:border-indigo-400 hover:text-indigo-500`
                              }`}
                              style={prodCat ? { background: prodCat.color } : {}}
                            >
                              {prodCat ? (
                                <>
                                  {prodCat.image
                                    ? <img src={prodCat.image} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                                    : <span>{prodCat.emoji}</span>
                                  }
                                  <span className="truncate">{prodCat.name}</span>
                                </>
                              ) : (
                                <>
                                  <Plus size={9} />
                                  <span>{t.catAssign ?? 'Belgilash'}</span>
                                </>
                              )}
                            </button>
                            {isPickerOpen && (
                              <CategoryPicker
                                D={D} sub={sub}
                                categories={categories}
                                currentCatId={prodCat?.id ?? null}
                                onSelect={catId => assignProductCat(p.id, catId)}
                                onClose={() => setOpenPickerProdId(null)}
                                t={t}
                              />
                            )}
                          </div>
                        </td>
                        <td className={`${tdCls} ${sub} font-mono text-center`}>{p.p1}</td>
                        <td className={tdCls}>
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap ${
                            p.tipTo === 'Штучн.' ? D ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-100 text-sky-700'
                            : p.tipTo === 'Тарози' ? D ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700'
                            : D ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                          }`}>{p.tipTo}</span>
                        </td>
                        <td className={`${tdCls} font-mono ${sub}`}>{p.artikul}</td>
                        <td className={`${tdCls} ${sub} text-[11px]`}>
                          <span className="truncate block" style={{ maxWidth: 120 }}>{p.gruppa}</span>
                        </td>
                        <td className={`${tdCls} text-right font-semibold ${text}`}>{p.shtUpakovka}</td>
                        <td className={`${tdCls} ${sub} font-mono text-right`}>{p.netto.toFixed(3)}</td>
                        <td className={`${tdCls} ${sub} font-mono text-right`}>{p.brutto.toFixed(3)}</td>
                        <td className={`${tdCls} ${sub} text-right`}>{p.srok} {t.monthShort ?? 'oy'}</td>
                        <td className={`${tdCls} ${sub} text-[11px]`}>
                          <span className="truncate block" style={{ maxWidth: 130 }}>{p.postavshik}</span>
                        </td>
                        <td className={`${tdCls} font-mono text-right ${D ? 'text-violet-400' : 'text-violet-600'}`}>{p.exId}</td>
                        <td className={`${tdCls} font-mono text-right text-[10px] ${sub}`}>{p.shtrixKod}</td>
                        <td className={`${tdCls} font-mono text-right text-[10px] ${sub}`}>{p.ikpu}</td>
                        <td className={`${tdCls} font-semibold text-right ${text} whitespace-nowrap`}>{fmtR(p.rtl)}</td>
                        <td className={`${tdCls} text-right`}>
                          <span className={`text-xs font-semibold ${inStock ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {inStock ? p.balance.toFixed(3) : '—'}
                          </span>
                        </td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditProduct(p)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                isEditing ? 'bg-indigo-600 text-white' : D ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'
                              }`}>
                              <Edit2 size={11} />
                            </button>
                            <button onClick={() => setDeleteProductConfirm(p)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${D ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <PaginationBar />
              <FooterStats />
            </div>
          </div>
        ) : (
          /* ── CARD VIEW ── */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {paginated.map(p => {
                const inStock = p.balance > 0;
                const bc = brandColor(p.brend);
                const isEditing = editingProduct?.id === p.id;
                const prodCat = getProductCat(p.id);
                const isPickerOpen = openPickerProdId === p.id;
                return (
                  <div key={p.id}
                    className={`rounded-2xl border overflow-hidden flex flex-col transition-all ${card} ${cardHover} ${isEditing ? D ? 'ring-2 ring-indigo-500/60' : 'ring-2 ring-indigo-400/50' : ''}`}>
                    {/* Top color bar — category color if assigned, else brand color */}
                    <div className="h-[3px] w-full flex-shrink-0" style={{ background: prodCat ? prodCat.color : bc }} />
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-lg text-white text-[10px] font-bold tracking-wide" style={{ background: bc }}>
                          {p.brend?.trim() || '—'}
                        </span>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => openEditProduct(p)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                              isEditing ? 'bg-indigo-600 text-white' : D ? 'bg-gray-800 text-gray-500 hover:text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-700'
                            }`}>
                            <Edit2 size={10} />
                          </button>
                          <button onClick={() => setDeleteProductConfirm(p)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${D ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`}>
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>

                      <p className={`text-[12px] font-semibold ${text} leading-snug line-clamp-2 min-h-[2.6em]`}>{p.ismi}</p>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${D ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{p.kod}</span>
                        {p.artikul && (
                          <span className={`font-mono text-[10px] ${sub} px-1.5 py-0.5 rounded-md ${D ? 'bg-gray-800' : 'bg-gray-100'}`}>{p.artikul}</span>
                        )}
                      </div>

                      {/* ── Category assign button ── */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenPickerProdId(isPickerOpen ? null : p.id)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border w-full transition-all ${
                            prodCat
                              ? 'text-white border-transparent'
                              : D ? `${sub} border-dashed border-gray-600 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10`
                                  : `text-gray-400 border-dashed border-gray-300 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50`
                          }`}
                          style={prodCat ? { background: prodCat.color } : {}}
                        >
                          {prodCat ? (
                            <>
                              {prodCat.image
                                ? <img src={prodCat.image} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                                : <span className="text-sm">{prodCat.emoji}</span>
                              }
                              <span className="truncate">{prodCat.name}</span>
                              <X size={9} className="ml-auto flex-shrink-0 opacity-70"
                                onClick={e => { e.stopPropagation(); assignProductCat(p.id, null); }} />
                            </>
                          ) : (
                            <>
                              <FolderOpen size={11} />
                              <span>{t.catAssignLabel ?? 'Kategoriya belgilash'}</span>
                              <ChevronDown size={9} className="ml-auto flex-shrink-0" />
                            </>
                          )}
                        </button>
                        {isPickerOpen && (
                          <CategoryPicker
                            D={D} sub={sub}
                            categories={categories}
                            currentCatId={prodCat?.id ?? null}
                            onSelect={catId => assignProductCat(p.id, catId)}
                            onClose={() => setOpenPickerProdId(null)}
                            t={t}
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium flex-shrink-0 ${
                          p.tipTo === 'Штучн.' ? D ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-100 text-sky-700'
                          : p.tipTo === 'Тарози' ? D ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700'
                          : D ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                        }`}>{p.tipTo}</span>
                        <span className={`text-[10px] ${sub} truncate`}>{p.gruppa}</span>
                      </div>

                      <div className={`grid grid-cols-3 gap-1 border-t pt-2 mt-auto ${divider}`}>
                        <div>
                          <p className={`text-[9px] ${sub} mb-0.5 leading-none`}>{t.prodPriceLabel ?? 'Narxi'}</p>
                          <p className={`text-[11px] font-bold ${text}`}>{fmtR(p.rtl)}</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-[9px] ${sub} mb-0.5 leading-none`}>{t.prodBalanceLabel ?? 'Qoldiq'}</p>
                          <p className={`text-[11px] font-bold ${inStock ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {inStock ? (p.balance % 1 === 0 ? p.balance : p.balance.toFixed(1)) : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-[9px] ${sub} mb-0.5 leading-none`}>шт.упак</p>
                          <p className={`text-[11px] font-semibold ${text}`}>{p.shtUpakovka}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Tag size={9} className={`${sub} flex-shrink-0`} />
                        <span className={`text-[10px] ${sub} truncate`}>{p.postavshik}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className={`rounded-2xl border ${card} overflow-hidden`}>
                <PaginationBar /><FooterStats />
              </div>
            )}
            {totalPages <= 1 && (
              <div className={`rounded-2xl border ${card} overflow-hidden`}><FooterStats /></div>
            )}
          </div>
        )
      ) : (
        <div className={`flex flex-col items-center justify-center py-20 gap-3 rounded-2xl border ${card}`}>
          <Package size={32} className={sub} />
          <p className={`text-sm ${sub}`}>{t.notFound ?? 'Topilmadi'}</p>
        </div>
      )}

      {showAddModal && (
        <AddProductDrawer
          key={addModalKey}
          D={D} addForm={addForm} setF={setF} patchForm={patchForm} addTab={addTab} setAddTab={setAddTab}
          onClose={() => { setShowAddModal(false); setEditingProduct(null); setAddForm(emptyForm); setAddSaveError(null); }} onSave={saveNewProduct}
          categories={categories}
          isEdit={!!editingProduct}
          editTitle={t.prodEditTitle}
          saveError={addSaveError}
          t={t}
        />
      )}

      {/* ── Delete category confirmation modal ─────────────────────────── */}
      {deleteCatConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => setDeleteCatConfirm(null)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden ${D ? 'bg-[#1c1c1e] border-gray-700/60' : 'bg-white border-gray-200'}`}
            style={{ boxShadow: D ? '0 24px 60px rgba(0,0,0,0.7)' : '0 24px 60px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Colored top stripe */}
            <div className="h-1 w-full" style={{ background: deleteCatConfirm.color }} />

            <div className="p-6">
              {/* Icon + category badge */}
              <div className="flex flex-col items-center gap-3 mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner"
                  style={{ background: deleteCatConfirm.color + '22', border: `2px solid ${deleteCatConfirm.color}` }}
                >
                  {deleteCatConfirm.image
                    ? <img src={deleteCatConfirm.image} alt="" className="w-full h-full object-cover" />
                    : <span className="text-3xl">{deleteCatConfirm.emoji}</span>
                  }
                </div>
                <div className="text-center">
                  <p className={`text-base font-bold ${text}`}>
                    {t.catDeleteTitle}
                  </p>
                  <p className={`text-sm mt-1`}>
                    <span
                      className="px-2 py-0.5 rounded-lg text-white font-semibold inline-block"
                      style={{ background: deleteCatConfirm.color }}
                    >
                      {deleteCatConfirm.name}
                    </span>
                  </p>
                </div>
              </div>

              {/* Warning message */}
              <div className={`rounded-2xl px-4 py-3 mb-5 flex items-start gap-2.5 ${D ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-rose-50 border border-rose-100'}`}>
                <span className="text-rose-400 text-lg leading-none mt-0.5">⚠️</span>
                <p className={`text-xs leading-relaxed ${D ? 'text-rose-300' : 'text-rose-700'}`}>
                  {(() => {
                    const cnt = catCounts[deleteCatConfirm.id] ?? 0;
                    return cnt > 0
                      ? `${cnt} ${t.catDeleteWarnProds}`
                      : t.catDeleteWarning;
                  })()}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteCatConfirm(null)}
                  className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${D ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {t.cancel ?? 'Bekor qilish'}
                </button>
                <button
                  onClick={async () => {
                    try {
                      await deleteCat(deleteCatConfirm.id);
                      setDeleteCatConfirm(null);
                    } catch (error) {
                      console.error('Failed to delete category', error);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                >
                  {t.deleteBtn ?? "O'chirish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete product confirmation modal ─────────────────────────── */}
      {/* ── Delete product confirmation modal ─────────────────────────── */}
      {deleteProductConfirm && (() => {
        const p = deleteProductConfirm;
        const bc = BCOLORS[p.brend] ?? BCOLORS.DEFAULT ?? '#6366f1';
        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={() => setDeleteProductConfirm(null)}
          >
            <div
              className={`w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden ${D ? 'bg-[#1c1c1e] border-gray-700/60' : 'bg-white border-gray-200'}`}
              style={{ boxShadow: D ? '0 24px 60px rgba(0,0,0,0.7)' : '0 24px 60px rgba(0,0,0,0.18)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Red top stripe */}
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#ef4444,#dc2626)' }} />

              <div className="p-6">
                {/* Icon + product badge */}
                <div className="flex flex-col items-center gap-3 mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-rose-500/10 border-2 border-rose-500/30">
                    <Trash2 size={24} className="text-rose-400" />
                  </div>
                  <div className="text-center">
                    <p className={`text-base font-bold ${text}`}>{t.prodDeleteTitle}</p>
                    <div className="mt-2 flex flex-col items-center gap-1">
                      <span
                        className="px-2.5 py-0.5 rounded-xl text-white text-[11px] font-bold"
                        style={{ background: bc }}
                      >
                        {p.brend}
                      </span>
                      <p className={`text-xs font-medium mt-1 ${text} text-center leading-snug`} style={{ maxWidth: 240 }}>
                        {p.ismi}
                      </p>
                      <p className={`font-mono text-[11px] ${sub}`}>{p.kod}</p>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className={`rounded-2xl px-4 py-3 mb-5 flex items-start gap-2.5 ${D ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-rose-50 border border-rose-100'}`}>
                  <span className="text-rose-400 text-lg leading-none mt-0.5">⚠️</span>
                  <p className={`text-xs leading-relaxed ${D ? 'text-rose-300' : 'text-rose-700'}`}>
                    {t.prodDeleteWarning}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteProductConfirm(null)}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${D ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {t.cancelBtn}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await api.deleteProduct(p.id);
                        const nextProducts = products.filter(x => x.id !== p.id);
                        setProducts(nextProducts);
                        setCategories(buildCategoriesFromProducts(nextProducts, categoryMetaRows));
                      } catch (error) {
                        console.error('Failed to delete product', error);
                      } finally {
                        setDeleteProductConfirm(null);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                  >
                    {t.prodDeleteBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
    </>
  );
}