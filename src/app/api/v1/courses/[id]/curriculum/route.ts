import { NextRequest } from 'next/server';
import { CourseService } from '@/core/services/course.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const curriculum = await CourseService.getCurriculum(id);
    return apiSuccess(curriculum);
  } catch (error) {
    return apiError(error);
  }
}
