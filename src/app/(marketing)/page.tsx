import React from 'react';
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MarketingHomePage() {
  return (
    <Section>
      <Container>
        <div className="max-w-3xl mx-auto text-center py-12">
          <Badge variant="default" className="mb-4">Phase 2A Step 2: Foundation Active</Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
            Multi-Market Professional BIM LMS Platform
          </h1>
          <p className="text-lg text-slate-600">
            Modular learning management platform for professional BIM training across Singapore (SG) and Malaysia (MY).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Market Architecture</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Server-resolved market boundary enforced via Edge Middleware and authoritative x-market-code headers.
              </p>
              <div className="flex gap-2">
                <Badge variant="secondary">Singapore (SG)</Badge>
                <Badge variant="secondary">Malaysia (MY)</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Invariants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Decoupled Course engine, commercial products/offers, and batch schedules.
              </p>
              <div className="flex gap-2">
                <Badge variant="success">Next.js 16 App Router</Badge>
                <Badge variant="success">Tailwind CSS</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </Section>
  );
}
