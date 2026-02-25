import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getBrandSettings } from '@/lib/branding';

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
  branding: {
    name: string;
    phone: string;
    email: string;
    address: string;
    logoUrl: string;
  };
  logoImage: any | null;
};

function detectImageType(buffer: Uint8Array): 'png' | 'jpg' | null {
  if (buffer.length >= 8) {
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;
    if (isPng) return 'png';
  }
  if (buffer.length >= 3) {
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (isJpeg) return 'jpg';
  }
  return null;
}

async function tryEmbedLogo(doc: any, logoUrl: string): Promise<any | null> {
  if (!logoUrl) return null;
  try {
    const response = await fetch(logoUrl, { cache: 'no-store' });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const type = detectImageType(bytes);
    if (type === 'png') return doc.embedPng(bytes);
    if (type === 'jpg') return doc.embedJpg(bytes);
    return null;
  } catch {
    return null;
  }
}

export async function createPdfContext(): Promise<PdfContext> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const branding = await getBrandSettings();
  const logoImage = await tryEmbedLogo(doc, branding.logoUrl);

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
    branding,
    logoImage,
  };
}

function safePdfText(value: string): string {
  return value
    .replaceAll('₹', 'INR ')
    .replaceAll('•', '-')
    .replace(/[^\x20-\x7E]/g, '-');
}

export function drawHeader(page: any, ctx: PdfContext, title: string, subtitle?: string) {
  const { height, width } = page.getSize();
  const brandName = ctx.branding.name || 'EduConnect CRM';

  page.drawText(safePdfText(brandName), {
    x: ctx.theme.margin,
    y: height - ctx.theme.margin,
    size: 16,
    font: ctx.fontBold,
    color: ctx.theme.black,
  });

  if (ctx.logoImage) {
    const maxWidth = 96;
    const maxHeight = 34;
    const scale = Math.min(maxWidth / ctx.logoImage.width, maxHeight / ctx.logoImage.height, 1);
    const logoWidth = ctx.logoImage.width * scale;
    const logoHeight = ctx.logoImage.height * scale;
    page.drawImage(ctx.logoImage, {
      x: width - ctx.theme.margin - logoWidth,
      y: height - ctx.theme.margin - logoHeight + 4,
      width: logoWidth,
      height: logoHeight,
    });
  }

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

  const contactParts = [ctx.branding.phone, ctx.branding.email, ctx.branding.address].filter(Boolean);
  if (contactParts.length > 0) {
    page.drawText(safePdfText(contactParts.join(' | ')), {
      x: ctx.theme.margin,
      y: ctx.theme.margin - 4,
      size: 8,
      font: ctx.font,
      color: ctx.theme.muted,
    });
  }

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
