import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { formatINR } from '@/lib/money';

function canViewAdmission(
  user: { id: string; role: Role; parentId: string | null },
  admission: { consultantId: string; agentId: string | null }
) {
  if (user.role === Role.SUPER_ADMIN) return true;
  if (user.role === Role.CONSULTANT) return admission.consultantId === user.id;
  if (user.role === Role.STAFF) return admission.consultantId === (user.parentId ?? '__NONE__');
  return admission.agentId === user.id;
}

export default async function AdmissionPrintPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const admission = await prisma.admission.findUnique({
    where: { id: params.id },
    include: { university: true, course: true, consultant: true, agent: true },
  });

  if (!admission) return notFound();
  if (!canViewAdmission(user, admission)) return notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold">Printable Admission</h1>
        <div className="text-sm text-zinc-600">Use browser print to export this page.</div>
      </div>

      <section className="rounded border border-zinc-200 p-4">
        <h2 className="text-lg font-semibold">Admission Summary</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <div>
            Student: <b>{admission.studentName}</b>
          </div>
          <div>
            Mobile: <b>{admission.mobile}</b>
          </div>
          <div>
            University: <b>{admission.university.name}</b>
          </div>
          <div>
            Course: <b>{admission.course.name}</b>
          </div>
          <div>
            Session: <b>{admission.admissionSession ?? '-'}</b>
          </div>
          <div>
            Source: <b>{admission.source === 'DIRECT' ? 'Direct' : 'Agent'}</b>
          </div>
          <div>
            Consultant: <b>{admission.consultant.name}</b>
          </div>
          <div>
            Received: <b>{formatINR(admission.amountReceived)}</b>
          </div>
          <div>
            University Payable: <b>{formatINR(admission.universityFee)}</b>
          </div>
          <div>
            Agent Commission: <b>{formatINR(admission.agentCommissionAmount)}</b>
          </div>
          <div>
            Net Profit: <b>{formatINR(admission.netProfit)}</b>
          </div>
        </div>
      </section>
    </main>
  );
}
