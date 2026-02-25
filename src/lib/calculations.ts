import { CommissionType } from '@prisma/client';
import { clampNonNegativeInt } from './money';

export type CommissionConfig = { type: 'NONE' } | { type: CommissionType; value: number };

export type AdmissionFinancialsInput = {
  amountReceived: number;
  universityFee: number;
  agentCommission: CommissionConfig;
  agentExpensesTotal: number;
  consultancyExpensesTotal: number;
};

export type AdmissionFinancials = {
  consultancyProfit: number;
  agentCommissionAmount: number;
  agentProfit: number;
  netProfit: number;
};

export function calculateAdmissionFinancials(input: AdmissionFinancialsInput): AdmissionFinancials {
  const amountReceived = clampNonNegativeInt(input.amountReceived);
  const universityFee = clampNonNegativeInt(input.universityFee);

  const consultancyProfit = clampNonNegativeInt(amountReceived - universityFee);

  let agentCommissionAmount = 0;
  if (input.agentCommission.type !== 'NONE') {
    const value = clampNonNegativeInt(input.agentCommission.value);
    if (input.agentCommission.type === CommissionType.PERCENT) {
      agentCommissionAmount = clampNonNegativeInt(Math.round((consultancyProfit * value) / 100));
    } else {
      // FLAT or ONE_TIME
      agentCommissionAmount = value;
    }
  }

  const agentExpensesTotal = clampNonNegativeInt(input.agentExpensesTotal);
  const consultancyExpensesTotal = clampNonNegativeInt(input.consultancyExpensesTotal);

  const agentProfit = clampNonNegativeInt(agentCommissionAmount - agentExpensesTotal);
  const netProfit = clampNonNegativeInt(
    consultancyProfit - agentCommissionAmount - agentExpensesTotal - consultancyExpensesTotal
  );

  return {
    consultancyProfit,
    agentCommissionAmount,
    agentProfit,
    netProfit,
  };
}
