import { Role } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  PDF_TERM_SETTING_KEYS,
  getDefaultPdfTerms,
  parseTerms,
  serializeTerms,
} from '@/lib/pdf/terms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { savePdfTermsAction } from './actions';

function toTextareaValue(rawValue: string | undefined, fallback: string[]): string {
  return serializeTerms(parseTerms(rawValue) ?? fallback);
}

export default async function AdminSettingsPage() {
  await requireRole([Role.SUPER_ADMIN]);

  const defaults = getDefaultPdfTerms();
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: Object.values(PDF_TERM_SETTING_KEYS) } },
    select: { key: true, value: true },
  });
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Configure terms shown in generated PDFs. Enter one term per line.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PDF Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={savePdfTermsAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="admissionSlipTerms">Admission Slip Terms</Label>
              <Textarea
                id="admissionSlipTerms"
                name="admissionSlipTerms"
                rows={5}
                defaultValue={toTextareaValue(
                  byKey.get(PDF_TERM_SETTING_KEYS.admissionSlip),
                  defaults.admissionSlip
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feeReceiptTerms">Fee Receipt Terms</Label>
              <Textarea
                id="feeReceiptTerms"
                name="feeReceiptTerms"
                rows={4}
                defaultValue={toTextareaValue(
                  byKey.get(PDF_TERM_SETTING_KEYS.feeReceipt),
                  defaults.feeReceipt
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="universityPaymentTerms">University Payment Slip Terms</Label>
              <Textarea
                id="universityPaymentTerms"
                name="universityPaymentTerms"
                rows={4}
                defaultValue={toTextareaValue(
                  byKey.get(PDF_TERM_SETTING_KEYS.universityPayment),
                  defaults.universityPayment
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agentPayoutTerms">Agent Payout Slip Terms</Label>
              <Textarea
                id="agentPayoutTerms"
                name="agentPayoutTerms"
                rows={4}
                defaultValue={toTextareaValue(
                  byKey.get(PDF_TERM_SETTING_KEYS.agentPayout),
                  defaults.agentPayout
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportTerms">Report PDF Terms</Label>
              <Textarea
                id="reportTerms"
                name="reportTerms"
                rows={4}
                defaultValue={toTextareaValue(
                  byKey.get(PDF_TERM_SETTING_KEYS.report),
                  defaults.report
                )}
              />
            </div>

            <div>
              <Button type="submit">Save Settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

