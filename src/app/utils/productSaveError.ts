/** API xabarlarini foydalanuvchi tushunadigan o'zbekchaga */
const API_MESSAGE_UZ: Record<string, string> = {
  'product code already exists': 'Bu kod bilan mahsulot allaqachon mavjud',
  'product name already exists': 'Bunday nomli mahsulot allaqachon mavjud',
  'product not found': 'Mahsulot topilmadi',
  'invalid image data': 'Rasm formati noto\'g\'ri',
  'image too large': 'Rasm juda katta — avtomatik siqib bo\'lmadi',
  'image could not be compressed': 'Rasmni qayta ishlashda xatolik',
  'empty image data': 'Rasm bo\'sh yoki buzilgan',
  'internal server error': 'Server ichki xatosi (ko\'pincha rasm yuklash bilan bog\'liq)',
  'category already exists': 'Bunday kategoriya allaqachon mavjud',
  'category not found': 'Kategoriya topilmadi',
};

const API_MESSAGE_UZ_CY: Record<string, string> = {
  'product code already exists': 'Бу код билан маҳсулот аллақачон мавжуд',
  'product name already exists': 'Бундай номли маҳсулот аллақачон мавжуд',
  'product not found': 'Маҳсулот топилмади',
  'invalid image data': 'Расм формати нотўғри',
  'image too large': 'Расм жуда катта — автоматик сиқиб бўлмади',
  'image could not be compressed': 'Расмни қайта ишлашда хатолик',
  'empty image data': 'Расм бўш ёки бузилган',
  'internal server error': 'Сервер ички хатоси (кўпинча расм юклаш билан боғлиқ)',
  'category already exists': 'Бундай категория аллақачон мавжуд',
  'category not found': 'Категория топилмади',
};

function translateApiMessage(message: string, cyrillic: boolean): string {
  const withoutStatus = message.replace(/^HTTP \d+:\s*/i, '').trim();
  const key = withoutStatus.toLowerCase();
  const map = cyrillic ? API_MESSAGE_UZ_CY : API_MESSAGE_UZ;
  return map[key] ?? withoutStatus;
}

/** Ma'lum sabab bilan xato matni */
export function formatProductSaveReason(reason: string, t: Record<string, string>): string {
  const base = t.prodSaveError ?? "Mahsulotni saqlab bo'lmadi";
  return `${base}: ${reason}`;
}

/** Mahsulot saqlash xatosini sabab bilan formatlash */
export function formatProductSaveError(
  error: unknown,
  t: Record<string, string>,
): string {
  const base = t.prodSaveError ?? "Mahsulotni saqlab bo'lmadi";
  const cyrillic = base.includes('сақлаб') || base.includes('Маҳсулот');

  const raw = error instanceof Error ? error.message : String(error ?? '');
  const message = raw.trim();
  const lower = message.toLowerCase();

  if (!message) {
    const reason = t.prodSaveReasonUnknown ?? (cyrillic ? 'Номаълум сабаб' : 'Noma\'lum sabab');
    return `${base}: ${reason}`;
  }

  if (lower.includes('already exists') || message.includes('409')) {
    if (lower.includes('name')) {
      const reason = cyrillic
        ? 'Бундай номли маҳсулот аллақачон мавжуд'
        : 'Bunday nomli mahsulot allaqachon mavjud';
      return `${base}: ${reason}`;
    }
    const reason = t.prodDuplicateCode ?? (cyrillic
      ? 'Бу код билан маҳсулот аллақачон мавжуд'
      : 'Bu kod bilan mahsulot allaqachon mavjud');
    return `${base}: ${reason}`;
  }

  if (
    lower.includes('backend ulanmagan') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror')
  ) {
    const reason = t.prodSaveReasonNetwork
      ?? (cyrillic ? 'Серверга уланиб бўлмади' : 'Serverga ulanib bo\'lmadi');
    return `${base}: ${reason}`;
  }

  if (
    lower.includes('image') ||
    lower.includes('rasm') ||
    lower.includes('invalid image') ||
    lower.includes('too large') ||
    lower.includes('empty image')
  ) {
    const reason = translateApiMessage(message, cyrillic);
    return `${base}: ${reason}`;
  }

  if (lower.includes('http 500') || lower.includes('internal server error')) {
    const reason = t.prodSaveReasonServer
      ?? translateApiMessage('internal server error', cyrillic);
    return `${base}: ${reason}`;
  }

  const reason = translateApiMessage(message, cyrillic);
  return `${base}: ${reason}`;
}
