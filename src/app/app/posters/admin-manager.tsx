'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { BlobUploadField, type UploadedFile } from '@/components/uploads/blob-upload-field';
import { useToast } from '@/components/ui/use-toast';
import { createPosterAction, deletePosterAction, setPosterStatusAction } from './actions';

type PosterRow = {
  id: string;
  title: string;
  isActive: boolean;
  qrTargetPath: string;
  imageUrl: string;
  tags: unknown;
  university: { name: string } | null;
  course: { name: string } | null;
};

type UniversityOption = { id: string; name: string };
type CourseOption = { id: string; universityId: string; name: string };

function normalizeTags(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function PosterAdminManager(props: {
  posters: PosterRow[];
  universities: UniversityOption[];
  courses: CourseOption[];
}) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState('');
  const [imageFiles, setImageFiles] = React.useState<UploadedFile[]>([]);
  const [universityId, setUniversityId] = React.useState('');
  const [courseId, setCourseId] = React.useState('');
  const [tags, setTags] = React.useState('');
  const [qrTargetPath, setQrTargetPath] = React.useState<'/' | '/contact'>('/contact');
  const [isActive, setIsActive] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const filteredCourses = React.useMemo(() => {
    if (!universityId) return props.courses;
    return props.courses.filter((course) => course.universityId === universityId);
  }, [props.courses, universityId]);

  function createPoster() {
    setError(null);
    startTransition(async () => {
      try {
        await createPosterAction({
          title,
          imageFile: imageFiles[0],
          universityId,
          courseId,
          tags: normalizeTags(tags),
          qrTargetPath,
          isActive,
        });

        setTitle('');
        setImageFiles([]);
        setUniversityId('');
        setCourseId('');
        setTags('');
        setQrTargetPath('/contact');
        setIsActive(true);
        toast({ title: 'Poster created', description: 'Poster is now available in the list.' });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to create poster.';
        setError(message);
        toast({ title: 'Create failed', description: message, variant: 'destructive' });
      }
    });
  }

  function onToggleStatus(posterId: string, nextValue: boolean) {
    startTransition(async () => {
      try {
        await setPosterStatusAction({ posterId, isActive: nextValue });
        toast({
          title: 'Poster updated',
          description: nextValue ? 'Poster activated.' : 'Poster deactivated.',
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to update poster status.';
        setError(message);
        toast({ title: 'Update failed', description: message, variant: 'destructive' });
      }
    });
  }

  function onDeletePoster(posterId: string) {
    startTransition(async () => {
      try {
        await deletePosterAction(posterId);
        toast({ title: 'Poster deleted', description: 'Poster was removed from inventory.' });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to delete poster.';
        setError(message);
        toast({ title: 'Delete failed', description: message, variant: 'destructive' });
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload Poster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <Alert variant="error">{error}</Alert> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="MBA Admission 2026"
              />
            </div>
            <div className="space-y-1">
              <Label>University</Label>
              <Select
                value={universityId}
                onChange={(e) => {
                  setUniversityId(e.target.value);
                  setCourseId('');
                }}
              >
                <option value="">All Universities</option>
                {props.universities.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Course</Label>
              <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">All Courses</option>
                {filteredCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>QR target</Label>
              <Select
                value={qrTargetPath}
                onChange={(e) => setQrTargetPath(e.target.value as '/' | '/contact')}
              >
                <option value="/contact">Contact page</option>
                <option value="/">Landing page</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tags (comma separated)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="mba, scholarship, feb-intake"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <BlobUploadField
                id="poster-image-upload"
                label="Poster image"
                helpText="Upload poster artwork PNG/JPG."
                accept="image/*"
                value={imageFiles}
                onChange={setImageFiles}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              Active immediately
            </label>
          </div>
          <Button
            type="button"
            onClick={createPoster}
            disabled={pending || imageFiles.length === 0 || title.trim().length < 2}
          >
            {pending ? 'Saving...' : 'Create Poster'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Poster Inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {props.posters.length === 0 ? (
            <div className="text-sm text-zinc-600">No posters uploaded yet.</div>
          ) : (
            props.posters.map((poster) => (
              <div
                key={poster.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 p-3"
              >
                <div>
                  <div className="text-sm font-medium">{poster.title}</div>
                  <div className="text-xs text-zinc-500">
                    {poster.university?.name ?? 'All universities'} •{' '}
                    {poster.course?.name ?? 'All courses'} • {poster.qrTargetPath}
                  </div>
                  {Array.isArray(poster.tags) && poster.tags.length > 0 ? (
                    <div className="mt-1 text-xs text-zinc-600">
                      {(poster.tags as string[]).join(', ')}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={poster.isActive ? 'secondary' : 'outline'}
                    onClick={() => onToggleStatus(poster.id, !poster.isActive)}
                  >
                    {poster.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeletePoster(poster.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
