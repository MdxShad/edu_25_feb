'use client';

import * as React from 'react';
import { BlobUploadField, type UploadedFile } from '@/components/uploads/blob-upload-field';
import { Input } from '@/components/ui/input';

type ProofUploadFieldProps = {
  id: string;
  inputName: string;
  fileNameInputName?: string;
  mimeTypeInputName?: string;
  sizeBytesInputName?: string;
  label?: string;
  helpText?: string;
  className?: string;
  allowManualUrl?: boolean;
};

export function ProofUploadField({
  id,
  inputName,
  fileNameInputName = 'proofFileName',
  mimeTypeInputName = 'proofMimeType',
  sizeBytesInputName = 'proofSizeBytes',
  label = 'Proof upload',
  helpText = 'Upload receipt, screenshot, or payment proof.',
  className,
  allowManualUrl = true,
}: ProofUploadFieldProps) {
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [manualUrl, setManualUrl] = React.useState('');

  const file = files[0];
  const proofUrl = file?.url || manualUrl.trim();

  function handleFileChange(nextFiles: UploadedFile[]) {
    setFiles(nextFiles);
    if (nextFiles.length > 0) {
      setManualUrl('');
    }
  }

  return (
    <div className={className}>
      <input type="hidden" name={inputName} value={proofUrl} />
      <input type="hidden" name={fileNameInputName} value={file?.fileName || ''} />
      <input type="hidden" name={mimeTypeInputName} value={file?.mimeType || ''} />
      <input type="hidden" name={sizeBytesInputName} value={file?.sizeBytes ?? ''} />
      <BlobUploadField
        id={id}
        label={label}
        helpText={helpText}
        accept="image/*,application/pdf"
        value={files}
        onChange={handleFileChange}
      />
      {allowManualUrl ? (
        <div className="mt-2 space-y-1">
          <label htmlFor={`${id}-manual`} className="text-xs text-zinc-600">
            Or paste proof URL
          </label>
          <Input
            id={`${id}-manual`}
            value={manualUrl}
            onChange={(event) => {
              const nextUrl = event.target.value;
              setManualUrl(nextUrl);
              if (nextUrl.trim().length > 0 && files.length > 0) {
                setFiles([]);
              }
            }}
            placeholder="https://..."
            className="h-8"
          />
        </div>
      ) : null}
    </div>
  );
}
