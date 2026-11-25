import {
  monthPeriod,
  previousPeriod,
  toSeoulMonthKey,
  trendMonths,
  yearPeriod,
} from './sales-period';

describe('sales period', () => {
  it('uses Korean midnight for month boundaries', () => {
    expect(monthPeriod('2026-11')).toEqual({
      end: new Date('2026-11-30T15:00:00.000Z'),
      key: '2026-11',
      kind: 'month',
      start: new Date('2026-10-31T15:00:00.000Z'),
    });
  });

  it('rolls the year over for December and the previous month of January', () => {
    expect(monthPeriod('2026-12').end).toEqual(new Date('2026-12-31T15:00:00.000Z'));
    expect(previousPeriod(monthPeriod('2027-01')).key).toBe('2026-12');
    expect(previousPeriod(yearPeriod(2026)).key).toBe('2025');
  });

  it('lists the last 12 months for a month and January to December for a year', () => {
    expect(trendMonths(monthPeriod('2026-11'))).toEqual([
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
    expect(trendMonths(yearPeriod(2026))[0]).toBe('2026-01');
    expect(trendMonths(yearPeriod(2026))[11]).toBe('2026-12');
  });

  it('reads the Korean month of a moment', () => {
    // 11월 30일 23:30 한국 시간 = 11월
    expect(toSeoulMonthKey(new Date('2026-11-30T14:30:00.000Z'))).toBe('2026-11');
    // 12월 1일 00:30 한국 시간 = 12월
    expect(toSeoulMonthKey(new Date('2026-11-30T15:30:00.000Z'))).toBe('2026-12');
  });
});
