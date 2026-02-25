import { format } from 'date-fns';
import { formatINR } from '@/lib/money';
import {
  createPdfContext,
  drawFooter,
  drawHeader,
  drawKeyValueRows,
  drawSectionTitle,
  drawTerms,
  textOrDash,
} from './layout';
import { getPdfTerms } from './terms';

type AdmissionPdfData = {
  id: string;
  createdAt: Date;
  studentName: string;
  fatherName: string | null;
  mobile: string;
  altMobile: string | null;
  address: string | null;
  source: 'DIRECT' | 'AGENT';
  amountReceived: number;
  universityFee: number;
  displayFee: number;
  consultancyProfit: number;
  agentCommissionAmount: number;
  agentExpensesTotal: number;
  consultancyExpensesTotal: number;
  netProfit: number;
  consultant: { name: string };
  university: { name: string };
  course: { name: string };
  admissionSession: string | null;
  agent: { name: string; userId: string } | null;
};

type UniversityPaymentPdfData = {
  id: string;
  amount: number;
  paidAt: Date;
  method: string;
  reference: string | null;
  notes: string | null;
  ledger: {
    admission: {
      id: string;
      studentName: string;
      university: { name: string };
      course: { name: string };
      consultant: { name: string };
    };
  };
};

type AgentPayoutPdfData = {
  id: string;
  amount: number;
  paidAt: Date;
  method: string;
  reference: string | null;
  notes: string | null;
  ledger: {
    admission: {
      id: string;
      studentName: string;
      course: { name: string };
      consultant: { name: string };
    };
    agent: { name: string; userId: string };
  };
};

export async function generateAdmissionSlipPdf(admission: AdmissionPdfData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const copies = ['Consultancy Copy', 'University Copy', 'Student Copy'];
  const terms = await getPdfTerms();

  for (const copy of copies) {
    const page = ctx.doc.addPage([595.28, 841.89]);
    drawHeader(page, ctx, 'Admission Slip', `${copy} • Admission #${admission.id}`);
    let y = 730;

    y = drawSectionTitle(page, ctx, y, 'Student');
    y = drawKeyValueRows(page, ctx, y, [
      { key: 'Name', value: textOrDash(admission.studentName) },
      { key: 'Father Name', value: textOrDash(admission.fatherName) },
      { key: 'Mobile', value: textOrDash(admission.mobile) },
      { key: 'Alt Mobile', value: textOrDash(admission.altMobile) },
      { key: 'Address', value: textOrDash(admission.address) },
    ]);

    y -= 8;
    y = drawSectionTitle(page, ctx, y, 'Course & Source');
    y = drawKeyValueRows(page, ctx, y, [
      { key: 'University', value: admission.university.name },
      { key: 'Course', value: admission.course.name },
      { key: 'Session', value: textOrDash(admission.admissionSession) },
      { key: 'Source', value: admission.source === 'DIRECT' ? 'Direct' : 'Agent' },
      {
        key: 'Agent',
        value: admission.agent ? `${admission.agent.name} (${admission.agent.userId})` : '-',
      },
      { key: 'Created At', value: format(admission.createdAt, 'PPP p') },
    ]);

    y -= 8;
    y = drawSectionTitle(page, ctx, y, 'Fee Breakdown');
    const pending = Math.max(0, admission.displayFee - admission.amountReceived);
    y = drawKeyValueRows(page, ctx, y, [
      { key: 'Amount Received', value: formatINR(admission.amountReceived) },
      { key: 'University Fee', value: formatINR(admission.universityFee) },
      { key: 'Display Fee', value: formatINR(admission.displayFee) },
      { key: 'Pending Fee', value: formatINR(pending) },
      { key: 'Consultancy Profit', value: formatINR(admission.consultancyProfit) },
      { key: 'Agent Commission', value: formatINR(admission.agentCommissionAmount) },
      { key: 'Agent Expenses', value: formatINR(admission.agentExpensesTotal) },
      { key: 'Consultancy Expenses', value: formatINR(admission.consultancyExpensesTotal) },
      { key: 'Final Net Profit', value: formatINR(admission.netProfit) },
    ]);

    y -= 8;
    drawTerms(page, ctx, y, terms.admissionSlip);

    drawFooter(
      page,
      ctx,
      `Consultant: ${admission.consultant.name}`,
      `Generated: ${format(new Date(), 'PPP p')}`
    );
  }

  return ctx.doc.save();
}

export async function generateFeeReceiptPdf(admission: AdmissionPdfData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const terms = await getPdfTerms();
  const page = ctx.doc.addPage([595.28, 841.89]);
  drawHeader(page, ctx, 'Fee Receipt', `Admission #${admission.id}`);
  let y = 730;

  y = drawSectionTitle(page, ctx, y, 'Receipt Details');
  y = drawKeyValueRows(page, ctx, y, [
    { key: 'Receipt Date', value: format(new Date(), 'PPP') },
    { key: 'Student Name', value: textOrDash(admission.studentName) },
    { key: 'University', value: admission.university.name },
    { key: 'Course', value: admission.course.name },
    { key: 'Session', value: textOrDash(admission.admissionSession) },
    { key: 'Amount Received', value: formatINR(admission.amountReceived) },
    {
      key: 'Pending vs Display Fee',
      value: formatINR(Math.max(0, admission.displayFee - admission.amountReceived)),
    },
  ]);

  y -= 8;
  y = drawSectionTitle(page, ctx, y, 'Exact Fee Breakdown');
  y = drawKeyValueRows(page, ctx, y, [
    { key: 'University Fee', value: formatINR(admission.universityFee) },
    { key: 'Consultancy Gross Profit', value: formatINR(admission.consultancyProfit) },
    { key: 'Agent Commission', value: formatINR(admission.agentCommissionAmount) },
    { key: 'Net Profit', value: formatINR(admission.netProfit) },
  ]);

  drawTerms(page, ctx, y - 8, terms.feeReceipt);
  drawFooter(page, ctx, `Consultant: ${admission.consultant.name}`);

  return ctx.doc.save();
}

export async function generateUniversityPaymentSlipPdf(
  payment: UniversityPaymentPdfData
): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const terms = await getPdfTerms();
  const page = ctx.doc.addPage([595.28, 841.89]);
  drawHeader(page, ctx, 'University Payment Slip', `Payment #${payment.id}`);
  let y = 730;

  y = drawSectionTitle(page, ctx, y, 'Admission');
  y = drawKeyValueRows(page, ctx, y, [
    { key: 'Admission ID', value: payment.ledger.admission.id },
    { key: 'Student Name', value: payment.ledger.admission.studentName },
    { key: 'University', value: payment.ledger.admission.university.name },
    { key: 'Course', value: payment.ledger.admission.course.name },
  ]);

  y -= 8;
  y = drawSectionTitle(page, ctx, y, 'Payment');
  y = drawKeyValueRows(page, ctx, y, [
    { key: 'Amount', value: formatINR(payment.amount) },
    { key: 'Paid At', value: format(payment.paidAt, 'PPP p') },
    { key: 'Method', value: payment.method.replaceAll('_', ' ') },
    { key: 'Reference', value: textOrDash(payment.reference) },
    { key: 'Notes', value: textOrDash(payment.notes) },
  ]);

  drawTerms(page, ctx, y - 8, terms.universityPayment);
  drawFooter(page, ctx, `Consultant: ${payment.ledger.admission.consultant.name}`);

  return ctx.doc.save();
}

export async function generateAgentPaymentSlipPdf(
  payment: AgentPayoutPdfData
): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const terms = await getPdfTerms();
  const page = ctx.doc.addPage([595.28, 841.89]);
  drawHeader(page, ctx, 'Agent Payout Slip', `Payout #${payment.id}`);
  let y = 730;

  y = drawSectionTitle(page, ctx, y, 'Admission & Agent');
  y = drawKeyValueRows(page, ctx, y, [
    { key: 'Admission ID', value: payment.ledger.admission.id },
    { key: 'Student Name', value: payment.ledger.admission.studentName },
    { key: 'Course', value: payment.ledger.admission.course.name },
    { key: 'Agent', value: `${payment.ledger.agent.name} (${payment.ledger.agent.userId})` },
  ]);

  y -= 8;
  y = drawSectionTitle(page, ctx, y, 'Payout');
  y = drawKeyValueRows(page, ctx, y, [
    { key: 'Amount', value: formatINR(payment.amount) },
    { key: 'Paid At', value: format(payment.paidAt, 'PPP p') },
    { key: 'Method', value: payment.method.replaceAll('_', ' ') },
    { key: 'Reference', value: textOrDash(payment.reference) },
    { key: 'Notes', value: textOrDash(payment.notes) },
  ]);

  drawTerms(page, ctx, y - 8, terms.agentPayout);
  drawFooter(page, ctx, `Consultant: ${payment.ledger.admission.consultant.name}`);

  return ctx.doc.save();
}

export async function generateReportPdf(input: {
  title: string;
  subtitle: string;
  summary: Array<{ key: string; value: string }>;
}): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const terms = await getPdfTerms();
  const page = ctx.doc.addPage([595.28, 841.89]);
  drawHeader(page, ctx, input.title, input.subtitle);
  let y = 730;

  y = drawSectionTitle(page, ctx, y, 'Summary');
  drawKeyValueRows(page, ctx, y, input.summary);
  drawTerms(page, ctx, 540, terms.report);
  drawFooter(page, ctx, 'EduConnect internal report');

  return ctx.doc.save();
}
