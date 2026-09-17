import { NextRequest } from 'next/server';
import { AssignmentService } from '@/core/services/assignment.service';
import { requireAuth, requirePermission } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    await requirePermission('assignments:grade');
    const user = await requireAuth();
    const { submissionId } = await params;
    const body = await request.json();

    const gradedSubmission = await AssignmentService.gradeSubmission(
      { userId: user.id, roles: user.globalRoles },
      {
        submissionId,
        graderId: user.id,
        score: body.score,
        feedbackMarkdown: body.feedbackMarkdown,
        requestedResubmission: body.requestedResubmission
      }
    );

    return apiSuccess(gradedSubmission);
  } catch (error) {
    return apiError(error);
  }
}
