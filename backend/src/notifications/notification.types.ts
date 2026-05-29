import { UserRole } from '../common/enums';

export enum NotificationType {
  GENERAL = 'general',
  ORDER = 'order',
  VISIT = 'visit',
  PLAN = 'plan',
  GPS = 'gps',
  SYSTEM = 'system',
  MESSAGE = 'message',
}

export const NOTIFICATION_TEMPLATES = {
  NEW_ORDER: {
    title: 'Yangi buyurtma',
    body: 'Agent yangi buyurtma yubordi',
    type: NotificationType.ORDER,
  },
  VISIT_COMPLETED: {
    title: 'Vizit yakunlandi',
    body: 'Mijoz viziti muvaffaqiyatli qayd etildi',
    type: NotificationType.VISIT,
  },
  PLAN_REMINDER: {
    title: 'Plan eslatmasi',
    body: 'Kunlik planni bajarish vaqtiga yetdingiz',
    type: NotificationType.PLAN,
  },
  GPS_ALERT: {
    title: 'GPS ogohlantirish',
    body: 'GPS signali uzildi. Iltimos, lokatsiyani yoqing',
    type: NotificationType.GPS,
  },
} as const;
