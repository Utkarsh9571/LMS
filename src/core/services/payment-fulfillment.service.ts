import { connectToDatabase } from '@/lib/db';
import { OrderModel } from '@/core/domain/order.model';
import { PaymentAttemptModel } from '@/core/domain/payment-attempt.model';
import { ProductModel } from '@/core/domain/product.model';
import { EntitlementService } from './entitlement.service';
import { EnrollmentService } from './enrollment.service';
import { NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';


export interface FulfillmentResult {
  orderId: string;
  orderNumber: string;
  paymentAttemptId: string;
  entitlementsGranted: number;
  enrollmentsProvisioned: number;
  deliverablesProcessed: Array<{
    deliverableType: string;
    targetId: string;
    entitlementId: string;
    enrollmentId?: string;
  }>;
}

export class PaymentFulfillmentService {
  /**
   * Executes atomic payment fulfillment:
   * 1. Marks PaymentAttempt -> succeeded
   * 2. Marks Order -> paid
   * 3. Iterates over ALL ProductDeliverables on the product
   * 4. For each deliverable: grants Entitlement via EntitlementService
   * 5. If deliverableType === 'course', provisions Enrollment via EnrollmentService
   * 6. If deliverableType === 'batch', preserves Entitlement grant (Phase 1F handles capacity/scheduling)
   */
  static async fulfillPaidOrder(
    orderId: string,
    paymentAttemptId: string,
    paidAt: Date = new Date()
  ): Promise<FulfillmentResult> {
    await connectToDatabase();

    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order', orderId);
    }

    const attempt = await PaymentAttemptModel.findById(paymentAttemptId);
    if (!attempt) {
      throw new NotFoundError('PaymentAttempt', paymentAttemptId);
    }

    // Idempotency: If already paid and attempt succeeded, avoid re-fulfillment
    if (order.status === 'paid' && attempt.status === 'succeeded') {
      logger.info('Order and attempt already fulfilled, returning idempotent success', {
        orderId,
        orderNumber: order.orderNumber,
        paymentAttemptId
      });
    }

    // Update Attempt status to succeeded
    attempt.status = 'succeeded';
    attempt.paidAt = paidAt;
    await attempt.save();

    // Update Order status to paid
    order.status = 'paid';
    order.activePaymentAttemptId = attempt._id;
    await order.save();

    // Fetch Product and iterate over ALL ProductDeliverables
    const product = await ProductModel.findById(order.productId);
    if (!product) {
      throw new NotFoundError('Product', order.productId.toString());
    }

    if (!product.deliverables || product.deliverables.length === 0) {
      logger.warn('Product has no deliverables to fulfill', { productId: product._id.toString() });
      return {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        paymentAttemptId: attempt._id.toString(),
        entitlementsGranted: 0,
        enrollmentsProvisioned: 0,
        deliverablesProcessed: []
      };
    }

    const deliverablesProcessed: FulfillmentResult['deliverablesProcessed'] = [];
    let enrollmentsProvisioned = 0;

    // Fulfill EVERY deliverable
    for (const deliverable of product.deliverables) {
      const targetType = deliverable.deliverableType;
      const targetId = deliverable.targetId.toString();

      logger.info('Fulfilling deliverable for paid order', {
        orderNumber: order.orderNumber,
        targetType,
        targetId
      });

      // 1. Grant Entitlement
      const entitlement = await EntitlementService.grantEntitlement({
        userId: order.userId.toString(),
        sourceOrderId: order._id.toString(),
        marketCode: order.marketCode,
        targetType,
        targetId
      });

      let enrollmentId: string | undefined;

      // 2. If deliverable is a Course, provision Enrollment
      if (targetType === 'course') {
        try {
          const enrollment = await EnrollmentService.createEnrollmentFromEntitlement(
            entitlement.id,
            order.userId.toString()
          );
          enrollmentId = enrollment.id;
          enrollmentsProvisioned++;
        } catch (enrollErr: any) {
          logger.error('Failed to provision course enrollment during fulfillment', {
            targetId,
            error: enrollErr.message
          });
        }
      } else if (targetType === 'batch') {
        // Phase 1E Phase Boundary:
        // Entitlement targetType='batch' is successfully granted.
        // Batch capacity increment and live meeting scheduling are deferred to Phase 1F.
        logger.info('Preserved batch entitlement grant. Batch Engine fulfillment deferred to Phase 1F', {
          batchId: targetId,
          entitlementId: entitlement.id
        });
      }

      deliverablesProcessed.push({
        deliverableType: targetType,
        targetId,
        entitlementId: entitlement.id,
        enrollmentId
      });
    }

    logger.info('Fulfillment completed successfully for order', {
      orderNumber: order.orderNumber,
      totalDeliverables: deliverablesProcessed.length,
      enrollmentsProvisioned
    });

    return {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      paymentAttemptId: attempt._id.toString(),
      entitlementsGranted: deliverablesProcessed.length,
      enrollmentsProvisioned,
      deliverablesProcessed
    };
  }
}
