import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/core/domain/product.model';
import { OfferModel } from '@/core/domain/offer.model';
import { CourseModel } from '@/core/domain/course.model';
import { BatchModel } from '@/core/domain/batch.model';
import { EntitlementModel } from '@/core/domain/entitlement.model';
import {
  MarketCode,
  CurrencyCode,
  IProductSafeDTO,
  IOfferSafeDTO,
  V1DeliverableType
} from '@/core/domain/domain-types';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface CreateServiceInput {
  title: string;
  description: string;
  slug?: string;
  deliverableType: V1DeliverableType; // 'course' | 'batch'
  targetId: string;
  marketCode: MarketCode;
  currency: CurrencyCode;
  priceMinorUnits: number;
  displayOriginalPriceMinorUnits?: number | null;
  isPubliclyListed?: boolean;
}

export interface IServiceSummaryDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  deliverableType: V1DeliverableType;
  targetId: string;
  targetTitle: string;
  marketCode: MarketCode;
  currency: CurrencyCode;
  basePriceMinorUnits: number;
  displayOriginalPriceMinorUnits: number | null;
  offerId: string;
  isActive: boolean;
  activeUserCount: number;
  createdAt: string;
  updatedAt: string;
}

export class ServiceManagementService {
  /**
   * Server-side atomic orchestration for creating a commercial Service/Program.
   * Creates Product + ProductDeliverable + Offer in a single server workflow.
   */
  static async createService(input: CreateServiceInput): Promise<IServiceSummaryDTO> {
    const {
      title,
      description,
      slug: customSlug,
      deliverableType,
      targetId,
      marketCode,
      currency,
      priceMinorUnits,
      displayOriginalPriceMinorUnits,
      isPubliclyListed = true
    } = input;

    if (!title || !title.trim()) throw new ValidationError('Service title is required.');
    if (!description || !description.trim()) throw new ValidationError('Service description is required.');
    if (!['course', 'batch'].includes(deliverableType)) {
      throw new ValidationError('Deliverable type must be course or batch.');
    }
    if (!['SG', 'MY'].includes(marketCode)) throw new ValidationError('Invalid market code.');
    if (marketCode === 'SG' && currency !== 'SGD') throw new ValidationError('SG market requires SGD currency.');
    if (marketCode === 'MY' && currency !== 'MYR') throw new ValidationError('MY market requires MYR currency.');
    if (!Number.isInteger(priceMinorUnits) || priceMinorUnits < 0) {
      throw new ValidationError('priceMinorUnits must be a non-negative integer.');
    }

    await connectToDatabase();

    // Resolve target deliverable to ensure it exists & grab target title
    let targetTitle = '';
    if (deliverableType === 'course') {
      const course = await CourseModel.findById(targetId);
      if (!course) throw new NotFoundError('Course', targetId);
      targetTitle = course.title;
    } else {
      const batch = await BatchModel.findById(targetId);
      if (!batch) throw new NotFoundError('Batch', targetId);
      targetTitle = batch.name;
    }

    // Generate slug if omitted
    const baseSlug = customSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let finalSlug = baseSlug;
    let counter = 1;
    while (await ProductModel.exists({ slug: finalSlug })) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    // Create Product
    const product = await ProductModel.create({
      slug: finalSlug,
      title: title.trim(),
      description: description.trim(),
      deliverables: [
        {
          deliverableType,
          targetId,
          order: 1
        }
      ],
      isActive: true
    });

    // Create Offer tied to Product & Market
    let offer;
    try {
      offer = await OfferModel.create({
        productId: product._id,
        marketCode,
        currency,
        basePriceMinorUnits: priceMinorUnits,
        displayOriginalPriceMinorUnits: displayOriginalPriceMinorUnits ?? null,
        isPubliclyListed,
        status: 'active'
      });
    } catch (offerError) {
      // Clean up product if offer creation fails to maintain atomic integrity
      await ProductModel.findByIdAndDelete(product._id);
      logger.error('Failed to create offer for service; cleaned up product', { productId: product._id });
      throw offerError;
    }

    logger.info('Created new Service (Product + Offer)', {
      productId: product._id.toString(),
      offerId: offer._id.toString(),
      marketCode
    });

    return {
      id: product._id.toString(),
      slug: product.slug,
      title: product.title,
      description: product.description,
      deliverableType,
      targetId,
      targetTitle,
      marketCode,
      currency,
      basePriceMinorUnits: offer.basePriceMinorUnits,
      displayOriginalPriceMinorUnits: offer.displayOriginalPriceMinorUnits ?? null,
      offerId: offer._id.toString(),
      isActive: product.isActive,
      activeUserCount: 0,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString()
    };
  }

  /**
   * Lists all commercial Services (Products + Offers) for staff management
   */
  static async listServices(marketCode?: MarketCode): Promise<IServiceSummaryDTO[]> {
    await connectToDatabase();

    const productQuery: Record<string, unknown> = {};
    const products = await ProductModel.find(productQuery).sort({ createdAt: -1 });

    if (products.length === 0) return [];

    const productIds = products.map(p => p._id);
    const offerQuery: Record<string, unknown> = { productId: { $in: productIds } };
    if (marketCode) offerQuery.marketCode = marketCode;

    const offers = await OfferModel.find(offerQuery);
    const offersByProductId = new Map<string, typeof offers>();
    for (const o of offers) {
      const pIdStr = o.productId.toString();
      if (!offersByProductId.has(pIdStr)) offersByProductId.set(pIdStr, []);
      offersByProductId.get(pIdStr)!.push(o);
    }

    // Resolve course and batch target names
    const courseIds = new Set<string>();
    const batchIds = new Set<string>();
    for (const p of products) {
      for (const d of p.deliverables) {
        if (d.deliverableType === 'course') courseIds.add(d.targetId.toString());
        if (d.deliverableType === 'batch') batchIds.add(d.targetId.toString());
      }
    }

    const courses = courseIds.size > 0 ? await CourseModel.find({ _id: { $in: Array.from(courseIds) } }) : [];
    const batches = batchIds.size > 0 ? await BatchModel.find({ _id: { $in: Array.from(batchIds) } }) : [];

    const courseMap = new Map(courses.map(c => [c._id.toString(), c.title]));
    const batchMap = new Map(batches.map(b => [b._id.toString(), b.name]));

    // Query active entitlements per target to compute real activeUserCount
    const allTargetIds = [...Array.from(courseIds), ...Array.from(batchIds)];
    const activeEntitlements = allTargetIds.length > 0
      ? await EntitlementModel.aggregate([
          { $match: { targetId: { $in: allTargetIds.map(id => new (require('mongoose').Types.ObjectId)(id)), status: 'active' } } },
          { $group: { _id: '$targetId', count: { $sum: 1 } } }
        ])
      : [];

    const entitlementCountMap = new Map(activeEntitlements.map(e => [e._id.toString(), e.count]));

    const summaries: IServiceSummaryDTO[] = [];

    for (const product of products) {
      const productOffers = offersByProductId.get(product._id.toString()) || [];
      const primaryDeliverable = product.deliverables[0];
      if (!primaryDeliverable) continue;

      const targetIdStr = primaryDeliverable.targetId.toString();
      const targetTitle = primaryDeliverable.deliverableType === 'course'
        ? courseMap.get(targetIdStr) || 'Unknown Course'
        : batchMap.get(targetIdStr) || 'Unknown Batch';

      const activeUserCount = entitlementCountMap.get(targetIdStr) || 0;

      if (productOffers.length === 0) {
        summaries.push({
          id: product._id.toString(),
          slug: product.slug,
          title: product.title,
          description: product.description,
          deliverableType: primaryDeliverable.deliverableType,
          targetId: targetIdStr,
          targetTitle,
          marketCode: marketCode || 'SG',
          currency: (marketCode || 'SG') === 'SG' ? 'SGD' : 'MYR',
          basePriceMinorUnits: 0,
          displayOriginalPriceMinorUnits: null,
          offerId: '',
          isActive: product.isActive,
          activeUserCount,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString()
        });
      } else {
        for (const offer of productOffers) {
          summaries.push({
            id: product._id.toString(),
            slug: product.slug,
            title: product.title,
            description: product.description,
            deliverableType: primaryDeliverable.deliverableType,
            targetId: targetIdStr,
            targetTitle,
            marketCode: offer.marketCode,
            currency: offer.currency,
            basePriceMinorUnits: offer.basePriceMinorUnits,
            displayOriginalPriceMinorUnits: offer.displayOriginalPriceMinorUnits ?? null,
            offerId: offer._id.toString(),
            isActive: product.isActive && offer.status === 'active',
            activeUserCount,
            createdAt: product.createdAt.toISOString(),
            updatedAt: product.updatedAt.toISOString()
          });
        }
      }
    }

    return summaries;
  }
}
