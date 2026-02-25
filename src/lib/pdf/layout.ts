import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type PdfTheme = {
  margin: number;
  lineHeight: number;
  black: ReturnType<typeof rgb>;
  muted: ReturnType<typeof rgb>;
  border: ReturnType<typeof rgb>;
};

export type PdfContext = {
  doc: any;
  font: any;
  fontBold: any;
  theme: PdfTheme;
};

export async function createPdfContext(): Promise<PdfContext> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  return {
    doc,
    font,
    fontBold,
    theme: {
      margin: 44,
      lineHeight: 14,
      black: rgb(0, 0, 0),
      muted: rgb(0.38, 0.38, 0.38),
      border: rgb(0.85, 0.85, 0.85),
    },
  };
}

function safePdfText(value: string): string {
  return value
    .replaceAll('₹', 'INR ')
    .replaceAll('•', '-')
    .replace(/[^\x20-\x7E]/g, '-');
}

export function drawHeader(page: any, ctx: PdfContext, title: string, subtitle?: string) {
  const { height } = page.getSize();
  page.drawText('EduConnect CRM', {
    x: ctx.theme.margin,
    y: height - ctx.theme.margin,
    size: 16,
    font: ctx.fontBold,
    color: ctx.theme.black,
  });
  page.drawText(safePdfText(title), {
    x: ctx.theme.margin,
    y: height - ctx.theme.margin - 20,
    size: 12,
    font: ctx.fontBold,
    color: ctx.theme.black,
  });
  if (subtitle) {
    page.drawText(safePdfText(subtitle), {
      x: ctx.theme.margin,
      y: height - ctx.theme.margin - 34,
      size: 9,
      font: ctx.font,
      color: ctx.theme.muted,
    });
  }

  page.drawLine({
    start: { x: ctx.theme.margin, y: height - ctx.theme.margin - 42 },
    end: { x: page.getSize().width - ctx.theme.margin, y: height - ctx.theme.margin - 42 },
    thickness: 1,
    color: ctx.theme.border,
  });
}

export function drawFooter(page: any, ctx: PdfContext, left: string, right?: string) {
  page.drawLine({
    start: { x: ctx.theme.margin, y: ctx.theme.margin + 22 },
    end: { x: page.getSize().width - ctx.theme.margin, y: ctx.theme.margin + 22 },
    thickness: 1,
    color: ctx.theme.border,
  });

  page.drawText(safePdfText(left), {
    x: ctx.theme.margin,
    y: ctx.theme.margin + 8,
    size: 9,
    font: ctx.font,
    color: ctx.theme.muted,
  });

  if (right) {
    page.drawText(safePdfText(right), {
      x: page.getSize().width - ctx.theme.margin - 180,
      y: ctx.theme.margin + 8,
      size: 9,
      font: ctx.font,
      color: ctx.theme.muted,
    });
  }
}

export function drawSectionTitle(page: any, ctx: PdfContext, y: number, title: string): number {
  page.drawText(safePdfText(title), {
    x: ctx.theme.margin,
    y,
    size: 11,
    font: ctx.fontBold,
    color: ctx.theme.black,
  });
  return y - 16;
}

export function drawKeyValueRows(
  page: any,
  ctx: PdfContext,
  y: number,
  rows: Array<{ key: string; value: string }>
): number {
  let cursor = y;
  for (const row of rows) {
    page.drawText(safePdfText(row.key), {
      x: ctx.theme.margin,
      y: cursor,
      size: 10,
      font: ctx.font,
      color: ctx.theme.black,
    });
    page.drawText(safePdfText(row.value), {
      x: page.getSize().width - ctx.theme.margin - 200,
      y: cursor,
      size: 10,
      font: ctx.font,
      color: ctx.theme.black,
    });
    cursor -= ctx.theme.lineHeight;
  }
  return cursor;
}

export function drawTerms(page: any, ctx: PdfContext, y: number, lines: string[]): number {
  let cursor = drawSectionTitle(page, ctx, y, 'Terms & Conditions');
  for (const line of lines) {
    page.drawText(safePdfText(`- ${line}`), {
      x: ctx.theme.margin + 4,
      y: cursor,
      size: 9,
      font: ctx.font,
      color: ctx.theme.muted,
    });
    cursor -= 12;
  }
  return cursor;
}

export function textOrDash(value: string | null | undefined): string {
  if (!value) return '-';
  const trimmed = value.trim();
  return trimmed.length === 0 ? '-' : trimmed;
}
