import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/core/domain/user.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { EntitlementModel } from '@/core/domain/entitlement.model';
import { OrderModel } from '@/core/domain/order.model';
import { CertificateModel } from '@/core/domain/certificate.model';
import { CourseModel } from '@/core/domain/course.model';
import { BatchModel } from '@/core/domain/batch.model';
import { ProductModel } from '@/core/domain/product.model';
import { PaymentAttemptModel } from '@/core/domain/payment-attempt.model';
import {
  IUserSafeProfile,
  IEnrollmentSafeDTO,
  IEntitlementSafeDTO,
  IOrderSafeDTO,
  ICertificateSafeDTO,
  IPaymentAttemptSafeDTO
} from '@/core/domain/domain-types';
import { NotFoundError } from '@/lib/errors';

export interface ICustomerListItemDTO {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  globalRoles: string[];
  status: string;
  activeEnrollmentCount: number;
  purchasesCount: number;
  createdAt: string;
}

export interface ICustomerListResponse {
  items: ICustomerListItemDTO[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ICustomer360DTO {
  profile: IUserSafeProfile;
  enrollments: Array<
    IEnrollmentSafeDTO & {
      courseTitle: string;
      batchName?: string | null;
    }
  >;
  purchases: Array<
    IOrderSafeDTO & {
      productTitle: string;
    }
  >;
  certificates: ICertificateSafeDTO[];
  entitlements: IEntitlementSafeDTO[];
}

export interface ISalesListItemDTO {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  productTitle: string;
  marketCode: string;
  currency: string;
  totalMinorUnits: number;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
}

export interface ISalesListResponse {
  items: ISalesListItemDTO[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ISalesDetailDTO {
  order: IOrderSafeDTO & {
    productTitle: string;
    customerName: string;
    customerEmail: string;
  };
  paymentAttempts: IPaymentAttemptSafeDTO[];
  entitlements: IEntitlementSafeDTO[];
  enrollments: IEnrollmentSafeDTO[];
}

export class StaffManagementService {
  /**
   * Server-side paginated & filtered search for Customers
   */
  static async listCustomers(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ICustomerListResponse> {
    await connectToDatabase();

    const page = Number.isFinite(params.page) && (params.page as number) > 0 ? (params.page as number) : 1;
    const limit = Math.min(50, Math.max(1, Number.isFinite(params.limit) && (params.limit as number) > 0 ? (params.limit as number) : 15));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (params.status && ['active', 'suspended'].includes(params.status)) {
      query.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const safeSearch = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safeSearch, 'i');
      query.$or = [{ fullName: regex }, { email: regex }];
    }

    const [users, totalItems] = await Promise.all([
      UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserModel.countDocuments(query)
    ]);

    if (users.length === 0) {
      return {
        items: [],
        pagination: { page, limit, totalItems: 0, totalPages: 0 }
      };
    }

    const userIds = users.map(u => u._id);

    // Efficient aggregations for list counts
    const [enrollmentCounts, orderCounts] = await Promise.all([
      EnrollmentModel.aggregate([
        { $match: { userId: { $in: userIds }, status: 'active' } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ]),
      OrderModel.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ])
    ]);

    const activeEnrollmentMap = new Map(enrollmentCounts.map(e => [e._id.toString(), e.count]));
    const orderCountMap = new Map(orderCounts.map(o => [o._id.toString(), o.count]));

    const items: ICustomerListItemDTO[] = users.map(u => {
      const uIdStr = u._id.toString();
      const safe = u.toSafeProfile();
      return {
        id: safe.id,
        fullName: safe.fullName,
        email: safe.email,
        phone: safe.phone,
        globalRoles: safe.globalRoles,
        status: safe.status,
        activeEnrollmentCount: activeEnrollmentMap.get(uIdStr) || 0,
        purchasesCount: orderCountMap.get(uIdStr) || 0,
        createdAt: safe.createdAt
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    };
  }

  /**
   * Retrieves Customer 360 view by User ID
   */
  static async getCustomer360(userId: string): Promise<ICustomer360DTO> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    if (!isObjectId) throw new NotFoundError('User', userId);

    await connectToDatabase();

    const user = await UserModel.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const [enrollments, orders, certificates, entitlements] = await Promise.all([
      EnrollmentModel.find({ userId: user._id }).sort({ createdAt: -1 }),
      OrderModel.find({ userId: user._id }).sort({ createdAt: -1 }),
      CertificateModel.find({ userId: user._id }).sort({ issuedAt: -1 }),
      EntitlementModel.find({ userId: user._id }).sort({ grantedAt: -1 })
    ]);

    // Resolve course, batch, and product titles
    const courseIds = Array.from(new Set(enrollments.map(e => e.courseId.toString())));
    const batchIds = Array.from(
      new Set(enrollments.map(e => e.batchId?.toString()).filter(Boolean) as string[])
    );
    const productIds = Array.from(new Set(orders.map(o => o.productId.toString())));

    const [courses, batches, products] = await Promise.all([
      courseIds.length > 0 ? CourseModel.find({ _id: { $in: courseIds } }) : [],
      batchIds.length > 0 ? BatchModel.find({ _id: { $in: batchIds } }) : [],
      productIds.length > 0 ? ProductModel.find({ _id: { $in: productIds } }) : []
    ]);

    const courseMap = new Map(courses.map(c => [c._id.toString(), c.title]));
    const batchMap = new Map(batches.map(b => [b._id.toString(), b.name]));
    const productMap = new Map(products.map(p => [p._id.toString(), p.title]));

    const formattedEnrollments = enrollments.map(e => ({
      ...e.toSafeDTO(),
      courseTitle: courseMap.get(e.courseId.toString()) || 'Unknown Course',
      batchName: e.batchId ? batchMap.get(e.batchId.toString()) || null : null
    }));

    const formattedPurchases = orders.map(o => ({
      ...o.toSafeDTO(),
      productTitle: productMap.get(o.productId.toString()) || 'Unknown Product'
    }));

    return {
      profile: user.toSafeProfile(),
      enrollments: formattedEnrollments,
      purchases: formattedPurchases,
      certificates: certificates.map(c => c.toSafeDTO()),
      entitlements: entitlements.map(e => e.toSafeDTO())
    };
  }

  /**
   * Server-side paginated & filtered list for Sales / Orders
   */
  static async listSales(params: {
    status?: string;
    marketCode?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ISalesListResponse> {
    await connectToDatabase();

    const page = Number.isFinite(params.page) && (params.page as number) > 0 ? (params.page as number) : 1;
    const limit = Math.min(50, Math.max(1, Number.isFinite(params.limit) && (params.limit as number) > 0 ? (params.limit as number) : 15));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (params.status) {
      query.status = params.status;
    }
    if (params.marketCode && ['SG', 'MY'].includes(params.marketCode)) {
      query.marketCode = params.marketCode;
    }
    if (params.search && params.search.trim()) {
      const safeSearch = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safeSearch, 'i');
      query.$or = [{ orderNumber: regex }, { 'billingDetails.email': regex }, { 'billingDetails.fullName': regex }];
    }

    const [orders, totalItems] = await Promise.all([
      OrderModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      OrderModel.countDocuments(query)
    ]);

    if (orders.length === 0) {
      return {
        items: [],
        pagination: { page, limit, totalItems: 0, totalPages: 0 }
      };
    }

    const productIds = Array.from(new Set(orders.map(o => o.productId.toString())));
    const products = productIds.length > 0 ? await ProductModel.find({ _id: { $in: productIds } }) : [];
    const productMap = new Map(products.map(p => [p._id.toString(), p.title]));

    const items: ISalesListItemDTO[] = orders.map(o => {
      const safe = o.toSafeDTO();
      return {
        id: safe.id,
        orderNumber: safe.orderNumber,
        customerName: o.billingDetails.fullName,
        customerEmail: o.billingDetails.email,
        productTitle: productMap.get(o.productId.toString()) || 'Unknown Product',
        marketCode: safe.marketCode,
        currency: safe.currency,
        totalMinorUnits: safe.totalMinorUnits,
        orderStatus: safe.status,
        paymentStatus: safe.status === 'paid' ? 'succeeded' : safe.status,
        fulfillmentStatus: safe.fulfillmentError ? 'failed' : safe.status === 'paid' ? 'fulfilled' : 'pending',
        createdAt: safe.createdAt
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    };
  }

  /**
   * Retrieves Sales Detail with payment attempt history and fulfillment status
   */
  static async getSalesDetail(orderIdOrNumber: string): Promise<ISalesDetailDTO> {
    await connectToDatabase();

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderIdOrNumber);
    const query = isObjectId ? { _id: orderIdOrNumber } : { orderNumber: orderIdOrNumber };

    const order = await OrderModel.findOne(query);
    if (!order) throw new NotFoundError('Order', orderIdOrNumber);

    const [product, paymentAttempts, entitlements, enrollments] = await Promise.all([
      ProductModel.findById(order.productId),
      PaymentAttemptModel.find({ orderId: order._id }).sort({ attemptNumber: 1 }),
      EntitlementModel.find({ sourceOrderId: order._id }),
      EnrollmentModel.find({ userId: order.userId })
    ]);

    return {
      order: {
        ...order.toSafeDTO(),
        productTitle: product ? product.title : 'Unknown Product',
        customerName: order.billingDetails.fullName,
        customerEmail: order.billingDetails.email
      },
      paymentAttempts: paymentAttempts.map(p => p.toSafeDTO()),
      entitlements: entitlements.map(e => e.toSafeDTO()),
      enrollments: enrollments.map(e => e.toSafeDTO())
    };
  }
}
