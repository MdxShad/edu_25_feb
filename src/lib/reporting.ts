import { ExpenseType, Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getOrSetServerCache } from '@/lib/server-cache';

export type ScopeUser = { id: string; role: Role; parentId: string | null };

export function scopedAdmissionWhere(user: ScopeUser): Prisma.AdmissionWhereInput {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { consultantId: user.id };
  if (user.role === Role.STAFF) return { consultantId: user.parentId ?? '__NONE__' };
  return { agentId: user.id };
}

async function buildReportDataUncached(input: { user: ScopeUser; from: Date; to: Date }) {
  const where = scopedAdmissionWhere(input.user);

  const [admissions, admissionExpenses, dailyExpenses] = await Promise.all([
    prisma.admission.findMany({
      where: { ...where, createdAt: { gte: input.from, lte: input.to } },
      include: { agent: true, university: true, course: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.expense.findMany({
      where: {
        type: { in: [ExpenseType.AGENT, ExpenseType.CONSULTANCY] },
        admission: where,
        date: { gte: input.from, lte: input.to },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.findMany({
      where: {
        type: ExpenseType.DAILY,
        date: { gte: input.from, lte: input.to },
        OR:
          input.user.role === Role.SUPER_ADMIN
            ? undefined
            : [
                {
                  createdById:
                    input.user.role === Role.CONSULTANT
                      ? input.user.id
                      : (input.user.parentId ?? '__NONE__'),
                },
                {
                  createdBy: {
                    parentId:
                      input.user.role === Role.CONSULTANT
                        ? input.user.id
                        : (input.user.parentId ?? '__NONE__'),
                  },
                },
              ],
      },
      include: { createdBy: true },
      orderBy: { date: 'desc' },
    }),
  ]);

  const totalIncome = admissions.reduce((sum, row) => sum + row.amountReceived, 0);
  const totalNetProfit = admissions.reduce((sum, row) => sum + row.netProfit, 0);
  const totalAgentCommission = admissions.reduce((sum, row) => sum + row.agentCommissionAmount, 0);
  const totalAdmissionExpenses = admissionExpenses.reduce((sum, row) => sum + row.amount, 0);
  const totalDailyExpenses = dailyExpenses.reduce((sum, row) => sum + row.amount, 0);

  const agentWise = new Map<
    string,
    { name: string; admissions: number; commission: number; netProfit: number }
  >();
  const universityWise = new Map<
    string,
    { name: string; admissions: number; income: number; netProfit: number }
  >();

  for (const row of admissions) {
    const agentKey = row.agentId ?? 'DIRECT';
    const agentName = row.agent ? `${row.agent.name} (${row.agent.userId})` : 'Direct';
    const currentAgent = agentWise.get(agentKey) ?? {
      name: agentName,
      admissions: 0,
      commission: 0,
      netProfit: 0,
    };
    currentAgent.admissions += 1;
    currentAgent.commission += row.agentCommissionAmount;
    currentAgent.netProfit += row.netProfit;
    agentWise.set(agentKey, currentAgent);

    const currentUni = universityWise.get(row.universityId) ?? {
      name: row.university.name,
      admissions: 0,
      income: 0,
      netProfit: 0,
    };
    currentUni.admissions += 1;
    currentUni.income += row.amountReceived;
    currentUni.netProfit += row.netProfit;
    universityWise.set(row.universityId, currentUni);
  }

  return {
    admissions,
    admissionExpenses,
    dailyExpenses,
    totals: {
      totalAdmissions: admissions.length,
      totalIncome,
      totalNetProfit,
      totalAgentCommission,
      totalAdmissionExpenses,
      totalDailyExpenses,
      totalExpense: totalAdmissionExpenses + totalDailyExpenses,
      finalNetIncome: totalNetProfit - totalDailyExpenses,
    },
    agentWise: [...agentWise.values()],
    universityWise: [...universityWise.values()],
  };
}

export async function buildReportData(input: { user: ScopeUser; from: Date; to: Date }) {
  const cacheKey = [
    'report',
    input.user.id,
    input.user.role,
    input.user.parentId ?? 'none',
    input.from.toISOString(),
    input.to.toISOString(),
  ].join(':');

  return getOrSetServerCache(cacheKey, 5 * 60 * 1000, () => buildReportDataUncached(input));
}
