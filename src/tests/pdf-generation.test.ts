import assert from 'node:assert/strict';
import test from 'node:test';
import { generateFeeReceiptPdf, generateReportPdf } from '@/lib/pdf/documents';

function hasPdfHeader(bytes: Uint8Array): boolean {
  return Buffer.from(bytes.slice(0, 4)).toString() === '%PDF';
}

test('generates report PDF bytes', async () => {
  const bytes = await generateReportPdf({
    title: 'Report',
    subtitle: 'Jan',
    summary: [
      { key: 'Admissions', value: '10' },
      { key: 'Income', value: '1000' },
    ],
  });

  assert.equal(hasPdfHeader(bytes), true);
  assert.ok(bytes.length > 500);
});

test('generates fee receipt PDF bytes', async () => {
  const bytes = await generateFeeReceiptPdf({
    id: 'adm-test',
    createdAt: new Date('2026-02-24T00:00:00Z'),
    studentName: 'Student A',
    fatherName: 'Father A',
    mobile: '9999999999',
    altMobile: null,
    address: 'Address',
    source: 'DIRECT',
    amountReceived: 50000,
    universityFee: 30000,
    displayFee: 60000,
    consultancyProfit: 20000,
    agentCommissionAmount: 0,
    agentExpensesTotal: 0,
    consultancyExpensesTotal: 1000,
    netProfit: 19000,
    consultant: { name: 'Consultant' },
    university: { name: 'University' },
    course: { name: 'Course' },
    admissionSession: '2026-27',
    agent: null,
  });

  assert.equal(hasPdfHeader(bytes), true);
  assert.ok(bytes.length > 500);
});
