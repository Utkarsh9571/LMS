import { NextRequest } from 'next/server';
import { CertificateService } from '@/core/services/certificate.service';
import { requireRole, requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

/**
 * PATCH /api/v1/certificates/:id/revoke
 *
 * Administratively revokes a certificate.
 * - Requires authentication.
 * - Only admin or superadmin may revoke (403 for instructor, staff, student).
 * - Idempotent: revoking an already-revoked certificate returns 200 with current state.
 * - Does NOT delete the certificate; the issuance record is permanently preserved.
 * - Public verification will return isValid: false after revocation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Enforce: only admin or superadmin may revoke (instructor/staff/student → 403)
    await requireRole('admin', 'superadmin');
    const user = await requireAuth();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const revocationReason: string | undefined = body?.revocationReason?.trim() || undefined;

    const certificate = await CertificateService.revokeCertificate(id, user.id, revocationReason);
    return apiSuccess(certificate);
  } catch (error) {
    return apiError(error);
  }
}
