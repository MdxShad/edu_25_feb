import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateUniversityPaymentSlipPdf } from '@/lib/pdf/documents';

function canView(
  user: { id: string; role: Role; parentId: string | null },
  admission: { consultantId: string; agentId: string | null }
) {
  if (user.role === Role.SUPER_ADMIN) return true;
  if (user.role === Role.CONSULTANT) return admission.consultantId === user.id;
  if (user.role === Role.STAFF) return admission.consultantId === (user.parentId ?? '__NONE__');
  return admission.agentId === user.id;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payment = await prisma.universityPayment.findUnique({
    where: { id: params.id },
    include: {
      ledger: {
        include: {
          university: true,
          admission: { include: { consultant: true, course: true, university: true, agent: true } },
        },
      },
    },
  });

  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canView(user, payment.ledger.admission)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pdfBytes = await generateUniversityPaymentSlipPdf(payment);
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=\"university-payment-${payment.id}.pdf\"`,
      'Cache-Control': 'no-store',
    },
  });
}
