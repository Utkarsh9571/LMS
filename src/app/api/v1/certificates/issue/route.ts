import { NextRequest } from 'next/server';
import { CertificateService } from '@/core/services/certificate.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const certificate = await CertificateService.issueCertificate(body.enrollmentId, user.id);
    return apiSuccess(certificate, 201);
  } catch (error) {
    return apiError(error);
  }
}
