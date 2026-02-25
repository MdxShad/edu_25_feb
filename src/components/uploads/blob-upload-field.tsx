'use client';

import * as React from 'react';
import { upload } from '@vercel/blob/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type UploadedFile = {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
};

function safePath(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export function BlobUploadField(props: {
  id: string;
  label: string;
  helpText?: string;
  accept?: string;
  multiple?: boolean;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);

  async function onPickFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const incoming = Array.from(files);
      const uploaded: UploadedFile[] = [];

      for (const file of incoming) {
        const pathname = `educonnect/${Date.now()}-${safePath(file.name)}`;
        const result = await upload(pathname, file, {
          access: 'public',
          handleUploadUrl: '/api/uploads',
          multipart: true,
          onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
        });
        uploaded.push({
          url: result.url,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        });
      }

      if (props.multiple) {
        props.onChange([...props.value, ...uploaded]);
      } else {
        props.onChange(uploaded.slice(0, 1));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  function removeByIndex(index: number) {
    props.onChange(props.value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <label id={`${props.id}-label`} htmlFor={props.id} className="text-sm font-medium">
        {props.label}
      </label>
      {props.helpText ? (
        <div id={`${props.id}-help`} className="text-xs text-zinc-600">
          {props.helpText}
        </div>
      ) : null}
      <Input
        id={props.id}
        type="file"
        multiple={props.multiple}
        accept={props.accept}
        onChange={onPickFiles}
        disabled={uploading}
        aria-labelledby={`${props.id}-label`}
        aria-describedby={props.helpText ? `${props.id}-help` : undefined}
      />
      {uploading ? (
        <div role="status" aria-live="polite" className="text-xs text-zinc-600">
          Uploading... {progress}%
        </div>
      ) : null}
      {error ? (
        <div role="alert" aria-live="assertive" className="text-xs text-red-700">
          {error}
        </div>
      ) : null}
      {props.value.length > 0 ? (
        <div className="space-y-1 rounded-md border border-zinc-200 p-2">
          {props.value.map((file, index) => (
            <div
              key={`${file.url}-${index}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <a href={file.url} target="_blank" rel="noreferrer" className="truncate underline">
                {file.fileName || file.url}
              </a>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeByIndex(index)}
                aria-label={`Remove ${file.fileName || 'uploaded file'}`}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
