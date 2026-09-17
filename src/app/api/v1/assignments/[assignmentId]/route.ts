import { NextRequest } from 'next/server';
import { AssignmentService } from '@/core/services/assignment.service';
import { requirePermission } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const assignment = await AssignmentService.getAssignment(assignmentId);
    return apiSuccess(assignment);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    await requirePermission('courses:write');
    const { assignmentId } = await params;
    const body = await request.json();

    const assignment = await AssignmentService.updateAssignment(assignmentId, {
      title: body.title,
      instructionsMarkdown: body.instructionsMarkdown,
      status: body.status,
      passingScorePercent: body.passingScorePercent,
      maxScore: body.maxScore,
      maxSubmissions: body.maxSubmissions,
      allowedFileExtensions: body.allowedFileExtensions,
      maxFileSizeBytes: body.maxFileSizeBytes,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined
    });

    return apiSuccess(assignment);
  } catch (error) {
    return apiError(error);
  }
}
