import { NextRequest } from 'next/server';
import { AssignmentService } from '@/core/services/assignment.service';
import { requirePermission } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await requirePermission('courses:write');
    const body = await request.json();

    const assignment = await AssignmentService.createAssignment({
      courseId: body.courseId,
      lessonId: body.lessonId,
      title: body.title,
      instructionsMarkdown: body.instructionsMarkdown,
      passingScorePercent: body.passingScorePercent,
      maxScore: body.maxScore,
      maxSubmissions: body.maxSubmissions,
      allowedFileExtensions: body.allowedFileExtensions,
      maxFileSizeBytes: body.maxFileSizeBytes,
      dueDate: body.dueDate ? new Date(body.dueDate) : null
    });

    return apiSuccess(assignment, 201);
  } catch (error) {
    return apiError(error);
  }
}
