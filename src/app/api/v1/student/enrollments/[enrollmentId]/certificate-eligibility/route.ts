import { NextRequest } from 'next/server';
import { CertificateService } from '@/core/services/certificate.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const user = await requireAuth();
    const { enrollmentId } = await params;

    const eligibility = await CertificateService.evaluateEligibility(enrollmentId, user.id);
    return apiSuccess(eligibility);
  } catch (error) {
    return apiError(error);
  }
}
