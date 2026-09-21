import { connectToDatabase } from '../../lib/db';
import { CourseModel } from '../domain/course.model';
import { ProductModel } from '../domain/product.model';
import { OfferModel } from '../domain/offer.model';
import { MarketCode } from '../domain/domain-types';

export interface IStoreOfferDiscoveryDTO {
  id: string;
  offerCode: string;
  name: string;
  priceMinorUnits: number;
  currency: string;
  marketCode: string;
  billingType: string;
}

export interface IStoreProductDiscoveryDTO {
  id: string;
  courseId: string;
  courseSlug: string;
  sku: string;
  name: string;
  offers: IStoreOfferDiscoveryDTO[];
}

export class StoreDiscoveryService {
  /**
   * Resolves active commercial offers for published courses matching target market.
   * Enforces server market context and validates offer dates & status.
   */
  static async getProductOffersForMarket(
    resolvedMarketCode: MarketCode,
    courseIdOrSlug?: string
  ): Promise<IStoreProductDiscoveryDTO[]> {
    await connectToDatabase();

    const courseQuery: Record<string, unknown> = { status: 'published' };
    if (courseIdOrSlug) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(courseIdOrSlug);
      if (isObjectId) {
        courseQuery._id = courseIdOrSlug;
      } else {
        courseQuery.slug = courseIdOrSlug.toLowerCase();
      }
    }

    const publishedCourses = await CourseModel.find(courseQuery);
    if (publishedCourses.length === 0) {
      return [];
    }

    const courseMap = new Map(publishedCourses.map(c => [c._id.toString(), c]));
    const courseIds = Array.from(courseMap.keys());

    const products = await ProductModel.find({
      isActive: true,
      'deliverables.targetId': { $in: courseIds }
    });

    if (products.length === 0) {
      return [];
    }

    const productIds = products.map(p => p._id);
    const now = new Date();

    const offers = await OfferModel.find({
      productId: { $in: productIds },
      marketCode: resolvedMarketCode,
      status: 'active',
      isPubliclyListed: true,
      $and: [
        { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
        { $or: [{ validUntil: null }, { validUntil: { $gt: now } }] }
      ]
    });

    const offersByProductId = new Map<string, typeof offers>();
    for (const offer of offers) {
      const pIdStr = offer.productId.toString();
      if (!offersByProductId.has(pIdStr)) {
        offersByProductId.set(pIdStr, []);
      }
      offersByProductId.get(pIdStr)!.push(offer);
    }

    const results: IStoreProductDiscoveryDTO[] = [];

    for (const product of products) {
      const productOffers = offersByProductId.get(product._id.toString()) || [];
      if (productOffers.length === 0) continue;

      const courseDeliverable = product.deliverables.find(
        d => d.deliverableType === 'course' && courseMap.has(d.targetId.toString())
      );
      if (!courseDeliverable) continue;

      const targetCourse = courseMap.get(courseDeliverable.targetId.toString())!;

      const formattedOffers: IStoreOfferDiscoveryDTO[] = productOffers.map(o => ({
        id: o._id.toString(),
        offerCode: `${product.slug}_${o.marketCode}`.toUpperCase(),
        name: `${product.title} (${o.currency})`,
        priceMinorUnits: o.basePriceMinorUnits,
        currency: o.currency,
        marketCode: o.marketCode,
        billingType: 'one_time'
      }));

      results.push({
        id: product._id.toString(),
        courseId: targetCourse._id.toString(),
        courseSlug: targetCourse.slug,
        sku: product.slug.toUpperCase(),
        name: product.title,
        offers: formattedOffers
      });
    }

    return results;
  }
}
