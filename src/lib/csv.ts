export type CsvRow = Record<string, string | number | boolean | null | undefined>;

function escapeCell(value: string): string {
  const needsQuotes = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCell).join(',')];

  for (const row of rows) {
    lines.push(
      headers
        .map((key) => {
          const value = row[key];
          if (value === null || value === undefined) return '';
          return escapeCell(String(value));
        })
        .join(',')
    );
  }

  return `${lines.join('\r\n')}\r\n`;
}
