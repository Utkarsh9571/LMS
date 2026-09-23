import React from 'react';
import Link from 'next/link';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { OrderModel } from '@/core/domain/order.model';
import { ProductModel } from '@/core/domain/product.model';
import { formatCurrency } from '@/lib/format-currency';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { RetryPaymentButton } from '@/components/orders/retry-payment-button';
import { CreditCard, Calendar, ShoppingBag, ArrowRight } from 'lucide-react';

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
      <PageHeader
        title="Orders & Invoices"
        description="View your commercial purchase history, transaction receipts, and payment status."
        badge={<Badge variant="default">{orders.length} Orders</Badge>}
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No Orders Logged"
          description="You have not placed any commercial orders yet."
          action={
            <Link href="/courses">
              <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Browse Course Catalog
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const product = productMap.get(order.productId.toString());
            const isPaid = order.status === 'paid';
            const isRefunded = order.status === 'refunded';
            const isCancelled = order.status === 'cancelled';
            const isFailedOrPending =
              order.status === 'pending_payment' || order.status === 'payment_failed';

            return (
              <Card key={order._id.toString()} className="overflow-hidden">
                <CardHeader className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {order.orderNumber}
                    </span>
                    <Badge
                      variant={
                        isPaid
                          ? 'success'
                          : isRefunded
                            ? 'info'
                            : isFailedOrPending
                              ? 'destructive'
                              : 'secondary'
                      }
                      className="uppercase text-[11px] font-bold"
                    >
                      {order.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-[11px] uppercase font-bold">
                      {order.marketCode} Market
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {product?.title || 'BIM Product Enrollment'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Billed to: <span className="font-semibold text-slate-700 dark:text-slate-300">{order.billingDetails?.fullName}</span> ({order.billingDetails?.email})
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Amount</span>
                      <span className="text-xl font-extrabold text-slate-900 dark:text-white">
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
