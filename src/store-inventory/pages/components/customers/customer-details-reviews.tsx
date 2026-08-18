'use client';

import { CardDate } from './components/card-date';
import type { CustomerReviewGroup } from '@/store-inventory/types';

export function CustomerDetailsReviews({ reviews }: { reviews?: CustomerReviewGroup[] }) {
  return <CardDate reviews={reviews} />;
}
