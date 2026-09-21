'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format-currency';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IUserSafeProfile, MarketCode } from '@/core/domain/domain-types';

interface CheckoutFormProps {
  user: IUserSafeProfile;
  product: {
    id: string;
    title: string;
    description: string;
  };
  offer: {
    id: string;
    basePriceMinorUnits: number;
    currency: string;
    marketCode: MarketCode;
  };
}

export function CheckoutForm({ user, product, offer }: CheckoutFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.fullName || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [country, setCountry] = useState(offer.marketCode === 'MY' ? 'Malaysia' : 'Singapore');
  const [addressLine1, setAddressLine1] = useState('');
  const [couponCode, setCouponCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !phone.trim() || !country.trim()) {
      setError('Please fill out all required billing details.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiPost<{
        orderNumber: string;
        paymentAttemptId: string;
        checkoutUrl?: string;
      }>('/api/v1/store/checkout', {
        productId: product.id,
        couponCode: couponCode.trim() || undefined,
        billingDetails: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          country: country.trim(),
          addressLine1: addressLine1.trim() || undefined,
        },
      });

      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        router.push(`/dashboard/orders`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Checkout failed. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left 2 Cols: Customer Billing Details */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Billing & Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-md p-4 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    placeholder="+65 9123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Singapore">Singapore</option>
                    <option value="Malaysia">Malaysia</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="addressLine1" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Address Line <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="addressLine1"
                    type="text"
                    placeholder="Street / Unit Number"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="couponCode" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Promo / Coupon Code <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="couponCode"
                  type="text"
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white uppercase"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing Order...' : `Complete Order & Pay (${formatCurrency(offer.basePriceMinorUnits, offer.currency)})`}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Col: Server-Authoritative Order Summary */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Order Summary</CardTitle>
              <Badge variant="secondary" className="uppercase font-bold">
                {offer.marketCode} Market
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                {product.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                {product.description}
              </p>
            </div>

            <div className="border-t border-b border-slate-100 dark:border-slate-800 py-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Course Price ({offer.currency})</span>
                <span>{formatCurrency(offer.basePriceMinorUnits, offer.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Discounts</span>
                <span>{formatCurrency(0, offer.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Tax</span>
                <span>Included</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 font-bold text-slate-900 dark:text-white text-lg">
              <span>Total Due</span>
              <span className="text-blue-600 dark:text-blue-400">
                {formatCurrency(offer.basePriceMinorUnits, offer.currency)}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-md text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">🔒 Server-Authoritative Checkout</p>
              <p>Prices and currencies are verified on the server for {offer.marketCode} market compliance.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
