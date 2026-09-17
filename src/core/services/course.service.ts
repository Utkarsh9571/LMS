import { connectToDatabase } from '@/lib/db';
import { CourseModel } from '@/core/domain/course.model';
import { ModuleModel } from '@/core/domain/module.model';
import { LessonModel } from '@/core/domain/lesson.model';
import {
  CourseLevel,
  CourseStatus,
  CourseDeliveryMode,
  LessonContentType,
  ILessonContentData,
  ILessonResource,
  ICourseSafeDTO,
  IModuleSafeDTO,
  ILessonSafeDTO,
  ICurriculumDTO
} from '@/core/domain/domain-types';
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface CreateCourseInput {
  slug: string;
  title: string;
  description: string;
  level: CourseLevel;
  thumbnailUrl: string;
  status?: CourseStatus;
  deliveryModes?: CourseDeliveryMode[];
  estimatedHours?: number;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string;
  level?: CourseLevel;
  thumbnailUrl?: string;
  status?: CourseStatus;
  deliveryModes?: CourseDeliveryMode[];
  estimatedHours?: number;
}

export interface CreateModuleInput {
  title: string;
  description?: string;
  order?: number;
  dripDaysAfterEnrollment?: number;
}

export interface UpdateModuleInput {
  title?: string;
  description?: string;
  dripDaysAfterEnrollment?: number;
}

export interface CreateLessonInput {
  title: string;
  order?: number;
  contentType: LessonContentType;
  contentData?: ILessonContentData;
  isPreviewFree?: boolean;
  unlockOverrideDays?: number | null;
  resources?: ILessonResource[];
}

export interface UpdateLessonInput {
  title?: string;
  contentType?: LessonContentType;
  contentData?: ILessonContentData;
  isPreviewFree?: boolean;
  unlockOverrideDays?: number | null;
  resources?: ILessonResource[];
}

export class CourseService {
  /**
   * Creates a canonical Course.
   * INVARIANT: Zero commercial or market-specific fields permitted.
   */
  static async createCourse(input: CreateCourseInput): Promise<ICourseSafeDTO> {
    const slug = input.slug?.trim().toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      throw new ValidationError('Course slug must consist of lowercase alphanumeric characters and hyphens.');
    }

    if (!input.title || input.title.trim().length < 3) {
      throw new ValidationError('Course title must be at least 3 characters.');
    }

    if (!input.description || input.description.trim().length < 5) {
      throw new ValidationError('Course description must be at least 5 characters.');
    }

    await connectToDatabase();

    const existing = await CourseModel.findOne({ slug });
    if (existing) {
      throw new ConflictError(`A course with slug '${slug}' already exists.`);
    }

    const course = await CourseModel.create({
      slug,
      title: input.title.trim(),
      description: input.description.trim(),
      level: input.level || 'beginner',
      thumbnailUrl: input.thumbnailUrl || '/images/default-course-thumbnail.png',
      status: input.status || 'draft',
      deliveryModes: input.deliveryModes || ['self_paced'],
      estimatedHours: typeof input.estimatedHours === 'number' ? input.estimatedHours : 0
    });

    logger.info('Canonical course created', { courseId: course._id.toString(), slug: course.slug });
    return course.toSafeDTO();
  }

  /**
   * Retrieves a course by ID or Slug.
   */
  static async getCourse(identifier: string): Promise<ICourseSafeDTO> {
    await connectToDatabase();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
    const course = isObjectId
      ? await CourseModel.findById(identifier)
      : await CourseModel.findOne({ slug: identifier.toLowerCase() });

    if (!course) {
      throw new NotFoundError('Course', identifier);
    }

    return course.toSafeDTO();
  }

  /**
   * Lists courses with optional status filter.
   */
  static async listCourses(filter?: { status?: CourseStatus }): Promise<ICourseSafeDTO[]> {
    await connectToDatabase();
    const query: Record<string, unknown> = {};
    if (filter?.status) {
      query.status = filter.status;
    }

    const courses = await CourseModel.find(query).sort({ createdAt: -1 });
    return courses.map(c => c.toSafeDTO());
  }

  /**
   * Updates an existing course.
   */
  static async updateCourse(courseId: string, input: UpdateCourseInput): Promise<ICourseSafeDTO> {
    await connectToDatabase();
    const course = await CourseModel.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course', courseId);
    }

    if (input.title !== undefined) course.title = input.title.trim();
    if (input.description !== undefined) course.description = input.description.trim();
    if (input.level !== undefined) course.level = input.level;
    if (input.thumbnailUrl !== undefined) course.thumbnailUrl = input.thumbnailUrl.trim();
    if (input.status !== undefined) course.status = input.status;
    if (input.deliveryModes !== undefined) course.deliveryModes = input.deliveryModes;
    if (input.estimatedHours !== undefined) course.estimatedHours = input.estimatedHours;

    await course.save();
    return course.toSafeDTO();
  }

  /**
   * Creates a Module belonging to a Course.
   */
  static async createModule(courseId: string, input: CreateModuleInput): Promise<IModuleSafeDTO> {
    if (!input.title || input.title.trim().length < 2) {
      throw new ValidationError('Module title must be at least 2 characters.');
    }

    const dripDays = typeof input.dripDaysAfterEnrollment === 'number' ? input.dripDaysAfterEnrollment : 0;
    if (!Number.isInteger(dripDays) || dripDays < 0) {
      throw new ValidationError('dripDaysAfterEnrollment must be a non-negative integer.');
    }

    await connectToDatabase();
    const course = await CourseModel.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course', courseId);
    }

    let order = input.order;
    if (typeof order !== 'number') {
      const maxModule = await ModuleModel.findOne({ courseId }).sort({ order: -1 });
      order = maxModule ? maxModule.order + 1 : 0;
    }

    const moduleDoc = await ModuleModel.create({
      courseId: course._id,
      title: input.title.trim(),
      description: input.description?.trim(),
      order,
      dripDaysAfterEnrollment: dripDays
    });

    return moduleDoc.toSafeDTO();
  }

  /**
   * Updates a Module with hierarchy integrity check.
   */
  static async updateModule(courseId: string, moduleId: string, input: UpdateModuleInput): Promise<IModuleSafeDTO> {
    await connectToDatabase();
    const moduleDoc = await ModuleModel.findOne({ _id: moduleId, courseId });
    if (!moduleDoc) {
      throw new NotFoundError('Module in Course', `${moduleId} (Course ${courseId})`);
    }

    if (input.title !== undefined) {
      if (input.title.trim().length < 2) throw new ValidationError('Module title must be at least 2 characters.');
      moduleDoc.title = input.title.trim();
    }
    if (input.description !== undefined) moduleDoc.description = input.description?.trim();
    if (input.dripDaysAfterEnrollment !== undefined) {
      if (!Number.isInteger(input.dripDaysAfterEnrollment) || input.dripDaysAfterEnrollment < 0) {
        throw new ValidationError('dripDaysAfterEnrollment must be a non-negative integer.');
      }
      moduleDoc.dripDaysAfterEnrollment = input.dripDaysAfterEnrollment;
    }

    await moduleDoc.save();
    return moduleDoc.toSafeDTO();
  }

  /**
   * Reorders modules deterministically within a course.
   */
  static async reorderModules(courseId: string, moduleIdsInOrder: string[]): Promise<IModuleSafeDTO[]> {
    if (!Array.isArray(moduleIdsInOrder) || moduleIdsInOrder.length === 0) {
      throw new ValidationError('moduleIdsInOrder must be a non-empty array of Module IDs.');
    }

    const uniqueIds = new Set(moduleIdsInOrder);
    if (uniqueIds.size !== moduleIdsInOrder.length) {
      throw new ValidationError('moduleIdsInOrder cannot contain duplicate IDs.');
    }

    await connectToDatabase();
    const existingModules = await ModuleModel.find({ courseId });
    const existingIds = new Set(existingModules.map(m => m._id.toString()));

    // Hierarchy check: ensure every module belongs to this course
    for (const id of moduleIdsInOrder) {
      if (!existingIds.has(id)) {
        throw new ValidationError(`Module '${id}' does not belong to Course '${courseId}'.`);
      }
    }

    // Update orders in batch
    const updates = moduleIdsInOrder.map((id, index) =>
      ModuleModel.updateOne({ _id: id, courseId }, { $set: { order: index } })
    );
    await Promise.all(updates);

    const reordered = await ModuleModel.find({ courseId }).sort({ order: 1 });
    return reordered.map(m => m.toSafeDTO());
  }

  /**
   * Creates a Lesson belonging to a Module and Course.
   * Validates strict cross-hierarchy relationship.
   */
  static async createLesson(courseId: string, moduleId: string, input: CreateLessonInput): Promise<ILessonSafeDTO> {
    if (!input.title || input.title.trim().length < 2) {
      throw new ValidationError('Lesson title must be at least 2 characters.');
    }

    if (input.unlockOverrideDays !== undefined && input.unlockOverrideDays !== null) {
      if (!Number.isInteger(input.unlockOverrideDays) || input.unlockOverrideDays < 0) {
        throw new ValidationError('unlockOverrideDays must be null or a non-negative integer.');
      }
    }

    await connectToDatabase();

    // Verify course exists
    const course = await CourseModel.findById(courseId);
    if (!course) throw new NotFoundError('Course', courseId);

    // Verify module belongs to this course
    const moduleDoc = await ModuleModel.findOne({ _id: moduleId, courseId });
    if (!moduleDoc) {
      throw new ValidationError(`Module '${moduleId}' does not belong to Course '${courseId}'.`);
    }

    let order = input.order;
    if (typeof order !== 'number') {
      const maxLesson = await LessonModel.findOne({ moduleId }).sort({ order: -1 });
      order = maxLesson ? maxLesson.order + 1 : 0;
    }

    const lesson = await LessonModel.create({
      courseId: course._id,
      moduleId: moduleDoc._id,
      title: input.title.trim(),
      order,
      contentType: input.contentType,
      contentData: input.contentData || {},
      isPreviewFree: Boolean(input.isPreviewFree),
      unlockOverrideDays: input.unlockOverrideDays ?? null,
      resources: input.resources || []
    });

    return lesson.toSafeDTO();
  }

  /**
   * Updates a Lesson with hierarchy verification.
   */
  static async updateLesson(
    courseId: string,
    moduleId: string,
    lessonId: string,
    input: UpdateLessonInput
  ): Promise<ILessonSafeDTO> {
    await connectToDatabase();

    const lesson = await LessonModel.findOne({ _id: lessonId, courseId, moduleId });
    if (!lesson) {
      throw new NotFoundError('Lesson', `${lessonId} under Module ${moduleId} in Course ${courseId}`);
    }

    if (input.title !== undefined) {
      if (input.title.trim().length < 2) throw new ValidationError('Lesson title must be at least 2 characters.');
      lesson.title = input.title.trim();
    }
    if (input.contentType !== undefined) lesson.contentType = input.contentType;
    if (input.contentData !== undefined) lesson.contentData = input.contentData;
    if (input.isPreviewFree !== undefined) lesson.isPreviewFree = input.isPreviewFree;
    if (input.unlockOverrideDays !== undefined) {
      if (input.unlockOverrideDays !== null && (!Number.isInteger(input.unlockOverrideDays) || input.unlockOverrideDays < 0)) {
        throw new ValidationError('unlockOverrideDays must be null or a non-negative integer.');
      }
      lesson.unlockOverrideDays = input.unlockOverrideDays;
    }
    if (input.resources !== undefined) lesson.resources = input.resources;

    await lesson.save();
    return lesson.toSafeDTO();
  }

  /**
   * Reorders lessons deterministically within a module.
   */
  static async reorderLessons(
    courseId: string,
    moduleId: string,
    lessonIdsInOrder: string[]
  ): Promise<ILessonSafeDTO[]> {
    if (!Array.isArray(lessonIdsInOrder) || lessonIdsInOrder.length === 0) {
      throw new ValidationError('lessonIdsInOrder must be a non-empty array of Lesson IDs.');
    }

    const uniqueIds = new Set(lessonIdsInOrder);
    if (uniqueIds.size !== lessonIdsInOrder.length) {
      throw new ValidationError('lessonIdsInOrder cannot contain duplicate IDs.');
    }

    await connectToDatabase();

    // Verify module belongs to course
    const moduleDoc = await ModuleModel.findOne({ _id: moduleId, courseId });
    if (!moduleDoc) {
      throw new ValidationError(`Module '${moduleId}' does not belong to Course '${courseId}'.`);
    }

    const existingLessons = await LessonModel.find({ courseId, moduleId });
    const existingIds = new Set(existingLessons.map(l => l._id.toString()));

    for (const id of lessonIdsInOrder) {
      if (!existingIds.has(id)) {
        throw new ValidationError(`Lesson '${id}' does not belong to Module '${moduleId}'.`);
      }
    }

    const updates = lessonIdsInOrder.map((id, index) =>
      LessonModel.updateOne({ _id: id, moduleId, courseId }, { $set: { order: index } })
    );
    await Promise.all(updates);

    const reordered = await LessonModel.find({ courseId, moduleId }).sort({ order: 1 });
    return reordered.map(l => l.toSafeDTO());
  }

  /**
   * Retrieves the full canonical curriculum tree for a course.
   * Resolves effective drip delay per lesson according to documented override rule:
   * Effective = lesson.unlockOverrideDays ?? module.dripDaysAfterEnrollment ?? 0
   */
  static async getCurriculum(courseIdentifier: string): Promise<ICurriculumDTO> {
    await connectToDatabase();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(courseIdentifier);
    const course = isObjectId
      ? await CourseModel.findById(courseIdentifier)
      : await CourseModel.findOne({ slug: courseIdentifier.toLowerCase() });

    if (!course) {
      throw new NotFoundError('Course', courseIdentifier);
    }

    const modules = await ModuleModel.find({ courseId: course._id }).sort({ order: 1 });
    const moduleIds = modules.map(m => m._id);
    const lessons = await LessonModel.find({ moduleId: { $in: moduleIds } }).sort({ order: 1 });

    const lessonsByModule = new Map<string, ILessonSafeDTO[]>();
    for (const l of lessons) {
      const modIdStr = l.moduleId.toString();
      if (!lessonsByModule.has(modIdStr)) {
        lessonsByModule.set(modIdStr, []);
      }
      const safeLesson = l.toSafeDTO();
      // Calculate effective drip days based on parent module
      const parentModule = modules.find(m => m._id.toString() === modIdStr);
      const moduleDrip = parentModule?.dripDaysAfterEnrollment || 0;
      safeLesson.effectiveDripDays = typeof safeLesson.unlockOverrideDays === 'number'
        ? safeLesson.unlockOverrideDays
        : moduleDrip;

      // Content Protection Boundary: In the public curriculum metadata view,
      // never expose private contentData (videoStorageKey, pdfStorageKey, bodyMarkdown)
      // or resources for protected lessons unless isPreviewFree is true.
      if (!safeLesson.isPreviewFree) {
        safeLesson.contentData = {};
        safeLesson.resources = [];
      }

      lessonsByModule.get(modIdStr)!.push(safeLesson);
    }


    const enrichedModules = modules.map(m => {
      const safeMod = m.toSafeDTO();
      return {
        ...safeMod,
        lessons: lessonsByModule.get(m._id.toString()) || []
      };
    });

    return {
      course: course.toSafeDTO(),
      modules: enrichedModules
    };
  }
}

/**
 * Deterministic Unlock Algorithm from docs/COURSE_ENGINE.md
 */
export interface UnlockEvaluation {
  isUnlocked: boolean;
  unlocksAt: Date;
  daysRemaining: number;
}

export function evaluateLessonUnlock(
  enrollmentDate: Date,
  moduleDripDays: number = 0,
  lessonOverrideDays?: number | null,
  nowDate: Date = new Date()
): UnlockEvaluation {
  const effectiveDays = typeof lessonOverrideDays === 'number'
    ? lessonOverrideDays
    : moduleDripDays;

  const unlocksAt = new Date(enrollmentDate.getTime() + effectiveDays * 24 * 60 * 60 * 1000);
  const now = nowDate.getTime();
  const isUnlocked = now >= unlocksAt.getTime();
  const daysRemaining = isUnlocked
    ? 0
    : Math.ceil((unlocksAt.getTime() - now) / (1000 * 3600 * 24));

  return { isUnlocked, unlocksAt, daysRemaining };
}

