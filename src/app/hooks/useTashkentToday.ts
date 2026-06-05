import { useEffect, useState } from 'react';
import { fetchTashkentDate, parseYmd } from '../utils/tashkentTime';

export function useTashkentToday() {
  const [todayStr, setTodayStr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTashkentDate().then(date => {
      if (!cancelled) setTodayStr(date);
    });
    return () => { cancelled = true; };
  }, []);

  const today = todayStr ? parseYmd(todayStr) : null;
  return { todayStr, today };
}
