import React from 'react';
import Link from 'next/link';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { OrderModel } from '@/core/domain/order.model';
import { ProductModel } from '@/core/domain/product.model';
import { formatCurrency } from '@/lib/format-currency';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RetryPaymentButton } from '@/components/orders/retry-payment-button';

export const revalidate = 0;

export default async function StudentOrdersPage() {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await connectToDatabase();
  const orders = await OrderModel.find({ userId: session.userId }).sort({ createdAt: -1 });

  const productIds = orders.map((o) => o.productId);
  const products = await ProductModel.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Orders & Payment History</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          View your order history, transaction receipts, and payment status.
        </p>
      </div>

      {orders.length === 0 ? (
        <Card className="max-w-md mx-auto text-center p-8">
          <CardTitle className="text-lg mb-2">No Orders Found</CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            You have not placed any orders yet.
          </p>
          <Link href="/courses" className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md">
            Explore Courses
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const product = productMap.get(order.productId.toString());
            const isPaid = order.status === 'paid';
            const isFailedOrPending = order.status === 'pending_payment' || order.status === 'payment_failed';

            return (
              <Card key={order._id.toString()} className="overflow-hidden">
                <CardHeader className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {order.orderNumber}
                    </span>
                    <Badge variant={isPaid ? 'success' : isFailedOrPending ? 'destructive' : 'secondary'} className="uppercase text-xs font-semibold">
                      {order.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-xs uppercase font-bold">
                      {order.marketCode}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </CardHeader>
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                      {product?.title || 'LMS Product'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Billed to: {order.billingDetails?.fullName} ({order.billingDetails?.email})
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block uppercase">Total Amount</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatCurrency(order.totalMinorUnits, order.currency)}
                      </span>
                    </div>

                    {isFailedOrPending && (
                      <RetryPaymentButton orderNumber={order.orderNumber} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
