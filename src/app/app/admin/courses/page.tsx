import { Role } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CourseManager } from './course-manager';

export default async function CoursesPage() {
  await requireRole([Role.SUPER_ADMIN]);

  const [universities, courses] = await Promise.all([
    prisma.university.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.course.findMany({
      include: { university: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const mappedCourses = courses.map((course) => ({
    id: course.id,
    universityId: course.universityId,
    universityName: course.university.name,
    name: course.name,
    duration: course.duration,
    type: course.type,
    universityFee: course.universityFee,
    displayFee: course.displayFee,
    session: course.session,
    notes: course.notes,
  }));

  return <CourseManager universities={universities} courses={mappedCourses} />;
}
