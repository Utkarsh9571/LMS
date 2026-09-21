import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CourseService } from '@/core/services/course.service';
import { ICourseSafeDTO, ICurriculumDTO } from '@/core/domain/domain-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const revalidate = 0;

interface CoursePlayerProps {
  params: Promise<{ courseId: string }>;
}

export default async function StudentCoursePlayerPage({ params }: CoursePlayerProps) {
  const { courseId } = await params;

  let course: ICourseSafeDTO;
  let curriculum: ICurriculumDTO;

  try {
    course = await CourseService.getCourse(courseId);
    curriculum = await CourseService.getCurriculum(course.id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/courses" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              ← My Courses
            </Link>
            <span className="text-slate-400">•</span>
            <Badge variant="secondary" className="capitalize">
              {course.level}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{course.title}</h1>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Curriculum & Learning Modules</h2>
        {curriculum.modules.length === 0 ? (
          <p className="text-slate-500 italic text-sm">No modules published yet for this course.</p>
        ) : (
          <div className="space-y-4">
            {curriculum.modules.map((mod, idx) => (
              <Card key={mod.id}>
                <CardHeader className="p-4 bg-slate-50 dark:bg-slate-800/40">
                  <CardTitle className="text-base font-semibold">
                    Module {idx + 1}: {mod.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {mod.lessons.map((lesson) => (
                      <div key={lesson.id} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                            {lesson.contentType === 'video' ? '📹' : lesson.contentType === 'pdf' ? '📄' : '📝'}
                          </span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {lesson.title}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Available
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
