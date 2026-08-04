/** Push tillari — agent: uz/uz_cyr/ru; mijoz: uz/uz_kril/ru/en */
export type PushLang = 'uz' | 'uz_cyr' | 'ru' | 'en';

export function normalizePushLang(code?: string | null): PushLang {
  const c = (code ?? '').trim().toLowerCase();
  if (c === 'uz_cyr' || c === 'uz_cyrl' || c === 'uz_kril') return 'uz_cyr';
  if (c === 'ru') return 'ru';
  if (c === 'en') return 'en';
  if (c === 'uz' || c === 'uz_latn') return 'uz';
  return 'uz_cyr';
}

function pick(lang: PushLang, map: Record<PushLang, string>): string {
  return map[lang] ?? map.uz_cyr;
}

export const PushI18n = {
  deliveryCollectedTitle(lang: PushLang): string {
    return pick(lang, {
      uz: "To'lov qabul qilindi",
      uz_cyr: 'Тўлов қабул қилинди',
      ru: 'Оплата получена',
      en: 'Payment received',
    });
  },

  deliveryCollectedBody(
    lang: PushLang,
    amount: string,
    remaining: string | null,
  ): string {
    let body = pick(lang, {
      uz: `Dostavkachi ${amount} so'm oldi`,
      uz_cyr: `Доставкачи ${amount} сўм олди`,
      ru: `Курьер получил ${amount} сум`,
      en: `Courier received ${amount} so'm`,
    });
    if (remaining) {
      body += pick(lang, {
        uz: `. Qoldiq: ${remaining} so'm`,
        uz_cyr: `. Қолдиқ: ${remaining} сўм`,
        ru: `. Остаток: ${remaining} сум`,
        en: `. Remaining: ${remaining} so'm`,
      });
    }
    return body;
  },

  paymentPhotoHint(lang: PushLang): string {
    return pick(lang, {
      uz: ". Xavfsizlik: pul bergan insoningizni rasmga tushirib qo'ying",
      uz_cyr: '. Хавфсизлик: пул берган инсонингизни расмга тушириб қўйинг',
      ru: '. Безопасность: сфотографируйте человека, который передал деньги',
      en: '. Safety: photograph the person who collected the payment',
    });
  },

  paymentReminderDay(lang: PushLang): { title: string; body: string } {
    return {
      title: pick(lang, {
        uz: "Bugun to'lov kuni",
        uz_cyr: 'Бугун тўлов куни',
        ru: 'Сегодня день оплаты',
        en: 'Payment due today',
      }),
      body: pick(lang, {
        uz: "Bugun mijoz to'lov qilishi kerak",
        uz_cyr: 'Бугун мижоз тўлов қилиши керак',
        ru: 'Сегодня клиент должен оплатить',
        en: 'The client should pay today',
      }),
    };
  },

  paymentReminderHour(lang: PushLang): { title: string; body: string } {
    return {
      title: pick(lang, {
        uz: "To'lov eslatmasi",
        uz_cyr: 'Тўлов эслатмаси',
        ru: 'Напоминание об оплате',
        en: 'Payment reminder',
      }),
      body: pick(lang, {
        uz: "1 soatdan keyin to'lov muddati",
        uz_cyr: '1 соатдан кейин тўлов муддати',
        ru: 'Через 1 час истекает срок оплаты',
        en: 'Payment due in 1 hour',
      }),
    };
  },

  paymentReminderOverdue(lang: PushLang): { title: string; body: string } {
    return {
      title: pick(lang, {
        uz: "To'lov muddati o'tdi",
        uz_cyr: 'Тўлов муддати ўтди',
        ru: 'Срок оплаты просрочен',
        en: 'Payment overdue',
      }),
      body: pick(lang, {
        uz: "Mijoz hali to'lov qilmadi — eslatma",
        uz_cyr: 'Мижоз ҳали тўлов қилмади — эслатма',
        ru: 'Клиент ещё не оплатил — напоминание',
        en: 'Client has not paid yet — reminder',
      }),
    };
  },

  clientOrderTitle(lang: PushLang): string {
    return pick(lang, {
      uz: 'Yangi klient buyurtmasi',
      uz_cyr: 'Янги клиент буюртмаси',
      ru: 'Новый заказ клиента',
      en: 'New client order',
    });
  },

  clientOrderBody(lang: PushLang, name: string, amount: string): string {
    return pick(lang, {
      uz: `${name} — ${amount} so'm`,
      uz_cyr: `${name} — ${amount} сўм`,
      ru: `${name} — ${amount} сум`,
      en: `${name} — ${amount} so'm`,
    });
  },

  adminNewOrderTitle(lang: PushLang, agent: string): string {
    return pick(lang, {
      uz: `Yangi buyurtma — ${agent}`,
      uz_cyr: `Янги буюртма — ${agent}`,
      ru: `Новый заказ — ${agent}`,
      en: `New order — ${agent}`,
    });
  },

  adminNewOrderBody(
    lang: PushLang,
    agent: string,
    place: string,
    sum: string,
  ): string {
    return pick(lang, {
      uz: `${agent}: ${place} · ${sum} so'm`,
      uz_cyr: `${agent}: ${place} · ${sum} сўм`,
      ru: `${agent}: ${place} · ${sum} сум`,
      en: `${agent}: ${place} · ${sum} so'm`,
    });
  },

  planAssignedTitle(lang: PushLang, isNew: boolean): string {
    if (isNew) {
      return pick(lang, {
        uz: 'Yangi reja biriktirildi',
        uz_cyr: 'Янги режа бириктирилди',
        ru: 'Назначен новый план',
        en: 'New plan assigned',
      });
    }
    return pick(lang, {
      uz: 'Reja yangilandi',
      uz_cyr: 'Режа янгиланди',
      ru: 'План обновлён',
      en: 'Plan updated',
    });
  },

  planAssignedBody(
    lang: PushLang,
    year: number,
    month: number,
    total: string,
  ): string {
    return pick(lang, {
      uz: `${month}.${year} — ${total} so'm`,
      uz_cyr: `${month}.${year} — ${total} сўм`,
      ru: `${month}.${year} — ${total} сум`,
      en: `${month}.${year} — ${total} so'm`,
    });
  },

  newMessageFallback(lang: PushLang): string {
    return pick(lang, {
      uz: 'Yangi xabar',
      uz_cyr: 'Янги хабар',
      ru: 'Новое сообщение',
      en: 'New message',
    });
  },

  imagePreview(lang: PushLang): string {
    return pick(lang, {
      uz: '📷 Rasm',
      uz_cyr: '📷 Расм',
      ru: '📷 Фото',
      en: '📷 Photo',
    });
  },

  filePreview(lang: PushLang, fileName?: string | null): string {
    const name = fileName?.trim();
    if (name) return `📎 ${name}`;
    return pick(lang, {
      uz: '📎 Fayl',
      uz_cyr: '📎 Файл',
      ru: '📎 Файл',
      en: '📎 File',
    });
  },

  orderAccepted(lang: PushLang): { title: string; body: string } {
    return {
      title: pick(lang, {
        uz: 'Buyurtma qabul qilindi',
        uz_cyr: 'Буюртма қабул қилинди',
        ru: 'Заказ принят',
        en: 'Order accepted',
      }),
      body: pick(lang, {
        uz: 'Agent buyurtmangizni qabul qildi',
        uz_cyr: 'Агент буюртмангизни қабул қилди',
        ru: 'Агент принял ваш заказ',
        en: 'The agent accepted your order',
      }),
    };
  },

  orderRejected(lang: PushLang): { title: string; body: string } {
    return {
      title: pick(lang, {
        uz: 'Buyurtma qaytarildi',
        uz_cyr: 'Буюртма қайтарилди',
        ru: 'Заказ отклонён',
        en: 'Order rejected',
      }),
      body: pick(lang, {
        uz: 'Agent buyurtmangizni rad etdi',
        uz_cyr: 'Агент буюртмангизни рад этди',
        ru: 'Агент отклонил ваш заказ',
        en: 'The agent rejected your order',
      }),
    };
  },

  orderStatus(
    lang: PushLang,
    status: 'packing' | 'on_way' | 'delivered' | 'cancelled',
  ): { title: string; body: string } | null {
    switch (status) {
      case 'packing':
        return {
          title: pick(lang, {
            uz: "Buyurtma yig'ildi",
            uz_cyr: 'Буюртма йиғилди',
            ru: 'Заказ собран',
            en: 'Order packed',
          }),
          body: pick(lang, {
            uz: "Ombor buyurtmangizni yig'ib bo'ldi",
            uz_cyr: 'Омбор буюртмангизни йиғиб бўлди',
            ru: 'Склад собрал ваш заказ',
            en: 'Warehouse has packed your order',
          }),
        };
      case 'on_way':
        return {
          title: pick(lang, {
            uz: "Buyurtma yo'lda",
            uz_cyr: 'Буюртма йўлда',
            ru: 'Заказ в пути',
            en: 'Order on the way',
          }),
          body: pick(lang, {
            uz: 'Dostavkachi buyurtmani yetkazmoqda',
            uz_cyr: 'Доставкачи буюртмани етказяпти',
            ru: 'Курьер доставляет ваш заказ',
            en: 'The courier is delivering your order',
          }),
        };
      case 'delivered':
        return {
          title: pick(lang, {
            uz: 'Buyurtma yetkazildi',
            uz_cyr: 'Буюртма етказилди',
            ru: 'Заказ доставлен',
            en: 'Order delivered',
          }),
          body: pick(lang, {
            uz: 'Buyurtmangiz muvaffaqiyatli yetkazildi',
            uz_cyr: 'Буюртмангиз муваффақиятли етказилди',
            ru: 'Ваш заказ успешно доставлен',
            en: 'Your order was delivered successfully',
          }),
        };
      case 'cancelled':
        return {
          title: pick(lang, {
            uz: 'Buyurtma bekor qilindi',
            uz_cyr: 'Буюртма бекор қилинди',
            ru: 'Заказ отменён',
            en: 'Order cancelled',
          }),
          body: pick(lang, {
            uz: 'Buyurtmangiz bekor qilindi',
            uz_cyr: 'Буюртмангиз бекор қилинди',
            ru: 'Ваш заказ отменён',
            en: 'Your order was cancelled',
          }),
        };
      default:
        return null;
    }
  },

  courierApproaching(lang: PushLang): { title: string; body: string } {
    return {
      title: pick(lang, {
        uz: 'Buyurtma yaqinlashmoqda',
        uz_cyr: 'Буюртма яқинлашмоқда',
        ru: 'Заказ приближается',
        en: 'Order approaching',
      }),
      body: pick(lang, {
        uz: 'Buyurtmangiz tez orada yetib keladi',
        uz_cyr: 'Буюртмангиз тез орада етиб келади',
        ru: 'Ваш заказ скоро будет у вас',
        en: 'Your order will arrive soon',
      }),
    };
  },
};
