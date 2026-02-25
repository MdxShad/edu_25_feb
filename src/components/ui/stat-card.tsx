import { Card, CardContent } from './card';

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
        {hint ? <div className="text-xs text-zinc-500">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
