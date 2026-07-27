import { useEffect, useState } from 'react';
import { Select, Button, DatePicker, Flex, Card, Space, Tag, Table, Tooltip, Row, Col } from 'antd';
import { DownloadOutlined, LeftOutlined, RightOutlined, InfoCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Observer } from 'astronomy-engine';
import dayjs from 'dayjs';
import { planets, calculatePlanetDegree, getAscendant, getLahari, getD9Sign, exportToCSV } from './PlanetUtils';

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

function decimalToHms(decimal) {
  const hours = Math.floor(decimal);
  const minutesDecimal = (decimal - hours) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.round((minutesDecimal - minutes) * 60);
  return `${hours}°${minutes}'${seconds}"`;
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
  const [d9SignPlanets, setD9SignPlanets] = useState({});
  const [ascendant, setAscendant] = useState(0);
  const [ascD9Sign, setAscD9Sign] = useState(0);
  const [csvData, setCsvData] = useState([]);

  const obs = new Observer(defaultCity.lat, defaultCity.lon, defaultCity.elevation);

  useEffect(() => {
    const l = getLahari(selectedDate);
    setLahiri(l);
  }, [selectedDate]);

  useEffect(() => {
    const asc = getAscendant(selectedDate, obs, lahiri);
    setAscendant(asc);
    setAscD9Sign(getD9Sign(asc));

    const data = [];
    const signData = {};
    const d9Data = {};

    for (let i = 1; i <= 12; i++) {
      signData[i] = [];
      d9Data[i] = [];
    }

    planets
      .filter(p => selectedPlanets.includes(p.name))
      .forEach(planet => {
        const degree = calculatePlanetDegree(planet.body, selectedDate, obs, lahiri);
        const signNum = getSignNumber(degree);
        const posInSign = getPositionInSign(degree);
        const d9Sign = getD9Sign(degree);

        const planetInfo = {
          name: planet.name,
          color: planet.color,
          degree,
          sign: signNum,
          signInfo: signNames[signNum],
          positionInSign: posInSign,
          d9Sign,
          d9SignInfo: signNames[d9Sign]
        };

        data.push(planetInfo);
        signData[signNum].push(planetInfo);
        d9Data[d9Sign].push(planetInfo);
      });

    setPlanetData(data);
    setSignPlanets(signData);
    setD9SignPlanets(d9Data);
  }, [selectedDate, selectedPlanets, lahiri]);

  useEffect(() => {
    const csv = planetData.map(p => ({
      planet: p.name,
      d1_sign: p.sign,
      d1_sign_name: p.signInfo?.sign,
      d1_degree: p.degree.toFixed(2),
      d1_pos: p.positionInSign.toFixed(2),
      d9_sign: p.d9Sign,
      d9_sign_name: p.d9SignInfo?.sign
    }));
    setCsvData(csv);
  }, [planetData]);

  const shiftDate = (dir) => {
    const newDate = new Date(selectedDate);
    const step = (mult) => {
      switch (resolution) {
        case '1min': newDate.setMinutes(newDate.getMinutes() + mult); break;
        case '5min': newDate.setMinutes(newDate.getMinutes() + 5 * mult); break;
        case '15min': newDate.setMinutes(newDate.getMinutes() + 15 * mult); break;
        case '30min': newDate.setMinutes(newDate.getMinutes() + 30 * mult); break;
        case '60min': newDate.setHours(newDate.getHours() + mult); break;
        case '1day': newDate.setDate(newDate.getDate() + mult); break;
        case '1week': newDate.setDate(newDate.getDate() + 7 * mult); break;
        case '1month': newDate.setMonth(newDate.getMonth() + mult); break;
        case '3month': newDate.setMonth(newDate.getMonth() + 3 * mult); break;
        case '6month': newDate.setMonth(newDate.getMonth() + 6 * mult); break;
        case '1year': newDate.setFullYear(newDate.getFullYear() + mult); break;
        case '5year': newDate.setFullYear(newDate.getFullYear() + 5 * mult); break;
        case '10year': newDate.setFullYear(newDate.getFullYear() + 10 * mult); break;
        default: newDate.setDate(newDate.getDate() + mult);
      }
    };
    step(dir);
    setSelectedDate(newDate);
  };

  const handleDateChange = (date) => {
    if (date) setSelectedDate(date.toDate());
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
      width: 60,
      render: (v, r) => (
        <Tag color={r.color} style={{ fontSize: 10, margin: 0, borderRadius: 3 }}>
          {v}
        </Tag>
      )
    },
    {
      title: 'D1',
      key: 'd1',
      width: 140,
      render: (_, r) => (
        <Space size={2}>
          <Tag color="blue" style={{ fontSize: 9, margin: 0, borderRadius: 2, padding: '0 3px' }}>
            {r.sign}
          </Tag>
          <span style={{ fontSize: 10 }}>
            {r.signInfo?.symbol} {r.signInfo?.sign}
          </span>
          <span style={{ fontSize: 9, color: '#888' }}>
            {decimalToHms(r.positionInSign)}
          </span>
        </Space>
      )
    },
    {
      title: 'D9',
      key: 'd9',
      width: 80,
      render: (_, r) => (
        <Space size={2}>
          <Tag color="orange" style={{ fontSize: 9, margin: 0, borderRadius: 2, padding: '0 3px' }}>
            {r.d9Sign}
          </Tag>
          <span style={{ fontSize: 10 }}>
            {r.d9SignInfo?.symbol} {r.d9SignInfo?.sign}
          </span>
        </Space>
      )
    }
  ];

  const renderChartCell = (cell, isD9 = false) => {
    if (cell === 'empty') {
      return (
        <div className="chart-cell chart-cell-empty">
          <span>☐</span>
        </div>
      );
    }

    const signNum = cell;
    const planetsInSign = isD9 ? (d9SignPlanets[signNum] || []) : (signPlanets[signNum] || []);
    const signInfo = signNames[signNum];
    const ascSignNum = isD9 ? ascD9Sign : (Math.floor(ascendant / 30) + 1);
    const isAscSign = signNum === ascSignNum;

    return (
      <Tooltip
        title={planetsInSign.map(p => `${p.name}: ${p.positionInSign.toFixed(1)}°`).join(', ') || 'Empty'}
      >
        <div className={`chart-cell ${isAscSign ? 'chart-cell-asc' : ''}`}>
          <div className="chart-cell-header">
            <span className="chart-cell-num">{signNum}</span>
            <span className="chart-cell-symbol">{signInfo?.symbol}</span>
          </div>
          <div className="chart-cell-sign">{signInfo?.sign}</div>
          <div className="chart-cell-planets">
            {planetsInSign.map(p => (
              <span key={p.name} style={{ color: p.color }}>{p.name}</span>
            ))}
          </div>
        </div>
      </Tooltip>
    );
  };

  const ascSignNum = Math.floor(ascendant / 30) + 1;
  const ascSignInfo = signNames[ascSignNum];
  const ascD9SignInfo = signNames[ascD9Sign];

  return (
    <div className="sky-container">
      <Row gutter={[8, 8]}>
        <Col xs={24}>
          <Flex vertical gap={12} style={ToolbarContainer}>
            <Flex wrap="wrap" gap={4} align="center" justify="space-between">
              <Flex wrap="wrap" gap={4} style={{ flex: '1 1 280px' }}>
                <Select
                  mode="tags"
                  placeholder="Planets"
                  value={selectedPlanets}
                  onChange={setSelectedPlanets}
                  maxTagCount="responsive"
                  style={{ minWidth: 120, flex: 1 }}
                  variant="filled"
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
                  size="small"
                />
              </Flex>
              <Flex gap={4} align="center" wrap="wrap">
                <DatePicker
                  value={dayjs(selectedDate)}
                  onChange={handleDateChange}
                  showTime
                  variant="filled"
                  size="small"
                  style={{ width: 155 }}
                />
                <Select
                  value={resolution}
                  onChange={setResolution}
                  variant="filled"
                  size="small"
                  style={{ width: 58 }}
                >
                  {resolutions.map(r => (
                    <Option key={r.value} value={r.value}>{r.label}</Option>
                  ))}
                </Select>
                <Button icon={<LeftOutlined />} onClick={() => shiftDate(-1)} shape="circle" type="text" size="small" />
                <Button icon={<RightOutlined />} onClick={() => shiftDate(1)} shape="circle" type="text" size="small" />
              </Flex>
            </Flex>
          </Flex>
        </Col>

        <Col xs={24} sm={12}>
          <Card
            title={
              <span className="card-title">
                Rasi Chart (D1)
                <Tag color="green" className="card-tag">{ascSignInfo?.symbol} ASC {ascSignInfo?.sign}</Tag>
              </span>
            }
            className="chart-card"
            styles={{ body: { padding: 6 } }}
          >
            <div className="chart-grid">
              {chartOrder.map((row, rowIdx) => (
                row.map((cell, colIdx) => (
                  <div key={`d1-${rowIdx}-${colIdx}`}>{renderChartCell(cell, false)}</div>
                ))
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12}>
          <Card
            title={
              <span className="card-title">
                Navamsha Chart (D9)
                <Tag color="orange" className="card-tag">{ascD9SignInfo?.symbol} ASC D9 {ascD9SignInfo?.sign}</Tag>
              </span>
            }
            className="chart-card"
            styles={{ body: { padding: 6 } }}
          >
            <div className="chart-grid">
              {chartOrder.map((row, rowIdx) => (
                row.map((cell, colIdx) => (
                  <div key={`d9-${rowIdx}-${colIdx}`}>{renderChartCell(cell, true)}</div>
                ))
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            title={<span className="card-title">Planetary Positions</span>}
            className="chart-card"
            styles={{ body: { padding: 6 } }}
          >
            <Table
              dataSource={planetData}
              columns={tableColumns}
              pagination={false}
              size="small"
              scroll={{ x: 320, y: 250 }}
              rowKey={(record) => `${record.name}-${record.degree}`}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Flex vertical gap={8}>
            <Card className="chart-card" styles={{ body: { padding: '10px 14px' } }}>
              <div className="asc-label">
                <InfoCircleOutlined /> Ascendant (Lagna)
              </div>
              <div className="asc-value">
                <span className="asc-sign">{ascSignInfo?.symbol} {ascSignInfo?.sign}</span>
                <span className="asc-deg">{ascendant.toFixed(2)}°</span>
                <Tag color="green" className="asc-tag">{ascSignInfo?.name}</Tag>
              </div>
              <div className="d9-asc">
                D9 Navamsha: <span className="d9-asc-value">{ascD9SignInfo?.symbol} {ascD9SignInfo?.sign}</span>
              </div>
            </Card>

            <Card className="chart-card" styles={{ body: { padding: '8px 14px' } }}>
              <Flex wrap="wrap" gap={4} align="center">
                <Tag className="info-tag">Ayanamsa: {lahiri.toFixed(2)}°</Tag>
                <Tag className="info-tag"><EnvironmentOutlined /> {defaultCity.name}</Tag>
                <Tag className="info-tag">D1 + D9</Tag>
                <Tag className="info-tag">ASC: {ascendant.toFixed(2)}°</Tag>
              </Flex>
            </Card>
          </Flex>
        </Col>
      </Row>

      <style jsx>{`
        .sky-container {
          padding: 8px;
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (max-width: 576px) {
          .sky-container {
            padding: 4px;
          }
        }
      `}</style>

      <style global jsx>{`
        .card-title {
          font-size: 12px;
          font-weight: 600;
        }
        .card-tag {
          margin-left: 8px;
          font-size: 9px;
          border-radius: 3px;
        }
        .chart-card {
          background-color: rgba(20, 20, 30, 0.95) !important;
          border: 1px solid rgba(60, 60, 80, 0.4) !important;
          border-radius: 8px !important;
        }
        .chart-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 3px;
          background-color: rgba(40, 40, 55, 0.5);
          padding: 4px;
          border-radius: 6px;
          border: 1px solid rgba(60, 60, 80, 0.4);
        }
        .chart-cell {
          background-color: rgba(25, 25, 35, 0.95);
          padding: 4px 6px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 70px;
          height: 70px;
          border-radius: 4px;
          border: 1px solid rgba(60, 60, 75, 0.5);
        }
        .chart-cell.chart-cell-asc {
          background-color: rgba(0, 175, 80, 0.12);
          border: 1px solid rgba(0, 175, 80, 0.6);
        }
        .chart-cell-empty {
          background-color: rgba(15, 15, 20, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chart-cell-empty span {
          color: #2a2a35;
          font-size: 14px;
        }
        .chart-cell-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .chart-cell-num {
          font-size: 10px;
          color: #6a6a7a;
          font-weight: 600;
        }
        .chart-cell-asc .chart-cell-num {
          color: #00af50;
        }
        .chart-cell-symbol {
          font-size: 13px;
        }
        .chart-cell-sign {
          font-size: 8px;
          color: #8a8a9a;
          text-align: center;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chart-cell-planets {
          font-size: 9px;
          color: #aaa;
          text-align: center;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 2px;
          min-height: 18px;
        }
        .chart-cell-planets span {
          font-weight: 600;
          font-size: 10px;
        }
        .asc-label {
          font-size: 10px;
          color: #7a7a8a;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .asc-value {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }
        .asc-sign {
          font-size: 18px;
          font-weight: 700;
          color: #00af50;
        }
        .asc-deg {
          font-size: 12px;
          color: #aaa;
        }
        .asc-tag {
          font-size: 9px;
          border-radius: 3px;
          margin: 0;
        }
        .d9-asc {
          margin-top: 6px;
          font-size: 11px;
          color: #888;
        }
        .d9-asc-value {
          color: #ffa500;
          font-weight: 600;
        }
        .info-tag {
          margin: 0;
          border-radius: 3px;
          font-size: 10px;
        }

        @media (max-width: 576px) {
          .chart-cell {
            min-height: 56px;
            height: 56px;
            padding: 3px 4px;
          }
          .chart-cell-num {
            font-size: 9px;
          }
          .chart-cell-symbol {
            font-size: 11px;
          }
          .chart-cell-sign {
            font-size: 7px;
          }
          .chart-cell-planets span {
            font-size: 8px;
          }
          .chart-grid {
            gap: 2px;
            padding: 3px;
          }
          .asc-sign {
            font-size: 15px;
          }
          .card-title {
            font-size: 11px;
          }
        }

        @media (min-width: 577px) and (max-width: 992px) {
          .chart-cell {
            min-height: 62px;
            height: 62px;
          }
        }
      `}</style>
    </div>
  );
}