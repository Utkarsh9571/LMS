import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';
import { PaymentCompletionClient } from '@/components/orders/payment-completion-client';

export const revalidate = 0;

export default async function PaymentCompletionPage({
  params
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await getSessionFromCookies();
  const { orderNumber } = await params;

  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(`/orders/${orderNumber}/complete`)}`);
  }

  return (
    <div className="py-16">
      <Section>
        <Container>
          <PaymentCompletionClient orderNumber={orderNumber} />
        </Container>
      </Section>
    </div>
  );
}
