import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toDateInput, type PeriodMode } from '@/lib/filters';

export function ReportFilterBar(props: {
  mode: PeriodMode;
  from: Date;
  to: Date;
  actionPath?: string;
}) {
  return (
    <form
      className="grid gap-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-5"
      method="get"
      action={props.actionPath}
    >
      <div>
        <Label htmlFor="report-mode" className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Mode
        </Label>
        <Select id="report-mode" name="mode" defaultValue={props.mode}>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="report-from" className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          From
        </Label>
        <Input id="report-from" type="date" name="from" defaultValue={toDateInput(props.from)} />
      </div>
      <div>
        <Label htmlFor="report-to" className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          To
        </Label>
        <Input id="report-to" type="date" name="to" defaultValue={toDateInput(props.to)} />
      </div>
      <div className="md:col-span-2 flex items-end gap-2">
        <Button type="submit">Apply</Button>
      </div>
    </form>
  );
}
