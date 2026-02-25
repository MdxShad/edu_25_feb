import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateFeeReceiptPdf } from '@/lib/pdf/documents';

function canView(
  user: { id: string; role: Role; parentId: string | null },
  admission: { consultantId: string; agentId: string | null }
) {
  if (user.role === Role.SUPER_ADMIN) return true;
  if (user.role === Role.CONSULTANT) return admission.consultantId === user.id;
  if (user.role === Role.STAFF) return admission.consultantId === (user.parentId ?? '__NONE__');
  return admission.agentId === user.id;
}

export async function GET(_req: Request, { params }: { params: { paymentId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payment = await prisma.studentPayment.findUnique({
    where: { id: params.paymentId },
    include: {
      admission: {
        include: { university: true, course: true, agent: true, consultant: true, studentPayments: true },
      },
    },
  });
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canView(user, payment.admission)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const collectedTotal = payment.admission.studentPayments.reduce((sum, row) => sum + row.amount, 0);
  const pending = Math.max(0, payment.admission.displayFee - collectedTotal);

  const pdfBytes = await generateFeeReceiptPdf({
    ...payment.admission,
    amountReceived: payment.amount,
    displayFee: payment.amount + pending,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="fee-receipt-payment-${payment.id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
