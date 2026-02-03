import { useEffect, useState } from 'react';
import { Select, Button, DatePicker, Flex, Card, Space, Tag, Table, Tooltip, Row, Col } from 'antd';
import { DownloadOutlined, LeftOutlined, RightOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Body, AstroTime, Equator, Horizon, Observer } from 'astronomy-engine';
import dayjs from 'dayjs';
import { planets, calculatePlanetDegree, getAscendant, getLahari, exportToCSV } from './PlanetUtils';

const { Option } = Select;

const ToolbarContainer = {
  background: '#ffffff',
  padding: '12px 16px',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  border: '1px solid #f0f0f0',
  width: '100%'
};

const defaultCity = {
  name: 'Vijayawada',
  lat: 16,
  lon: 80,
  elevation: 30,
  timezone: 'Asia/Kolkata'
};

const resolutions = [
  { label: '1m', value: '1min' },
  { label: '5m', value: '5min' },
  { label: '15m', value: '15min' },
  { label: '30m', value: '30min' },
  { label: '1h', value: '60min' },
  { label: '1D', value: '1day' },
  { label: '1W', value: '1week' },
  { label: '1M', value: '1month' },
  { label: '3M', value: '3month' },
  { label: '6M', value: '6month' },
  { label: '1Y', value: '1year' },
  { label: '5Y', value: '5year' },
  { label: '10Y', value: '10year' }
];

const signNames = {
  1: { sign: 'Aries', name: 'Mesha', symbol: '♈' },
  2: { sign: 'Taurus', name: 'Vrishabha', symbol: '♉' },
  3: { sign: 'Gemini', name: 'Mithuna', symbol: '♊' },
  4: { sign: 'Cancer', name: 'Karka', symbol: '♋' },
  5: { sign: 'Leo', name: 'Simha', symbol: '♌' },
  6: { sign: 'Virgo', name: 'Kanya', symbol: '♍' },
  7: { sign: 'Libra', name: 'Tula', symbol: '♎' },
  8: { sign: 'Scorpio', name: 'Vrishchika', symbol: '♏' },
  9: { sign: 'Sagittarius', name: 'Dhanu', symbol: '♐' },
  10: { sign: 'Capricorn', name: 'Makara', symbol: '♑' },
  11: { sign: 'Aquarius', name: 'Kumbha', symbol: '♒' },
  12: { sign: 'Pisces', name: 'Meena', symbol: '♓' }
};

const chartOrder = [
  [12, 1, 2, 3],
  [11, 'empty', 'empty', 4],
  [10, 'empty', 'empty', 5],
  [9, 8, 7, 6]
];

function getSignNumber(degree) {
  return Math.floor(degree / 30) + 1;
}

function getPositionInSign(degree) {
  return degree % 30;
}

export default function HousesSouthIndian() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [resolution, setResolution] = useState('1day');
  const [selectedPlanets, setSelectedPlanets] = useState(
    planets.map(p => p.name)
  );
  const [lahiri, setLahiri] = useState(23.5);
  const [planetData, setPlanetData] = useState([]);
  const [signPlanets, setSignPlanets] = useState({});
  const [ascendant, setAscendant] = useState(0);
  const [csvData, setCsvData] = useState([]);

  const obs = new Observer(defaultCity.lat, defaultCity.lon, defaultCity.elevation);

  useEffect(() => {
    const l = getLahari(selectedDate);
    setLahiri(l);
  }, [selectedDate]);

  useEffect(() => {
    const asc = getAscendant(selectedDate, obs, lahiri);
    setAscendant(asc);

    const data = [];
    const signData = {};

    for (let i = 1; i <= 12; i++) {
      signData[i] = [];
    }

    planets
      .filter(p => selectedPlanets.includes(p.name))
      .forEach(planet => {
        const degree = calculatePlanetDegree(planet.body, selectedDate, obs, lahiri);
        const signNum = getSignNumber(degree);
        const posInSign = getPositionInSign(degree);

        const planetInfo = {
          name: planet.name,
          color: planet.color,
          degree,
          sign: signNum,
          signInfo: signNames[signNum],
          positionInSign: posInSign
        };

        data.push(planetInfo);
        signData[signNum].push(planetInfo);
      });

    setPlanetData(data);
    setSignPlanets(signData);
  }, [selectedDate, selectedPlanets, lahiri]);

  useEffect(() => {
    const csv = planetData.map(p => ({
      planet: p.name,
      d1: p.sign,
      sign: p.signInfo?.sign,
      degree: p.degree.toFixed(2),
      pos: p.positionInSign.toFixed(2)
    }));
    setCsvData(csv);
  }, [planetData]);

  const handlePrev = () => {
    const days = resolution === '1day' ? 1 : resolution === '1week' ? 7 : resolution === '1month' ? 30 : 1;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - days);
    setSelectedDate(newDate);
  };

  const handleNext = () => {
    const days = resolution === '1day' ? 1 : resolution === '1week' ? 7 : resolution === '1month' ? 30 : 1;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleDateChange = (date) => {
    if (date) {
      setSelectedDate(date.toDate());
    }
  };

  const handleExportCSV = () => {
    const filename = `sky_${selectedDate.toISOString().split('T')[0]}_${resolution}.csv`;
    exportToCSV(csvData, filename);
  };

  const tableColumns = [
    {
      title: 'Planet',
      dataIndex: 'name',
      key: 'name',
      width: 70,
      render: (v, r) => (
        <Tag color={r.color} style={{ fontSize: 10, margin: 0, borderRadius: 3 }}>
          {v}
        </Tag>
      )
    },
    {
      title: 'Sign / Degree',
      key: 'signDegree',
      width: 140,
      render: (_, r) => (
        <Space size={2}>
          <Tag color="blue" style={{ fontSize: 9, margin: 0, borderRadius: 2, padding: '0 3px' }}>
            {r.sign}
          </Tag>
          <span style={{ fontSize: 10 }}>
            {r.signInfo?.symbol} {r.signInfo?.sign}
          </span>
        </Space>
      )
    },
    {
      title: 'Position',
      dataIndex: 'positionInSign',
      key: 'pos',
      width: 60,
      render: (v) => <span style={{ fontSize: 10 }}>{v.toFixed(2)}°</span>
    }
  ];

  const renderChartCell = (cell) => {
    if (cell === 'empty') {
      return (
        <div style={{
          backgroundColor: 'rgba(15, 15, 20, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 3,
          height: '100%'
        }}>
          <span style={{ color: '#2a2a35', fontSize: 14 }}>☐</span>
        </div>
      );
    }

    const signNum = cell;
    const planetsInSign = signPlanets[signNum] || [];
    const signInfo = signNames[signNum];
    const ascSignNum = Math.floor(ascendant / 30) + 1;
    const isAscSign = signNum === ascSignNum;

    return (
      <Tooltip
        title={planetsInSign.map(p => `${p.name}: ${p.positionInSign.toFixed(1)}°`).join(', ') || 'Empty'}
      >
        <div style={{
          backgroundColor: isAscSign ? 'rgba(0, 175, 80, 0.12)' : 'rgba(25, 25, 35, 0.95)',
          padding: '4px 6px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 70,
          height: 70,
          borderRadius: 4,
          border: isAscSign ? '1px solid rgba(0, 175, 80, 0.6)' : '1px solid rgba(60, 60, 75, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ 
              fontSize: 10, 
              color: isAscSign ? '#00af50' : '#6a6a7a',
              fontWeight: 600
            }}>
              {signNum}
            </span>
            <span style={{ fontSize: 13 }}>{signInfo?.symbol}</span>
          </div>
          <div style={{
            fontSize: 8,
            color: '#8a8a9a',
            textAlign: 'center',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {signInfo?.sign}
          </div>
          <div style={{
            fontSize: 9,
            color: '#aaa',
            textAlign: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 2,
            minHeight: 18
          }}>
            {planetsInSign.map(p => (
              <span key={p.name} style={{ 
                color: p.color, 
                fontWeight: 600, 
                fontSize: 10
              }}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </Tooltip>
    );
  };

  const ascSignNum = Math.floor(ascendant / 30) + 1;
  const ascSignInfo = signNames[ascSignNum];

  return (
    <div style={{ padding: 8 }}>
      <Row gutter={[8, 8]}>
        <Col xs={24}>
          <Flex vertical gap={12} style={ToolbarContainer}>
  <Flex wrap="wrap" gap={4} align="center" justify="space-between">
    
    {/* Primary Controls Group */}
    <Flex wrap="wrap" gap={4} style={{ flex: '1 1 300px' }}>
      <Select
        mode="tags"
        placeholder="Select Planets"
        value={selectedPlanets}
        onChange={setSelectedPlanets}
        maxTagCount="responsive"
        style={{ minWidth: 160, flex: 1 }}
        variant="filled" // Softer look than 'outlined'
      >
        {planets.map(p => (
          <Option key={p.name} value={p.name}>{p.name}</Option>
        ))}
      </Select>
      <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExportCSV} 
            type="primary"
            shape="circle"
          />
      </Flex>
      <Flex gap={4} align="center">
      <DatePicker
        value={dayjs(selectedDate)}
        onChange={handleDateChange}
        showTime
        variant="filled"
        style={{ width: 180 }}
      />
      <Select 
        value={resolution}
        onChange={setResolution}
        variant="filled"
        style={{ width: 65 }}
      >
        {resolutions.map(r => (
          <Option key={r.value} value={r.value}>{r.label}</Option>
        ))}
      </Select>

        <Button 
          icon={<LeftOutlined />} 
          onClick={handlePrev} 
          shape="circle" 
          type="text" 
        />
        <Button 
          icon={<RightOutlined />} 
          onClick={handleNext} 
          shape="circle" 
          type="text" 
        />
    </Flex>
  </Flex>
</Flex>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontSize: 12, fontWeight: 600 }}>Rasi Chart (D1)</span>}
            style={{ 
              backgroundColor: 'rgba(20, 20, 30, 0.95)',
              border: '1px solid rgba(60, 60, 80, 0.4)',
              borderRadius: 8
            }}
            bodyStyle={{ padding: 8 }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 3,
              backgroundColor: 'rgba(40, 40, 55, 0.5)',
              padding: 4,
              borderRadius: 6,
              border: '1px solid rgba(60, 60, 80, 0.4)'
            }}>
              {chartOrder.map((row, rowIdx) => (
                row.map((cell, colIdx) => (
                  <div key={`${rowIdx}-${colIdx}`} style={{ borderRadius: 3 }}>
                    {renderChartCell(cell)}
                  </div>
                ))
              ))}
            </div>

            <div style={{
              marginTop: 8,
              padding: 8,
              backgroundColor: 'rgba(25, 25, 38, 0.95)',
              borderRadius: 6,
              border: '1px solid rgba(60, 60, 80, 0.4)'
            }}>
              <div style={{ 
                fontSize: 10, 
                color: '#7a7a8a', 
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <InfoCircleOutlined /> Ascendant
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                {ascendant.toFixed(2)}°
              </div>
              <div style={{ fontSize: 11, color: '#00af50', fontWeight: 500, marginTop: 2 }}>
                {ascSignInfo?.symbol} {ascSignInfo?.sign} ({ascSignInfo?.name})
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontSize: 12, fontWeight: 600 }}>Positions</span>}
            style={{ 
              backgroundColor: 'rgba(20, 20, 30, 0.95)',
              border: '1px solid rgba(60, 60, 80, 0.4)',
              borderRadius: 8
            }}
            bodyStyle={{ padding: 8 }}
          >
            <Table
              dataSource={planetData}
              columns={tableColumns}
              pagination={false}
              size="small"
              scroll={{ x: 320, y: 250 }}
              rowKey={(record) => `${record.name}-${record.degree}`}
              style={{ backgroundColor: 'transparent', borderRadius: 6 }}
              rowStyle={{ backgroundColor: 'rgba(25, 25, 38, 0.6)' }}
              headerStyle={{ backgroundColor: 'rgba(35, 35, 50, 0.95)', fontSize: 10, fontWeight: 600 }}
            />
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            style={{ 
              backgroundColor: 'rgba(20, 20, 30, 0.95)',
              border: '1px solid rgba(60, 60, 80, 0.4)',
              borderRadius: 8
            }}
            bodyStyle={{ padding: 8 }}
          >
            <Space size={6} wrap style={{ display: 'flex', flexWrap: 'wrap' }}>
              <Tag style={{ margin: 0, borderRadius: 3, fontSize: 10 }}>Lahiri: {lahiri.toFixed(2)}°</Tag>
              <Tag style={{ margin: 0, borderRadius: 3, fontSize: 10 }}>ASC: {ascendant.toFixed(2)}°</Tag>
              <Tag style={{ margin: 0, borderRadius: 3, fontSize: 10 }}>{defaultCity.name}</Tag>
              <Tag style={{ margin: 0, borderRadius: 3, fontSize: 10 }}>Vedic (D1)</Tag>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
