import { NextRequest } from 'next/server';
import { requireAuth } from '@/core/services/auth-context.service';
import { CourseModel } from '@/core/domain/course.model';
import { ModuleModel } from '@/core/domain/module.model';
import { LessonModel } from '@/core/domain/lesson.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { LessonProgressModel } from '@/core/domain/lesson-progress.model';
import { AccessService } from '@/core/services/access.service';
import {
  IStudentCurriculumDTO,
  IStudentLessonCurriculumDTO
} from '@/core/domain/domain-types';
import { apiSuccess, apiError } from '@/lib/api-response';
import { NotFoundError, AuthorizationError } from '@/lib/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await requireAuth();
    const { courseId } = await params;

    const course = await CourseModel.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course', courseId);
    }

    const enrollment = await EnrollmentModel.findOne({
      userId: user.id,
      courseId,
      status: 'active'
    });

    if (!enrollment) {
      throw new AuthorizationError('You are not enrolled in this course.');
    }

    const modules = await ModuleModel.find({ courseId: course._id }).sort({ order: 1 });
    const moduleIds = modules.map(m => m._id);
    const lessons = await LessonModel.find({ moduleId: { $in: moduleIds } }).sort({ order: 1 });

    const progressRecords = await LessonProgressModel.find({
      enrollmentId: enrollment._id
    });
    const progressMap = new Map(progressRecords.map(p => [p.lessonId.toString(), p]));

    const now = new Date();
    const lessonsByModule = new Map<string, IStudentLessonCurriculumDTO[]>();

    for (const l of lessons) {
      const modIdStr = l.moduleId.toString();
      if (!lessonsByModule.has(modIdStr)) {
        lessonsByModule.set(modIdStr, []);
      }

      const parentModule = modules.find(m => m._id.toString() === modIdStr);
      const moduleDrip = parentModule?.dripDaysAfterEnrollment || 0;
      const effectiveDripDays = typeof l.unlockOverrideDays === 'number'
        ? l.unlockOverrideDays
        : moduleDrip;

      const accessEval = await AccessService.canAccessLesson(user.id, l._id.toString(), now);
      const prog = progressMap.get(l._id.toString());

      // Content Protection: Never expose private videoStorageKey, pdfStorageKey, bodyMarkdown, or resources if locked
      const isUnlocked = accessEval.granted;

      const item: IStudentLessonCurriculumDTO = {
        id: l._id.toString(),
        courseId: l.courseId.toString(),
        moduleId: l.moduleId.toString(),
        title: l.title,
        order: l.order,
        contentType: l.contentType,
        isPreviewFree: l.isPreviewFree,
        effectiveDripDays,
        isUnlocked,
        unlocksAt: accessEval.unlocksAt ? accessEval.unlocksAt.toISOString() : undefined,
        daysRemaining: accessEval.daysRemaining,
        progressStatus: prog?.status || 'not_started',
        isCompleted: prog?.isCompleted || false,
        // Only include contentData and resources if unlocked or preview
        contentData: isUnlocked ? l.contentData : undefined,
        resources: isUnlocked
          ? (l.resources || []).map(r => ({
              title: r.title,
              storageKey: r.storageKey,
              fileSizeBytes: r.fileSizeBytes,
              mimeType: r.mimeType,
              downloadAllowed: r.downloadAllowed
            }))
          : undefined
      };

      lessonsByModule.get(modIdStr)!.push(item);
    }

    const enrichedModules = modules.map(m => ({
      ...m.toSafeDTO(),
      lessons: lessonsByModule.get(m._id.toString()) || []
    }));

    const responseData: IStudentCurriculumDTO = {
      course: course.toSafeDTO(),
      enrollment: enrollment.toSafeDTO(),
      modules: enrichedModules
    };

    return apiSuccess(responseData);
  } catch (error) {
    return apiError(error);
  }
}
