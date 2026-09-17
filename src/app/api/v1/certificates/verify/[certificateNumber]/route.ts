import { NextRequest } from 'next/server';
import { CertificateService } from '@/core/services/certificate.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { NotFoundError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateNumber: string }> }
) {
  try {
    const { certificateNumber } = await params;
    const verification = await CertificateService.verifyCertificatePublicly(certificateNumber);

    if (!verification) {
      throw new NotFoundError('Certificate', certificateNumber);
    }

    return apiSuccess(verification);
  } catch (error) {
    return apiError(error);
  }
}
