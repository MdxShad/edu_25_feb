import { ensureEnv } from '@/lib/env';
import { prisma } from '@/lib/db';

export const PDF_TERM_SETTING_KEYS = {
  admissionSlip: 'pdf_terms_admission_slip',
  feeReceipt: 'pdf_terms_fee_receipt',
  universityPayment: 'pdf_terms_university_payment',
  agentPayout: 'pdf_terms_agent_payout',
  report: 'pdf_terms_report',
} as const;

export type PdfTermsMap = {
  admissionSlip: string[];
  feeReceipt: string[];
  universityPayment: string[];
  agentPayout: string[];
  report: string[];
};

type PdfTermSection = keyof PdfTermsMap;

const defaultTerms: PdfTermsMap = {
  admissionSlip: [
    'University payable and schedule are based on enrolled course policy.',
    'All payment references should be retained for reconciliation and audits.',
    'Any corrections require authorized CRM change-history entry.',
  ],
  feeReceipt: [
    'Receipt confirms payment collected by consultancy.',
    'University settlement is managed as per payable ledger.',
  ],
  universityPayment: [
    'Attach transfer proof to CRM for reconciliations.',
    'Reference number should match banking channel transaction.',
  ],
  agentPayout: [
    'Payout is linked to approved commission ledger entry.',
    'Any deduction requires explicit documentation in CRM history.',
  ],
  report: [
    'This report is generated from locked admissions and ledger transactions.',
    'Use CSV export for row-level reconciliation workflows.',
  ],
};

const keyToSection = {
  [PDF_TERM_SETTING_KEYS.admissionSlip]: 'admissionSlip',
  [PDF_TERM_SETTING_KEYS.feeReceipt]: 'feeReceipt',
  [PDF_TERM_SETTING_KEYS.universityPayment]: 'universityPayment',
  [PDF_TERM_SETTING_KEYS.agentPayout]: 'agentPayout',
  [PDF_TERM_SETTING_KEYS.report]: 'report',
} as const satisfies Record<string, PdfTermSection>;

export function parseTerms(raw: string | undefined | null): string[] | null {
  if (!raw) return null;
  const decoded = raw.replace(/\\n/g, '\n');
  const lines = decoded
    .split(/\r?\n|\|/g)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

export function serializeTerms(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

async function getDbTerms(): Promise<Partial<PdfTermsMap>> {
  if (process.env.NODE_ENV === 'test' || process.argv.includes('--test')) {
    return {};
  }

  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: Object.values(PDF_TERM_SETTING_KEYS) } },
      select: { key: true, value: true },
    });
    const result: Partial<PdfTermsMap> = {};
    for (const row of rows) {
      if (!(row.key in keyToSection)) continue;
      const section = keyToSection[row.key as keyof typeof keyToSection];
      if (!section) continue;
      const parsed = parseTerms(row.value);
      if (parsed) {
        result[section] = parsed;
      }
    }
    return result;
  } catch {
    // Fallback for local tests and early bootstrap without DB schema migration.
    return {};
  }
}

export async function getPdfTerms(): Promise<PdfTermsMap> {
  const env = ensureEnv();
  const dbTerms = await getDbTerms();

  return {
    admissionSlip:
      dbTerms.admissionSlip ??
      parseTerms(env.PDF_TERMS_ADMISSION_SLIP) ??
      defaultTerms.admissionSlip,
    feeReceipt:
      dbTerms.feeReceipt ?? parseTerms(env.PDF_TERMS_FEE_RECEIPT) ?? defaultTerms.feeReceipt,
    universityPayment:
      dbTerms.universityPayment ??
      parseTerms(env.PDF_TERMS_UNIVERSITY_PAYMENT) ??
      defaultTerms.universityPayment,
    agentPayout:
      dbTerms.agentPayout ?? parseTerms(env.PDF_TERMS_AGENT_PAYOUT) ?? defaultTerms.agentPayout,
    report: dbTerms.report ?? parseTerms(env.PDF_TERMS_REPORT) ?? defaultTerms.report,
  };
}

export function getDefaultPdfTerms(): PdfTermsMap {
  return defaultTerms;
}
