import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { getResolvedMarketCode } from '@/lib/server-market';
import { StoreDiscoveryService } from '@/core/services/store-discovery.service';
import { UserModel } from '@/core/domain/user.model';
import { connectToDatabase } from '@/lib/db';
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { MarketCode } from '@/core/domain/domain-types';

export const revalidate = 0;

interface CheckoutPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const session = await getSessionFromCookies();
  const params = searchParams ? await searchParams : undefined;
  const productId = typeof params?.productId === 'string' ? params.productId : undefined;

  if (!session) {
    const redirectTarget = `/checkout${productId ? `?productId=${productId}` : ''}`;
    redirect(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }

  await connectToDatabase();
  const userDoc = await UserModel.findById(session.userId);
  if (!userDoc) {
    redirect('/login');
  }

  const marketCode = await getResolvedMarketCode(params);
  const products = await StoreDiscoveryService.getProductOffersForMarket(marketCode);

  let selectedProduct = products.find((p) => p.id === productId);
  if (!selectedProduct && products.length > 0) {
    selectedProduct = products[0];
  }

  if (!selectedProduct || !selectedProduct.offers || selectedProduct.offers.length === 0) {
    return (
      <div className="py-16">
        <Container>
          <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Active Offer Found</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              This course or product is currently not available for purchase in the {marketCode} market.
            </p>
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
