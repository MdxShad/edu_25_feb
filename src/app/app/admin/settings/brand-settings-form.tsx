'use client';

import * as React from 'react';
import { BlobUploadField, type UploadedFile } from '@/components/uploads/blob-upload-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type BrandDefaults = {
  name: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
};

export function BrandSettingsForm({
  defaults,
  action,
}: {
  defaults: BrandDefaults;
  action: (formData: FormData) => Promise<void>;
}) {
  const [logoFiles, setLogoFiles] = React.useState<UploadedFile[]>([]);
  const logoFile = logoFiles[0];

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="consultancyName">Consultancy name</Label>
        <Input id="consultancyName" name="consultancyName" defaultValue={defaults.name} required />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="consultancyPhone">Phone</Label>
          <Input id="consultancyPhone" name="consultancyPhone" defaultValue={defaults.phone} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="consultancyEmail">Email</Label>
          <Input
            id="consultancyEmail"
            name="consultancyEmail"
            type="email"
            defaultValue={defaults.email}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="consultancyAddress">Address</Label>
        <Textarea
          id="consultancyAddress"
          name="consultancyAddress"
          rows={3}
          defaultValue={defaults.address}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="consultancyLogoUrl">Logo URL (manual fallback)</Label>
        <Input
          id="consultancyLogoUrl"
          name="consultancyLogoUrl"
          defaultValue={defaults.logoUrl}
          placeholder="https://..."
        />
      </div>

      <BlobUploadField
        id="consultancy-logo-upload"
        label="Upload logo"
        helpText="Upload brand logo image (PNG/JPG/WebP)."
        accept="image/*"
        value={logoFiles}
        onChange={(files) => setLogoFiles(files.slice(0, 1))}
      />
      <input type="hidden" name="consultancyLogoFileUrl" value={logoFile?.url ?? ''} />

      <Button type="submit">Save Brand Settings</Button>
    </form>
  );
}
