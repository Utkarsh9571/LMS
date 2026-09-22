import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { getResolvedMarketCode } from '@/lib/server-market';
import { StoreDiscoveryService } from '@/core/services/store-discovery.service';
import { UserModel } from '@/core/domain/user.model';
import { connectToDatabase } from '@/lib/db';
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { MarketCode, IBatchSafeDTO } from '@/core/domain/domain-types';
import { BatchService } from '@/core/services/batch.service';

export const revalidate = 0;

interface CheckoutPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const session = await getSessionFromCookies();
  const params = searchParams ? await searchParams : undefined;
  const productId = typeof params?.productId === 'string' ? params.productId : undefined;
  const batchId = typeof params?.batchId === 'string' ? params.batchId : undefined;

  if (!session) {
    const redirectTarget = `/checkout${productId ? `?productId=${productId}` : ''}`;
    redirect(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }

  await connectToDatabase();
  const userDoc = await UserModel.findById(session.userId);
  if (!userDoc) {
    redirect('/login');
  }

  if (!productId) {
    return (
      <div className="py-16">
        <Container>
          <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Product Selected</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Please select a course from our catalog to proceed with enrollment and checkout.
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Browse Course Catalog
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const marketCode = await getResolvedMarketCode(params);
  let selectedBatch: IBatchSafeDTO | null = null;
  if (batchId) {
    try {
      const candidate = await BatchService.getBatchById(batchId);
      if (candidate.marketCode !== marketCode || candidate.status !== 'enrolling') {
        selectedBatch = null;
      } else {
        selectedBatch = candidate;
      }
    } catch {
      selectedBatch = null;
    }
  }
  const products = await StoreDiscoveryService.getProductOffersForMarket(marketCode);
  const selectedProduct = products.find((p) => p.id === productId);

  if (!selectedProduct) {
    return (
      <div className="py-16">
        <Container>
          <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Course Unavailable</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              The requested course or product was not found or is currently not available for purchase.
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Return to Catalog
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  if (!selectedProduct.offers || selectedProduct.offers.length === 0) {
    return (
      <div className="py-16">
        <Container>
          <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Offer Not Available</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              This course is currently not offered in the {marketCode} market.
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Explore Other Courses
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const offer = selectedProduct.offers[0];

  return (
    <div className="py-10 space-y-8">
      <Section className="py-6 bg-slate-100/60 dark:bg-slate-900/40">
        <Container>
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Secure Checkout</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Complete your enrollment for {selectedProduct.name} ({marketCode} Market)
            </p>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="max-w-5xl mx-auto">
            <CheckoutForm
              user={userDoc.toSafeProfile()}
              product={{
                id: selectedProduct.id,
                title: selectedProduct.name,
                description: `BIM LMS Course Product (${selectedProduct.sku})`,
              }}
              batch={selectedBatch ? {
                id: selectedBatch.id,
                name: selectedBatch.name,
                startDate: selectedBatch.startDate,
                endDate: selectedBatch.endDate,
              } : null}
              offer={{
                id: offer.id,
                basePriceMinorUnits: offer.priceMinorUnits,
                currency: offer.currency,
                marketCode: offer.marketCode as MarketCode,
              }}
            />
          </div>
        </Container>
      </Section>
    </div>
  );
}
