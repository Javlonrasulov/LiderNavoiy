import { AP, type LangAdmin } from '../data/adminData';
import { useLang } from './LangContext';
import { AppLockScreen } from './admin/AppLockScreen';

/** Admin tarjimalari bilan to‘liq ekran qulfi */
export function AppLockGate() {
  const { lang } = useLang();
  const t = AP[(lang as LangAdmin)] ?? AP.uz;
  return <AppLockScreen t={t} />;
}
