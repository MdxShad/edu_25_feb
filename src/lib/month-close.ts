import { prisma } from '@/lib/db';

const MONTH_CLOSE_KEY = 'MONTH_CLOSED_UP_TO';

export async function getMonthClosedUpTo(): Promise<Date | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: MONTH_CLOSE_KEY } });
  if (!row?.value) return null;
  const parsed = new Date(row.value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function setMonthClosedUpTo(valueIso: string) {
  await prisma.appSetting.upsert({
    where: { key: MONTH_CLOSE_KEY },
    create: { key: MONTH_CLOSE_KEY, value: valueIso },
    update: { value: valueIso },
  });
}

export async function assertOpenPeriod(date: Date, isSuperAdmin: boolean) {
  if (isSuperAdmin) return;
  const closedUpTo = await getMonthClosedUpTo();
  if (!closedUpTo) return;
  if (date.getTime() <= closedUpTo.getTime()) {
    throw new Error('This month is closed. Contact Super Admin for override.');
  }
}
