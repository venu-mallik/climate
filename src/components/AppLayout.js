'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Layout, Menu } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

const { Sider, Header, Content } = Layout;

export const MENU_ITEMS = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'climate', label: 'Climate', path: '/climate' },
  { key: 'timescales', label: 'Time Scales', path: '/timescales' },
  { key: 'planet-degrees', label: 'Planet Degrees', path: '/planet-degrees' },
  { key: 'sky', label: 'Sky', path: '/sky' },
  { key: 'geoanalyzer', label: 'GeoAnalyzer', path: '/geoanalyzer' },
  { key: 'population', label: 'Population', path: '/population' },
  { key: 'toll', label: 'Toll Dashboard', path: '/toll-dashboard.html' }
];

const pathToKey = Object.fromEntries(MENU_ITEMS.map((m) => [m.path, m.key]));
const keyToLabel = Object.fromEntries(MENU_ITEMS.map((m) => [m.key, m.label]));

export default function AppLayout({ title, fullscreen = false, children }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 992) setCollapsed(true);
  }, []);

  const activeKey = pathToKey[router.pathname] || 'home';
  const currentTitle = title || keyToLabel[activeKey] || 'Home';

  const onMenuClick = ({ key }) => {
    const item = MENU_ITEMS.find((m) => m.key === key);
    if (item && item.path !== router.pathname) router.push(item.path);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="dark"
        collapsible
        trigger={null}
        breakpoint="lg"
        width={220}
        collapsedWidth={0}
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{ zIndex: 1030, boxShadow: collapsed ? 'none' : '2px 0 8px rgba(0,0,0,0.15)' }}
      >
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden'
          }}
        >
          CLIMATE
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeKey]}
          items={MENU_ITEMS}
          onClick={onMenuClick}
          style={{ height: 'calc(100% - 48px)', overflowY: 'auto', borderRight: 0 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            height: 48,
            lineHeight: '48px',
            padding: '0 16px',
            background: '#1b3a5b',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'sticky',
            top: 0,
            zIndex: 1020
          }}
        >
          <Button
            type="text"
            aria-label="Toggle menu"
            onClick={() => setCollapsed((c) => !c)}
            style={{ color: '#fff', fontSize: 18, height: 40, width: 40, padding: 0 }}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{currentTitle}</span>
        </Header>

        <Content
          style={
            fullscreen
              ? { position: 'relative', height: 'calc(100vh - 48px)', overflow: 'hidden' }
              : { position: 'relative', padding: 12, minHeight: 'calc(100vh - 48px)' }
          }
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}