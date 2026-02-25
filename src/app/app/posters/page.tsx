import { Role } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canAccess } from '@/lib/roles';
import { siteConfig } from '@/lib/site';
import { getBrandSettings } from '@/lib/branding';
import { PosterAdminManager } from './admin-manager';
import { BrandedPosterCard } from './poster-card';

function canViewPosters(user: { role: Role; permissions: unknown | null }) {
  return (
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    user.role === Role.AGENT ||
    (user.role === Role.STAFF && canAccess(user, 'postersManage'))
  );
}

export default async function PostersPage({
  searchParams,
}: {
  searchParams: { universityId?: string; courseId?: string };
}) {
  const user = await requireUser();
  if (!canViewPosters(user)) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const [universities, courses, me, brand] = await Promise.all([
    prisma.university.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.course.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, universityId: true, name: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        userId: true,
        name: true,
        mobile: true,
        role: true,
        parent: { select: { name: true } },
      },
    }),
    getBrandSettings(),
  ]);

  if (!me) return null;

  const where = {
    ...(user.role === Role.SUPER_ADMIN ? {} : { isActive: true }),
    ...(searchParams.universityId ? { universityId: searchParams.universityId } : {}),
    ...(searchParams.courseId ? { courseId: searchParams.courseId } : {}),
  };

  const posters = await prisma.poster.findMany({
    where,
    include: { university: true, course: true },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  });

  const fallbackName = me.role === Role.AGENT ? me.parent?.name || 'EduConnect' : me.name;
  const consultancyName = brand.name || fallbackName;
  const promoterMobile = me.mobile || '';
  const promoterName = me.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Marketing Posters</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Brand-ready posters with your details, QR lead link, download, and WhatsApp sharing.
        </p>
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-3"
      >
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            University
          </div>
          <select
            name="universityId"
            defaultValue={searchParams.universityId ?? ''}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
          >
            <option value="">All Universities</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Course
          </div>
          <select
            name="courseId"
            defaultValue={searchParams.courseId ?? ''}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="h-10 rounded-md bg-zinc-900 px-4 text-sm text-white">
            Apply
          </button>
        </div>
      </form>

      {user.role === Role.SUPER_ADMIN ? (
        <PosterAdminManager posters={posters} universities={universities} courses={courses} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {posters.length === 0 ? (
          <div className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            No posters found for selected filters.
          </div>
        ) : (
          posters.map((poster) => (
            <BrandedPosterCard
              key={poster.id}
              poster={poster}
              promoterName={promoterName}
              promoterMobile={promoterMobile}
              consultancyName={consultancyName}
              refCode={me.userId}
              siteUrl={siteConfig.url}
              consultancyPhone={brand.phone}
            />
          ))
        )}
      </div>
    </div>
  );
}
