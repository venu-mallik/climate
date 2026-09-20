'use client';

import AppLayout from '@/components/AppLayout';
import { TimeScales } from '@/components/timescale';

export default function TimeScalesPage() {
  return (
    <AppLayout title="Time Scales">
      <TimeScales />
    </AppLayout>
  );
}