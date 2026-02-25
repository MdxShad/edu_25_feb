import test from 'node:test';
import assert from 'node:assert/strict';
import { CommissionType } from '@prisma/client';
import { calculateAdmissionFinancials } from '@/lib/calculations';

test('percentage commission uses consultancy profit', () => {
  const result = calculateAdmissionFinancials({
    amountReceived: 100000,
    universityFee: 70000,
    agentCommission: { type: CommissionType.PERCENT, value: 20 },
    agentExpensesTotal: 1000,
    consultancyExpensesTotal: 2000,
  });

  assert.equal(result.consultancyProfit, 30000);
  assert.equal(result.agentCommissionAmount, 6000);
  assert.equal(result.netProfit, 21000);
});

test('flat commission applies fixed value', () => {
  const result = calculateAdmissionFinancials({
    amountReceived: 90000,
    universityFee: 60000,
    agentCommission: { type: CommissionType.FLAT, value: 5000 },
    agentExpensesTotal: 0,
    consultancyExpensesTotal: 0,
  });

  assert.equal(result.consultancyProfit, 30000);
  assert.equal(result.agentCommissionAmount, 5000);
  assert.equal(result.netProfit, 25000);
});

test('one-time commission applies fixed value', () => {
  const result = calculateAdmissionFinancials({
    amountReceived: 90000,
    universityFee: 60000,
    agentCommission: { type: CommissionType.ONE_TIME, value: 7000 },
    agentExpensesTotal: 2000,
    consultancyExpensesTotal: 1000,
  });

  assert.equal(result.agentCommissionAmount, 7000);
  assert.equal(result.netProfit, 20000);
});

test('no commission keeps agent commission amount at zero', () => {
  const result = calculateAdmissionFinancials({
    amountReceived: 50000,
    universityFee: 40000,
    agentCommission: { type: 'NONE' },
    agentExpensesTotal: 2000,
    consultancyExpensesTotal: 1000,
  });

  assert.equal(result.agentCommissionAmount, 0);
  assert.equal(result.netProfit, 7000);
});
