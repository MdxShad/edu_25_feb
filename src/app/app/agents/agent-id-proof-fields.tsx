'use client';

import * as React from 'react';
import { BlobUploadField, type UploadedFile } from '@/components/uploads/blob-upload-field';

export function AgentIdProofFields() {
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const file = files[0];

  return (
    <div className="md:col-span-2">
      <BlobUploadField
        id="agent-id-proof-upload"
        label="ID proof file (optional)"
        helpText="Upload image or PDF proof directly to storage."
        accept="image/*,application/pdf"
        value={files}
        onChange={(nextFiles) => setFiles(nextFiles.slice(0, 1))}
      />
      <input type="hidden" name="idProofFileUrl" value={file?.url ?? ''} />
      <input type="hidden" name="idProofFileName" value={file?.fileName ?? ''} />
      <input type="hidden" name="idProofFileMimeType" value={file?.mimeType ?? ''} />
      <input type="hidden" name="idProofFileSizeBytes" value={file?.sizeBytes ?? ''} />
    </div>
  );
}
