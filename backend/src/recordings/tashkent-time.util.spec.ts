import {
  isWithinAgentRecordingWindow,
  recordingExpiresAt,
  tashkentDayBounds,
} from './tashkent-time.util';

describe('tashkent-time.util', () => {
  it('splits today/yesterday at Asia/Tashkent midnight', () => {
    // 2026-11-27 00:30 Tashkent = 2026-11-26 19:30 UTC
    const now = new Date('2026-11-26T19:30:00.000Z');
    const today = tashkentDayBounds('today', now);
    const yesterday = tashkentDayBounds('yesterday', now);
    expect(today.dayKey).toBe('2026-11-27');
    expect(yesterday.dayKey).toBe('2026-11-26');
    expect(today.from.getTime()).toBeGreaterThan(yesterday.to.getTime());
  });

  it('expires after 7 days from start', () => {
    const start = new Date('2026-11-20T10:00:00.000Z');
    const exp = recordingExpiresAt(start);
    expect(exp.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('allows only today and yesterday for agent window', () => {
    const now = new Date('2026-11-26T19:30:00.000Z'); // 27 Nov 00:30 Tashkent
    const todayStart = tashkentDayBounds('today', now).from;
    const twoDaysAgo = new Date(todayStart.getTime() - 36 * 60 * 60 * 1000);
    expect(isWithinAgentRecordingWindow(todayStart, now)).toBe(true);
    expect(isWithinAgentRecordingWindow(twoDaysAgo, now)).toBe(false);
  });
});
