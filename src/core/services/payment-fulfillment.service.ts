import mongoose, { ClientSession } from 'mongoose';
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
   * Executes payment fulfillment protected by a MongoDB session/transaction where supported.
   * In a replica set environment, all operations run atomically within a transaction.
   * In a standalone non-replica environment, executes sequentially and reports transaction support status.
   *
   * 1. Checks if already fulfilled (strict early return for idempotency).
   * 2. Marks PaymentAttempt -> succeeded
   * 3. Marks Order -> paid
   * 4. Iterates over ALL ProductDeliverables on the product
   * 5. For each deliverable: grants Entitlement via EntitlementService
   * 6. If deliverableType === 'course', provisions Enrollment via EnrollmentService
   * 7. If deliverableType === 'batch', preserves Entitlement grant (Phase 1F handles capacity/scheduling)
   */
  static async fulfillPaidOrder(
    orderId: string,
    paymentAttemptId: string,
    paidAt: Date = new Date(),
    existingSession?: ClientSession
  ): Promise<FulfillmentResult> {
    await connectToDatabase();

    // Check if session/transaction should be started
    let session = existingSession;
    let ownSession = false;

    if (!session && mongoose.connection.readyState === 1) {
      try {
        session = await mongoose.startSession();
        ownSession = true;
      } catch (err: any) {
        logger.info('MongoDB session cannot be started (standalone deployment)', {
          error: err.message
        });
        session = undefined;
      }
    }

    const executeFulfillment = async (sess?: ClientSession): Promise<FulfillmentResult> => {
      const orderQuery = OrderModel.findById(orderId);
      if (sess) orderQuery.session(sess);
      const order = await orderQuery;

      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      const attemptQuery = PaymentAttemptModel.findById(paymentAttemptId);
      if (sess) attemptQuery.session(sess);
      const attempt = await attemptQuery;

      if (!attempt) {
        throw new NotFoundError('PaymentAttempt', paymentAttemptId);
      }

      // Strict Idempotency Guard:
      // If order is already paid AND the same PaymentAttempt is already succeeded,
      // return immediately without re-running fulfillment mutations.
      if (order.status === 'paid' && attempt.status === 'succeeded') {
        logger.info('Order and attempt already fulfilled, returning idempotent success immediately', {
          orderId,
          orderNumber: order.orderNumber,
          paymentAttemptId
        });
        return {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          paymentAttemptId: attempt._id.toString(),
          entitlementsGranted: 0,
          enrollmentsProvisioned: 0,
          deliverablesProcessed: []
        };
      }

      // Update Attempt status to succeeded
      attempt.status = 'succeeded';
      attempt.paidAt = paidAt;
      await attempt.save({ session: sess });

      // Update Order status to paid
      order.status = 'paid';
      order.activePaymentAttemptId = attempt._id;
      await order.save({ session: sess });

      // Fetch Product and iterate over ALL ProductDeliverables
      const productQuery = ProductModel.findById(order.productId);
      if (sess) productQuery.session(sess);
      const product = await productQuery;

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
          targetId,
          session: sess
        });

        let enrollmentId: string | undefined;

        // 2. If deliverable is a Course, provision Enrollment inside the same transaction
        if (targetType === 'course') {
          const enrollment = await EnrollmentService.createEnrollmentFromEntitlement(
            entitlement.id,
            order.userId.toString(),
            sess
          );
          enrollmentId = enrollment.id;
          enrollmentsProvisioned++;
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
    };

    if (ownSession && session) {
      try {
        let result: FulfillmentResult | undefined;
        await session.withTransaction(async () => {
          result = await executeFulfillment(session);
        });
        return result!;
      } catch (txnError: any) {
        // If transactions are not supported on this MongoDB topology (e.g. standalone Mongo without replica set)
        if (
          txnError.message?.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
          txnError.code === 20 ||
          txnError.codeName === 'IllegalOperation'
        ) {
          logger.warn('MongoDB topology does not support transactions; falling back to non-transactional execution', {
            error: txnError.message
          });
          return await executeFulfillment(undefined);
        }
        throw txnError;
      } finally {
        await session.endSession();
      }
    }

    return await executeFulfillment(session);
  }
}

