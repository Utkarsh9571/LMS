import { connectToDatabase } from '@/lib/db';
import { MarketModel } from '@/core/domain/market.model';
import { UserModel } from '@/core/domain/user.model';
import { CourseModel } from '@/core/domain/course.model';
import { ModuleModel } from '@/core/domain/module.model';
import { LessonModel } from '@/core/domain/lesson.model';
import { hashPassword } from '@/lib/password';
import { logger } from '@/lib/logger';

/**
 * Safe development seeder
 * Only runs in non-production environments and creates standard SG/MY markets, dev admin, and a canonical BIM course.
 */
export async function seedDevelopmentData(): Promise<{ success: boolean; message: string }> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seeder cannot run in production environment.');
  }

  await connectToDatabase();

  // 1. Seed Markets if missing
  const markets = [
    {
      code: 'SG',
      name: 'Singapore',
      countryCode: 'SG',
      currency: 'SGD',
      currencyMinorUnits: 2,
      timezone: 'Asia/Singapore',
      domains: ['sg.bimacademy.com', 'sg.localhost'],
      locale: 'en-SG',
      status: 'active',
      paymentProvider: 'mock',
      paymentConfigurationRef: 'HITPAY_SG',
      supportedPaymentMethods: ['card', 'paynow']
    },
    {
      code: 'MY',
      name: 'Malaysia',
      countryCode: 'MY',
      currency: 'MYR',
      currencyMinorUnits: 2,
      timezone: 'Asia/Kuala_Lumpur',
      domains: ['my.bimacademy.com', 'my.localhost'],
      locale: 'en-MY',
      status: 'active',
      paymentProvider: 'mock',
      paymentConfigurationRef: 'HITPAY_MY',
      supportedPaymentMethods: ['card', 'fpx', 'duitnow']
    }
  ];

  for (const m of markets) {
    await MarketModel.updateOne({ code: m.code }, { $set: m }, { upsert: true });
  }

  // 2. Seed development admin user if not exists
  const devAdminEmail = 'dev.admin@bimacademy.local';
  const existingAdmin = await UserModel.findOne({ email: devAdminEmail });

  if (!existingAdmin) {
    const devPassword = process.env.DEV_SEED_PASSWORD || 'DevAdmin@123';
    const passwordHash = await hashPassword(devPassword);

    await UserModel.create({
      email: devAdminEmail,
      passwordHash,
      fullName: 'Development Admin',
      globalRoles: ['superadmin', 'admin'],
      status: 'active',
      lastActiveMarket: 'SG'
    });

    logger.info('Development admin seeded successfully', { email: devAdminEmail });
  }

  // 3. Seed single canonical course if none exists (Zero market/price data)
  const canonicalSlug = 'revit-architecture-professional';
  const existingCourse = await CourseModel.findOne({ slug: canonicalSlug });

  if (!existingCourse) {
    const course = await CourseModel.create({
      slug: canonicalSlug,
      title: 'Revit Architecture Professional',
      description: 'Comprehensive Building Information Modeling (BIM) training for architects and engineers.',
      level: 'professional',
      thumbnailUrl: '/images/courses/revit-arch.jpg',
      status: 'published',
      deliveryModes: ['self_paced', 'cohort_batch'],
      estimatedHours: 40
    });

    // Module 1: Drip = 0 (Immediate)
    const mod1 = await ModuleModel.create({
      courseId: course._id,
      title: 'Module 1: BIM Concepts & User Interface',
      description: 'Fundamentals of parametric building modeling in Revit.',
      order: 0,
      dripDaysAfterEnrollment: 0
    });

    await LessonModel.create({
      courseId: course._id,
      moduleId: mod1._id,
      title: '1.1 Introduction to Revit Elements & Categories',
      order: 0,
      contentType: 'video',
      contentData: { durationSeconds: 900, videoStorageKey: 'videos/revit-101.mp4' },
      isPreviewFree: true,
      unlockOverrideDays: null,
      resources: [
        {
          title: 'Revit Interface Quick Reference',
          storageKey: 'docs/revit-shortcuts.pdf',
          fileSizeBytes: 1048576,
          mimeType: 'application/pdf',
          downloadAllowed: true
        }
      ]
    });

    // Module 2: Drip = 7 days
    const mod2 = await ModuleModel.create({
      courseId: course._id,
      title: 'Module 2: Structural Grids & Foundations',
      description: 'Setting up architectural coordinates and parametric structural grids.',
      order: 1,
      dripDaysAfterEnrollment: 7
    });

    await LessonModel.create({
      courseId: course._id,
      moduleId: mod2._id,
      title: '2.1 Grid Systems & Level Datums',
      order: 0,
      contentType: 'video',
      contentData: { durationSeconds: 1200, videoStorageKey: 'videos/revit-201.mp4' },
      isPreviewFree: false,
      unlockOverrideDays: null, // Inherits 7 days
      resources: []
    });

    await LessonModel.create({
      courseId: course._id,
      moduleId: mod2._id,
      title: '2.2 Advanced Grid Offset Workshop (Override Unlock)',
      order: 1,
      contentType: 'rich_text',
      contentData: { bodyMarkdown: 'Detailed guide for complex curved grid lines.' },
      isPreviewFree: false,
      unlockOverrideDays: 3, // Overrides module 7 days -> unlocks in 3 days
      resources: []
    });

    logger.info('Canonical development course and curriculum seeded', { slug: canonicalSlug });
  }

  // 4. Seed development student and grant course access for verification
  const devStudentEmail = 'dev.student@bimacademy.local';
  let student = await UserModel.findOne({ email: devStudentEmail });

  if (!student) {
    const studentPassword = process.env.DEV_SEED_PASSWORD || 'DevStudent@123';
    const passwordHash = await hashPassword(studentPassword);

    student = await UserModel.create({
      email: devStudentEmail,
      passwordHash,
      fullName: 'Development Student',
      globalRoles: ['student'],
      status: 'active',
      lastActiveMarket: 'SG'
    });

    logger.info('Development student seeded successfully', { email: devStudentEmail });
  }

  // Ensure course access entitlement and enrollment for development student
  const seededCourse = await CourseModel.findOne({ slug: canonicalSlug });
  if (seededCourse && student) {
    const { EntitlementModel } = await import('@/core/domain/entitlement.model');
    const { EnrollmentModel } = await import('@/core/domain/enrollment.model');

    let entitlement = await EntitlementModel.findOne({
      userId: student._id,
      targetType: 'course',
      targetId: seededCourse._id,
      status: 'active'
    });

    if (!entitlement) {
      entitlement = await EntitlementModel.create({
        userId: student._id,
        sourceOrderId: null,
        marketCode: 'SG',
        targetType: 'course',
        targetId: seededCourse._id,
        status: 'active',
        grantedAt: new Date(),
        expiresAt: null
      });
      logger.info('Development student entitlement granted', { studentId: student._id });
    }

    const existingEnrollment = await EnrollmentModel.findOne({
      userId: student._id,
      courseId: seededCourse._id,
      batchId: null
    });

    if (!existingEnrollment && entitlement) {
      await EnrollmentModel.create({
        userId: student._id,
        courseId: seededCourse._id,
        batchId: null,
        entitlementId: entitlement._id,
        status: 'active',
        enrolledAt: new Date(),
        progressPercent: 0
      });
      logger.info('Development student enrollment created', { studentId: student._id });
    }
  }

  return { success: true, message: 'Development seed completed successfully.' };
}

