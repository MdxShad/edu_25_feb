'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  generateAdmissionSummaryAction,
  generatePendingReminderAction,
  generatePosterCaptionAction,
} from './actions';

type AdmissionOption = {
  id: string;
  studentName: string;
  universityName: string;
  courseName: string;
};

export function AiToolsClient({ admissions }: { admissions: AdmissionOption[] }) {
  const [selectedAdmissionId, setSelectedAdmissionId] = React.useState(admissions[0]?.id ?? '');
  const [summaryText, setSummaryText] = React.useState('');
  const [reminderText, setReminderText] = React.useState('');
  const [captionTopic, setCaptionTopic] = React.useState('');
  const [captionText, setCaptionText] = React.useState('');
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function copy(text: string) {
    if (!text) return;
    void navigator.clipboard.writeText(text);
  }

  function generateSummary() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateAdmissionSummaryAction({ admissionId: selectedAdmissionId });
        setSummaryText(result.text);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate summary');
      }
    });
  }

  function generateReminder() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generatePendingReminderAction({ maxRows: 5 });
        setReminderText(result.text);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate reminder');
      }
    });
  }

  function generateCaption() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generatePosterCaptionAction({ topic: captionTopic });
        setCaptionText(result.text);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate caption');
      }
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Admission Summary Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Admission</Label>
            <Select
              value={selectedAdmissionId}
              onChange={(e) => setSelectedAdmissionId(e.target.value)}
            >
              {admissions.map((admission) => (
                <option key={admission.id} value={admission.id}>
                  {admission.studentName} - {admission.universityName} - {admission.courseName}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={generateSummary}
              disabled={pending || !selectedAdmissionId}
            >
              Generate
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => copy(summaryText)}
              disabled={!summaryText}
            >
              Copy
            </Button>
          </div>
          <Textarea
            rows={8}
            value={summaryText}
            readOnly
            placeholder="AI summary will appear here..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Payment WhatsApp Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button type="button" onClick={generateReminder} disabled={pending}>
              Generate
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => copy(reminderText)}
              disabled={!reminderText}
            >
              Copy
            </Button>
          </div>
          <Textarea
            rows={8}
            value={reminderText}
            readOnly
            placeholder="Reminder message will appear here..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Poster Caption Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Topic</Label>
            <Input
              value={captionTopic}
              onChange={(e) => setCaptionTopic(e.target.value)}
              placeholder="MBA admissions, scholarship, intake..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={generateCaption}
              disabled={pending || captionTopic.trim().length < 3}
            >
              Generate
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => copy(captionText)}
              disabled={!captionText}
            >
              Copy
            </Button>
          </div>
          <Textarea
            rows={6}
            value={captionText}
            readOnly
            placeholder="Caption text will appear here..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
