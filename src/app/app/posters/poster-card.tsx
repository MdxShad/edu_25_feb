'use client';

import * as React from 'react';
import NextImage from 'next/image';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type PosterItem = {
  id: string;
  title: string;
  imageUrl: string;
  qrTargetPath: string;
  tags: unknown;
  university: { name: string } | null;
  course: { name: string } | null;
};

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function tagsToText(tags: unknown): string {
  if (!Array.isArray(tags)) return '';
  return tags.map((item) => String(item)).join(' | ');
}

export function BrandedPosterCard(props: {
  poster: PosterItem;
  promoterName: string;
  promoterMobile: string;
  consultancyName: string;
  consultancyPhone?: string;
  refCode: string;
  siteUrl: string;
}) {
  const [renderedUrl, setRenderedUrl] = React.useState<string | null>(null);
  const [renderError, setRenderError] = React.useState<string | null>(null);
  const [rendering, setRendering] = React.useState(true);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const refUrl = React.useMemo(() => {
    const base = new URL(props.siteUrl);
    const targetUrl = new URL(props.poster.qrTargetPath || '/contact', base);
    targetUrl.searchParams.set('ref', props.refCode);
    return targetUrl.toString();
  }, [props.poster.qrTargetPath, props.refCode, props.siteUrl]);

  React.useEffect(() => {
    let cancelled = false;
    async function renderPoster() {
      setRendering(true);
      setRenderError(null);
      try {
        const [posterImage, qrDataUrl] = await Promise.all([
          loadImage(props.poster.imageUrl),
          QRCode.toDataURL(refUrl, { width: 280, margin: 1 }),
        ]);
        const qrImage = await loadImage(qrDataUrl);

        const scale = posterImage.naturalWidth > 1280 ? 1280 / posterImage.naturalWidth : 1;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.round(posterImage.naturalWidth * scale);
        canvas.height = Math.round(posterImage.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(posterImage, 0, 0, canvas.width, canvas.height);

        const gradientHeight = Math.round(canvas.height * 0.34);
        const gradient = ctx.createLinearGradient(
          0,
          canvas.height - gradientHeight,
          0,
          canvas.height
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.82)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

        const pad = Math.round(canvas.width * 0.03);
        const logoW = Math.round(canvas.width * 0.26);
        const logoH = Math.round(canvas.height * 0.08);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillRect(pad, pad, logoW, logoH);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.strokeRect(pad, pad, logoW, logoH);
        ctx.fillStyle = '#111827';
        ctx.font = `${Math.max(16, Math.round(canvas.width * 0.021))}px sans-serif`;
        ctx.fillText(props.consultancyName, pad + 10, pad + logoH * 0.48);
        if (props.consultancyPhone) {
          ctx.fillStyle = '#374151';
          ctx.font = `${Math.max(11, Math.round(canvas.width * 0.014))}px sans-serif`;
          ctx.fillText(`Ph: ${props.consultancyPhone}`, pad + 10, pad + logoH * 0.82);
        }

        const qrSize = Math.round(canvas.width * 0.18);
        const qrX = canvas.width - qrSize - pad;
        const qrY = canvas.height - qrSize - pad;
        ctx.fillStyle = 'white';
        ctx.fillRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

        ctx.fillStyle = 'white';
        ctx.font = `${Math.max(18, Math.round(canvas.width * 0.031))}px sans-serif`;
        const textStartY = canvas.height - pad - qrSize + 12;
        ctx.fillText(props.promoterName, pad, textStartY);
        ctx.font = `${Math.max(14, Math.round(canvas.width * 0.024))}px sans-serif`;
        ctx.fillText(`Call/WhatsApp: ${props.promoterMobile || '-'}`, pad, textStartY + 32);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `${Math.max(12, Math.round(canvas.width * 0.018))}px sans-serif`;
        ctx.fillText('Scan QR for enquiry form', qrX - 10, qrY - 12);

        const output = canvas.toDataURL('image/png');
        if (!cancelled) {
          setRenderedUrl(output);
        }
      } catch (e) {
        if (!cancelled) {
          setRenderError(e instanceof Error ? e.message : 'Failed to render poster');
        }
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    }

    void renderPoster();
    return () => {
      cancelled = true;
    };
  }, [
    props.consultancyName,
    props.poster.imageUrl,
    props.promoterMobile,
    props.promoterName,
    refUrl,
  ]);

  async function downloadPoster() {
    if (!renderedUrl) return;
    const link = document.createElement('a');
    link.href = renderedUrl;
    link.download = `${props.poster.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
    link.click();
  }

  async function sharePoster() {
    if (!renderedUrl) return;

    const posterMeta = [
      props.poster.university?.name ? `University: ${props.poster.university.name}` : null,
      props.poster.course?.name ? `Course: ${props.poster.course.name}` : null,
      tagsToText(props.poster.tags) ? `Tags: ${tagsToText(props.poster.tags)}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const shareText = `${props.poster.title}\n${props.consultancyName}\n${posterMeta ? `${posterMeta}\n` : ''}Call: ${props.promoterMobile}\n${refUrl}`;
    const fallbackWhatsApp = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    try {
      const response = await fetch(renderedUrl);
      const blob = await response.blob();
      const file = new File([blob], `${props.poster.id}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: props.poster.title,
          text: shareText,
          files: [file],
        });
        return;
      }
    } catch {
      // fall through to WhatsApp + download
    }

    window.open(fallbackWhatsApp, '_blank', 'noopener,noreferrer');
    await downloadPoster();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.poster.title}</CardTitle>
        <div className="text-xs text-zinc-500">
          {props.poster.university?.name ?? 'All universities'} •{' '}
          {props.poster.course?.name ?? 'All courses'}
        </div>
        {tagsToText(props.poster.tags) ? (
          <div className="text-xs text-zinc-600">{tagsToText(props.poster.tags)}</div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <canvas ref={canvasRef} className="hidden" />
        {rendering ? (
          <div className="aspect-[4/5] w-full animate-pulse rounded bg-zinc-100" />
        ) : renderError ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            {renderError}
          </div>
        ) : renderedUrl ? (
          <NextImage
            src={renderedUrl}
            alt={props.poster.title}
            width={1080}
            height={1350}
            unoptimized
            className="w-full rounded border border-zinc-200 object-cover"
          />
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            onClick={downloadPoster}
            disabled={!renderedUrl}
          >
            Download PNG
          </Button>
          <Button type="button" onClick={sharePoster} disabled={!renderedUrl}>
            Share / WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
