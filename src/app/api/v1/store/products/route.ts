import { NextResponse } from 'next/server';

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
  sku: string;
  name: string;
  offers: IStoreOfferDiscoveryDTO[];
}

const MOCK_STORE_PRODUCTS: Record<string, IStoreProductDiscoveryDTO[]> = {
  SG: [
    {
      id: 'prod_bim_sg_01',
      courseId: 'bim-structure-fundamentals',
      sku: 'SKU-BIM-STRUCT-SF',
      name: 'BIM Structure Fundamentals (SG)',
      offers: [
        {
          id: 'off_sg_01',
          offerCode: 'OFFER-BIM-STRUCT-SGD',
          name: 'Standard SGD Access',
          priceMinorUnits: 45000,
          currency: 'SGD',
          marketCode: 'SG',
          billingType: 'one_time'
        }
      ]
    },
    {
      id: 'prod_bim_sg_02',
      courseId: 'mep-coordination-mastery',
      sku: 'SKUMEP-COORD-SG',
      name: 'MEP Coordination Mastery (SG)',
      offers: [
        {
          id: 'off_sg_02',
          offerCode: 'OFFER-MEP-COORD-SGD',
          name: 'Standard SGD Access',
          priceMinorUnits: 65000,
          currency: 'SGD',
          marketCode: 'SG',
          billingType: 'one_time'
        }
      ]
    }
  ],
  MY: [
    {
      id: 'prod_bim_my_01',
      courseId: 'bim-structure-fundamentals',
      sku: 'SKU-BIM-STRUCT-MY',
      name: 'BIM Structure Fundamentals (MY)',
      offers: [
        {
          id: 'off_my_01',
          offerCode: 'OFFER-BIM-STRUCT-MYR',
          name: 'Standard MYR Access',
          priceMinorUnits: 120000,
          currency: 'MYR',
          marketCode: 'MY',
          billingType: 'one_time'
        }
      ]
    },
    {
      id: 'prod_bim_my_02',
      courseId: 'mep-coordination-mastery',
      sku: 'SKUMEP-COORD-MY',
      name: 'MEP Coordination Mastery (MY)',
      offers: [
        {
          id: 'off_my_02',
          offerCode: 'OFFER-MEP-COORD-MYR',
          name: 'Standard MYR Access',
          priceMinorUnits: 180000,
          currency: 'MYR',
          marketCode: 'MY',
          billingType: 'one_time'
        }
      ]
    }
  ]
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseIdParam = searchParams.get('courseId');

  const headerMarket = request.headers.get('x-market-code');
  const queryMarket = searchParams.get('market');
  const market = (headerMarket || queryMarket || 'SG').toUpperCase();
  const marketProducts = MOCK_STORE_PRODUCTS[market] || MOCK_STORE_PRODUCTS.SG;

  if (!courseIdParam) {
    return NextResponse.json(marketProducts);
  }

  const filtered = marketProducts.filter(
    (p) => p.courseId === courseIdParam || p.id === courseIdParam
  );

  return NextResponse.json(filtered);
}