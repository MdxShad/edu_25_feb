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
import { getBrandSettings } from '@/lib/branding';
import { getMonthClosedUpTo } from '@/lib/month-close';
import { closeMonthAction, saveBrandSettingsAction, savePdfTermsAction } from './actions';
import { BrandSettingsForm } from './brand-settings-form';

function toTextareaValue(rawValue: string | undefined, fallback: string[]): string {
  return serializeTerms(parseTerms(rawValue) ?? fallback);
}

export default async function AdminSettingsPage() {
  await requireRole([Role.SUPER_ADMIN]);

  const defaults = getDefaultPdfTerms();
  const brand = await getBrandSettings();
  const monthClosedUpTo = await getMonthClosedUpTo();
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
          <CardTitle>Brand Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandSettingsForm
            defaults={{
              name: brand.name,
              phone: brand.phone,
              email: brand.email,
              address: brand.address,
              logoUrl: brand.logoUrl,
            }}
            action={saveBrandSettingsAction}
          />
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Monthly Closing</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={closeMonthAction} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="month">Close month up to</Label>
              <input
                id="month"
                name="month"
                type="month"
                className="h-9 rounded-md border border-zinc-300 px-3 text-sm"
              />
            </div>
            <Button type="submit" variant="secondary">Close Month</Button>
            <div className="text-xs text-zinc-600">
              Current close boundary:{' '}
              {monthClosedUpTo ? monthClosedUpTo.toLocaleString() : 'Not closed yet'}
            </div>
          </form>
        </CardContent>
      </Card>

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

