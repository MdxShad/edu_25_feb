import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ExpenseType, PaymentStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { formatINR } from '@/lib/money';
import { getOrSetServerCache } from '@/lib/server-cache';
import { StatCard } from '@/components/ui/stat-card';
import { FinancialTrendChart } from '@/components/charts/financial-trend-chart';

function scopeAdmissionWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { consultantId: user.id };
  if (user.role === Role.STAFF) return { consultantId: user.parentId ?? '__NONE__' };
  return { agentId: user.id };
}

function scopeDailyExpenseWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};

  const consultantId =
    user.role === Role.CONSULTANT
      ? user.id
      : user.role === Role.STAFF
        ? (user.parentId ?? '__NONE__')
        : '__NONE__';

  return {
    OR: [{ createdById: consultantId }, { createdBy: { parentId: consultantId } }],
  };
}

async function getDashboardData(user: { id: string; role: Role; parentId: string | null }) {
  const admissionWhere = scopeAdmissionWhere(user);
  const dailyExpenseWhere = scopeDailyExpenseWhere(user);
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const chartStart = startOfMonth(subMonths(now, 11));

  const cacheKey = [
    'dashboard',
    user.id,
    user.role,
    user.parentId ?? 'none',
    monthStart.toISOString(),
    monthEnd.toISOString(),
  ].join(':');

  return getOrSetServerCache(cacheKey, 5 * 60 * 1000, async () => {
    const [
      totalAdmissions,
      totalProfitAgg,
      pendingUniversity,
      pendingAgent,
      monthlyIncomeAgg,
      monthlyDailyExpenseAgg,
      monthlyAdmissionExpenseAgg,
      chartAdmissions,
      chartDailyExpenses,
      chartAdmissionExpenses,
      agedUniversityPayments,
      agedAgentPayouts,
      todaysNewLeads,
    ] = await Promise.all([
      prisma.admission.count({ where: admissionWhere }),
      prisma.profitLedger.aggregate({
        where: { admission: admissionWhere },
        _sum: { netProfit: true },
      }),
      prisma.universityLedger.aggregate({
        where: { status: PaymentStatus.PENDING, admission: admissionWhere },
        _sum: { amountPayable: true, amountPaid: true },
      }),
      prisma.agentLedger.aggregate({
        where: { status: PaymentStatus.PENDING, admission: admissionWhere },
        _sum: { commissionAmount: true, amountPaid: true },
      }),
      prisma.admission.aggregate({
        where: { ...admissionWhere, createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { amountReceived: true },
      }),
      prisma.expense.aggregate({
        where: {
          type: ExpenseType.DAILY,
          date: { gte: monthStart, lte: monthEnd },
          ...dailyExpenseWhere,
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          type: { in: [ExpenseType.AGENT, ExpenseType.CONSULTANCY] },
          admission: admissionWhere,
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.admission.findMany({
        where: { ...admissionWhere, createdAt: { gte: chartStart, lte: monthEnd } },
        select: { createdAt: true, amountReceived: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.expense.findMany({
        where: {
          type: ExpenseType.DAILY,
          date: { gte: chartStart, lte: monthEnd },
          ...dailyExpenseWhere,
        },
        select: { date: true, amount: true },
        orderBy: { date: 'asc' },
      }),
      prisma.expense.findMany({
        where: {
          type: { in: [ExpenseType.AGENT, ExpenseType.CONSULTANCY] },
          admission: admissionWhere,
          date: { gte: chartStart, lte: monthEnd },
        },
        select: { date: true, amount: true },
        orderBy: { date: 'asc' },
      }),
      prisma.universityLedger.count({
        where: {
          status: PaymentStatus.PENDING,
          admission: admissionWhere,
          updatedAt: { lte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.agentLedger.count({
        where: {
          status: PaymentStatus.PENDING,
          admission: admissionWhere,
          updatedAt: { lte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.lead.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd }, status: 'NEW' as any },
      }),
    ]);

    const totalProfit = totalProfitAgg._sum.netProfit ?? 0;
    const pendingUniversityAmount =
      (pendingUniversity._sum.amountPayable ?? 0) - (pendingUniversity._sum.amountPaid ?? 0);
    const pendingAgentAmount =
      (pendingAgent._sum.commissionAmount ?? 0) - (pendingAgent._sum.amountPaid ?? 0);
    const monthlyIncome = monthlyIncomeAgg._sum.amountReceived ?? 0;
    const monthlyExpenses =
      (monthlyDailyExpenseAgg._sum.amount ?? 0) + (monthlyAdmissionExpenseAgg._sum.amount ?? 0);

    const chartRows = Array.from({ length: 12 }).map((_, index) => {
      const monthDate = startOfMonth(subMonths(now, 11 - index));
      const key = format(monthDate, 'yyyy-MM');
      const income = chartAdmissions
        .filter((row) => format(startOfMonth(row.createdAt), 'yyyy-MM') === key)
        .reduce((sum, row) => sum + row.amountReceived, 0);
      const expense = [...chartDailyExpenses, ...chartAdmissionExpenses]
        .filter((row) => format(startOfMonth(row.date), 'yyyy-MM') === key)
        .reduce((sum, row) => sum + row.amount, 0);
      return { label: format(monthDate, 'MMM yy'), income, expense };
    });

    return {
      totalAdmissions,
      totalProfit,
      pendingUniversityAmount,
      pendingAgentAmount,
      monthlyIncome,
      monthlyExpenses,
      chartRows,
      agedUniversityPayments,
      agedAgentPayouts,
      todaysNewLeads,
    };
  });
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData({ id: user.id, role: user.role, parentId: user.parentId });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">Operational and financial summary.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total admissions" value={String(data.totalAdmissions)} />
        <StatCard label="Total net profit" value={formatINR(data.totalProfit)} />
        <StatCard
          label="Pending university payment"
          value={formatINR(Math.max(0, data.pendingUniversityAmount))}
        />
        <StatCard
          label="Pending agent payment"
          value={formatINR(Math.max(0, data.pendingAgentAmount))}
        />
        <StatCard
          label="Monthly income"
          value={formatINR(data.monthlyIncome)}
          hint="Amount received this month"
        />
        <StatCard
          label="Monthly expenses"
          value={formatINR(data.monthlyExpenses)}
          hint="Daily + admission expenses"
        />
      </div>


      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="University payments aging (15d+)"
          value={String(data.agedUniversityPayments)}
          hint="Pending university settlements requiring follow-up"
        />
        <StatCard
          label="Agent payouts aging (15d+)"
          value={String(data.agedAgentPayouts)}
          hint="Pending payouts older than 15 days"
        />
        <StatCard
          label="New leads this month"
          value={String(data.todaysNewLeads)}
          hint="Follow-up attention card"
        />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <FinancialTrendChart
          title="12-Month Financial Trend (Income vs Expenses)"
          data={data.chartRows}
        />
      </div>
    </div>
  );
}

