import { Suspense } from 'react';
import RouteRunView from '../_components/RouteRunView';

export const metadata = { title: 'Route — BeckYards Admin' };

export default function RouteRunPage() {
  return (
    <Suspense>
      <RouteRunView />
    </Suspense>
  );
}
