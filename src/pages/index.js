'use client';

import { useRouter } from 'next/router';
import { Button, Card, Col, Row, Tag } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import AppLayout, { MENU_ITEMS } from '@/components/AppLayout';

const DETAILS = {
  climate: {
    title: 'Climate',
    description: 'Weather, UV, magnetism and planetary rise/set analysis for a chosen city across the year.'
  },
  timescales: {
    title: 'Time Scales',
    description: 'Compare two dates across milliseconds to years using SpaceTime.'
  },
  'planet-degrees': {
    title: 'Planet Degrees',
    description: 'Track planetary longitudes over time ranges with D1/D9 charts and CSV export.'
  },
  sky: {
    title: 'Sky',
    description: 'South-Indian style Rasi (D1) and Navamsha (D9) charts with ascendant and planetary positions.'
  },
  geoanalyzer: {
    title: 'GeoAnalyzer',
    description: 'Draw zones on the map and pull live GIS data: areas, roads and buildings via Overpass.'
  },
  population: {
    title: 'Population',
    description: 'Estimate population inside one or many drawn polygons using GHSL 2025 grid data.'
  },
  toll: {
    title: 'Toll Dashboard',
    description: 'Legacy toll data dashboard.'
  }
};

export default function HomePage() {
  const router = useRouter();
  const tools = MENU_ITEMS.filter((m) => m.path !== '/');

  return (
    <AppLayout title="Home">
      <Card style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <h1 style={{ margin: '0 0 4px' }}>Climate Tools Hub</h1>
            <p style={{ margin: 0, color: '#888' }}>
              Select a tool from the menu, or jump straight in below. Each tool lives on its own URL, so you can bookmark and share it directly.
            </p>
          </Col>

          {tools.map((tool) => {
            const d = DETAILS[tool.key] || {};
            return (
              <Col xs={24} sm={12} lg={8} key={tool.key}>
                <Card
                  hoverable
                  onClick={() => router.push(tool.path)}
                  title={<Tag color="blue">{d.title || tool.label}</Tag>}
                  style={{ height: '100%' }}
                  styles={{ body: { display: 'flex', flexDirection: 'column', gap: 8, height: 150 } }}
                >
                  <p style={{ margin: 0, color: '#555', flex: 1 }}>{d.description || tool.label}</p>
                  <Button type="link" style={{ padding: 0 }} icon={<ArrowRightOutlined />} iconPosition="end">
                    Open {d.title || tool.label}
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    </AppLayout>
  );
}