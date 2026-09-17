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

    const uploadData = await AssignmentService.initiateUpload(user.id, {
      assignmentId,
      enrollmentId: body.enrollmentId,
      fileName: body.fileName,
      fileSizeBytes: body.fileSizeBytes,
      mimeType: body.mimeType
    });

    return apiSuccess(uploadData);
  } catch (error) {
    return apiError(error);
  }
}
