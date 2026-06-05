export const TASHKENT_TZ = 'Asia/Tashkent';

export interface TashkentTimeInfo {
  timezone: typeof TASHKENT_TZ;
  date: string;
  time: string;
  timestamp: string;
}

export function getTashkentTime(): TashkentTimeInfo {
  const now = new Date();
  const date = now.toLocaleDateString('en-CA', { timeZone: TASHKENT_TZ });
  const time = now.toLocaleTimeString('en-GB', {
    timeZone: TASHKENT_TZ,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return {
    timezone: TASHKENT_TZ,
    date,
    time,
    timestamp: now.toISOString(),
  };
}
