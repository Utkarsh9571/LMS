import { NextRequest } from 'next/server';
import { AssignmentService } from '@/core/services/assignment.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const user = await requireAuth();
    const { assignmentId } = await params;
    const body = await request.json();

    const submission = await AssignmentService.submitAssignment(user.id, {
      assignmentId,
      enrollmentId: body.enrollmentId,
      storageKey: body.storageKey,
      originalFileName: body.originalFileName,
      fileSizeBytes: body.fileSizeBytes,
      mimeType: body.mimeType,
      studentNotes: body.studentNotes
    });

    return apiSuccess(submission, 201);
  } catch (error) {
    return apiError(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const user = await requireAuth();
    const { assignmentId } = await params;
    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get('enrollmentId');

    if (!enrollmentId) {
      return apiError(new Error('enrollmentId query parameter is required.'));
    }

    const submissions = await AssignmentService.getEnrollmentSubmissions(enrollmentId, assignmentId);
    const userSubmissions = submissions.filter((s) => s.userId === user.id);
    return apiSuccess(userSubmissions);
  } catch (error) {
    return apiError(error);
  }
}
