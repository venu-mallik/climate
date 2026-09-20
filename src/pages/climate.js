'use client';

import AppLayout from '@/components/AppLayout';
import { ClimateComponent } from '@/components/climate';

const defaultCity = { name: 'Vijayawada', lat: 16, lon: 80, elevation: 30, timezone: 'Asia/Kolkata' };

export default function ClimatePage() {
  return (
    <AppLayout title="Climate">
      <ClimateComponent selectedCity={defaultCity} />
    </AppLayout>
  );
}