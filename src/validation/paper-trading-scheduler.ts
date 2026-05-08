export const CRON_TR_0900 = "0 9 * * 1-5";

export interface IstanbulDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface SchedulerCheckInput {
  nowTimestamp: number;
  lastRunTimestamp: number | null;
}

function parsePart(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toIstanbulParts(timestamp: number): IstanbulDateParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date(timestamp));
  const lookup = (type: Intl.DateTimeFormatPartTypes): number =>
    parsePart(parts.find((item) => item.type === type)?.value ?? "0");

  return {
    year: lookup("year"),
    month: lookup("month"),
    day: lookup("day"),
    hour: lookup("hour"),
    minute: lookup("minute"),
    second: lookup("second"),
  };
}

function sameCalendarDay(left: IstanbulDateParts, right: IstanbulDateParts): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

export function shouldRunDailyPaperTradingUpdate(input: SchedulerCheckInput): boolean {
  const now = toIstanbulParts(input.nowTimestamp);
  if (now.hour !== 9 || now.minute !== 0) return false;

  if (input.lastRunTimestamp === null) return true;

  const last = toIstanbulParts(input.lastRunTimestamp);
  return !sameCalendarDay(now, last);
}
