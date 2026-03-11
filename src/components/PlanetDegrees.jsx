import { useEffect, useState, useMemo } from 'react';
import { Select, Button, DatePicker, Card, Space, Tag } from 'antd';
import { DownloadOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Observer } from 'astronomy-engine';
import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import { planets, generateTimeseriesData, exportToCSV, getLahari } from './PlanetUtils';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const { RangePicker } = DatePicker;

const Stars = {
  1: 'Ashwini', 2: 'Bharani', 3: 'Krittika', 4: 'Rohini',
  5: 'Mrigashirsha', 6: 'Ardra', 7: 'Punarvasu', 8: 'Pushya',
  9: 'Ashlesha', 10: 'Magha', 11: 'Poorva_Phalguni', 12: 'Uttara_Phalguni',
  13: 'Hasta', 14: 'Chitra', 15: 'Swati', 16: 'Vishakha', 17: 'Anuradha',
  18: 'Jyeshtha', 19: 'Moola', 20: 'Purva_Ashadha', 21: 'Uttara_Ashadha',
  22: 'Shravana', 23: 'Dhanishta', 24: 'Shatabhisha', 25: 'Purva_Bhadrapada',
  26: 'Uttara_Bhadrapada', 27: 'Revati', 28: 'Abhijit'
};

const { Option } = Select;

const defaultCity = {
  name: 'Vijayawada',
  lat: 16.51,
  lon: 80.63,
  elevation: 30,
  timezone: 'Asia/Kolkata'
};

const resolutions = [
  { label: '1 min', value: '1min' },
  { label: '5 min', value: '5min' },
  { label: '15 min', value: '15min' },
  { label: '30 min', value: '30min' },
  { label: '1 hour', value: '60min' },
  { label: '1 day', value: '1day' },
  { label: '1 week', value: '1week' },
  { label: '1 month', value: '1month' },
  { label: '3 months', value: '3month' },
  { label: '6 months', value: '6month' },
  { label: '1 year', value: '1year' },
  { label: '5 years', value: '5year' },
  { label: '10 years', value: '10year' }
];

const exaltationDegrees = {
  Sun: 10, Moon: 33, Mercury: 165, Venus: 357, Mars: 298,
  Jupiter: 95, Saturn: 201, Rahu: 290, Ketu: 110
};

const debilitationDegrees = {
  Sun: 190, Moon: 213, Mercury: 345, Venus: 177, Mars: 118,
  Jupiter: 275, Saturn: 21, Rahu: 110, Ketu: 290
};

function getD1(degree) {
  return Math.floor(degree / 30) + 1;
}

function getD9(degree) {
  const posInSign = degree % 30;
  const navamsa = Math.floor((posInSign * 3.333) / 30) + 1;
  return (navamsa - 1) % 9 + 1;
}

function getStar(degree) {
  return Math.floor((degree * 60) / 800) + 1;
}

function getVargottama(degree) {
  const d1 = getD1(degree);
  const posInSign = degree % 30;
  const d9 = getD9(degree);
  const d1Sign = d1;
  const d9Sign = ((d1 - 1) * 9 + d9) % 12 || 12;
  return d1Sign === d9Sign ? 'VAR' : '';
}

function getGandanta(degree) {
  const gandantaPoints = [359, 0, 1, 119, 120, 121, 239, 240, 241];
  const intDegree = Math.floor(degree);
  return gandantaPoints.includes(intDegree) ? 'GAN' : '';
}

function getExalDebil(planet, degree) {
  if (!exaltationDegrees[planet] && !debilitationDegrees[planet]) return '';
  const exalDiff = Math.abs(degree - exaltationDegrees[planet]);
  const debilDiff = Math.abs(degree - debilitationDegrees[planet]);
  if (exalDiff < 1 || exalDiff > 359) return 'EXA';
  if (debilDiff < 1 || debilDiff > 359) return 'DEB';
  return '';
}

export default function PlanetDegrees() {
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 90);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 90);
    return [startDate, endDate];
  });

  const [resolution, setResolution] = useState('1day');
  const [selectedPlanets, setSelectedPlanets] = useState(
    planets.map(p => p.name)
  );
  const [chartData, setChartData] = useState([]);
  const [lahiri, setLahiri] = useState(23.5);

  const obs = new Observer(defaultCity.lat, defaultCity.lon, defaultCity.elevation);

  useEffect(() => {
    const midDate = new Date((dateRange[0].getTime() + dateRange[1].getTime()) / 2);
    const l = getLahari(midDate);
    setLahiri(l);
  }, [dateRange]);

  useEffect(() => {
    const startDate = dateRange[0];
    const endDate = dateRange[1];
    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const intervalMinutes = Math.max(60, Math.floor(diffDays * 60 / 500));

    const data = generateTimeseriesData(
      startDate,
      diffDays,
      intervalMinutes,
      resolution,
      planets.filter(p => selectedPlanets.includes(p.name)),
      obs,
      lahiri
    );
    setChartData(data);
  }, [dateRange, resolution, selectedPlanets, lahiri]);

  const plotData = planets
    .filter(p => selectedPlanets.includes(p.name))
    .map(planet => {
      const xValues = chartData.map(row => new Date(row.date));
      const yValues = chartData.map(row => row[planet.name]);

      return {
        x: xValues,
        y: yValues,
        type: 'scatter',
        mode: 'lines+markers',
        name: planet.name,
        line: { color: planet.color, width: 1.5 },
        marker: { size: 4 }
      };
    });

  const layout = {
    title: {
      text: `Planetary Positions (${resolution}) - ${dateRange[0].toLocaleDateString()} to ${dateRange[1].toLocaleDateString()}`,
      font: { size: 14, color: '#fff' }
    },
    xaxis: {
      title: 'Date',
      gridcolor: 'rgba(255,255,255,0.1)',
      tickcolor: '#aaa',
      tickfont: { color: '#aaa' },
      titlefont: { color: '#aaa' },
      rangeselector: {
        buttons: [
          { count: 1, label: '1d', step: 'day', stepmode: 'backward' },
          { count: 7, label: '7d', step: 'day', stepmode: 'backward' },
          { count: 30, label: '30d', step: 'day', stepmode: 'backward' },
          { count: 90, label: '90d', step: 'day', stepmode: 'backward' },
          { count: 180, label: '6m', step: 'month', stepmode: 'backward' },
          { count: 1, label: '1y', step: 'year', stepmode: 'backward' },
          { count: 5, label: '5y', step: 'year', stepmode: 'backward' },
          { step: 'all', label: 'All' }
        ],
        bgcolor: '#333',
        activecolor: '#666',
        font: { color: '#fff' }
      },
      rangeslider: { visible: true },
      type: 'date'
    },
    yaxis: {
      title: 'Degrees',
      gridcolor: 'rgba(255,255,255,0.1)',
      tickcolor: '#aaa',
      tickfont: { color: '#aaa' },
      titlefont: { color: '#aaa' },
      range: [0, 360],
      tickvals: Array.from({ length: 13 }, (_, i) => i * 30),
      ticktext: Array.from({ length: 13 }, (_, i) => `${i * 30}°`)
    },
    paper_bgcolor: '#1f1f1f',
    plot_bgcolor: '#1f1f1f',
    font: { color: '#fff' },
    legend: {
      x: 0,
      y: 1,
      font: { color: '#fff' },
      bgcolor: 'rgba(0,0,0,0.5)'
    },
    margin: { l: 60, r: 40, t: 60, b: 80 },
    height: 500,
    hovermode: 'x unified'
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    modeBarButtonsToAdd: ['toggleSpikelines']
  };

  const handlePrev = () => {
    const diffDays = Math.ceil((dateRange[1] - dateRange[0]) / (1000 * 60 * 60 * 24));
    const shiftDays = Math.max(30, Math.floor(diffDays / 2));
    const newStart = new Date(dateRange[0]);
    newStart.setDate(dateRange[0].getDate() - shiftDays);
    const newEnd = new Date(dateRange[0]);
    newEnd.setDate(dateRange[0].getDate() - 1);
    setDateRange([newStart, newEnd]);
  };

  const handleNext = () => {
    const diffDays = Math.ceil((dateRange[1] - dateRange[0]) / (1000 * 60 * 60 * 24));
    const shiftDays = Math.max(30, Math.floor(diffDays / 2));
    const newStart = new Date(dateRange[1]);
    newStart.setDate(dateRange[1].getDate() + 1);
    const newEnd = new Date(dateRange[1]);
    newEnd.setDate(dateRange[1].getDate() + shiftDays);
    setDateRange([newStart, newEnd]);
  };

  const handleDateChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange([dates[0].toDate(), dates[1].toDate()]);
    }
  };

  const handleExportCSV = () => {
    const csvData = chartData.map(row => {
      const newRow = { date: row.date };
      selectedPlanets.forEach(planetName => {
        const degree = row[planetName];
        newRow[planetName] = degree.toFixed(2);
        newRow[`${planetName}_D1`] = getD1(degree);
        newRow[`${planetName}_D9`] = getD9(degree);
        newRow[`${planetName}_Star`] = Stars[getStar(degree)] || '';
        newRow[`${planetName}_Vargottama`] = getVargottama(degree);
        newRow[`${planetName}_ExalDebil`] = getExalDebil(planetName, degree);
        newRow[`${planetName}_Gandanta`] = getGandanta(degree);
      });
      return newRow;
    });
    const filename = `planet_degrees_${dateRange[0].toISOString().split('T')[0]}_${dateRange[1].toISOString().split('T')[0]}_${resolution}.csv`;
    exportToCSV(csvData, filename);
  };

  return (
    <Card>
      <Space wrap style={{ marginBottom: 16 }}>
        <RangePicker
          value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
          onChange={handleDateChange}
          picker="date"
          allowClear={false}
          presets={[
            { label: 'Today', value: [dayjs(), dayjs()] },
            { label: '-90d/+90d', value: [dayjs().subtract(90, 'day'), dayjs().add(90, 'day')] },
            { label: '-6m/+6m', value: [dayjs().subtract(180, 'day'), dayjs().add(180, 'day')] },
            { label: '-1y/+1y', value: [dayjs().subtract(365, 'day'), dayjs().add(365, 'day')] },
            { label: '-2y/+2y', value: [dayjs().subtract(730, 'day'), dayjs().add(730, 'day')] },
            { label: '-5y/+5y', value: [dayjs().subtract(1825, 'day'), dayjs().add(1825, 'day')] },
          ]}
        />
        <Select value={resolution} style={{ width: 120 }} onChange={setResolution}>
          {resolutions.map(r => (
            <Option key={r.value} value={r.value}>{r.label}</Option>
          ))}
        </Select>
        <Select
          mode="tags"
          style={{ width: 300 }}
          placeholder="Select planets"
          value={selectedPlanets}
          onChange={setSelectedPlanets}
        >
          {planets.map(p => (
            <Option key={p.name} value={p.name}>{p.name}</Option>
          ))}
        </Select>
        <Button icon={<LeftOutlined />} onClick={handlePrev}>Prev</Button>
        <Button icon={<RightOutlined />} onClick={handleNext}>Next</Button>
        <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>CSV</Button>
      </Space>

      <div style={{ marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#888' }}>Use range selector buttons or slider to zoom</span>
      </div>

      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '500px' }}
      />

      <div style={{ marginTop: 16 }}>
        <Tag>Lahiri Ayanamsa: {lahiri.toFixed(2)}°</Tag>
        <Tag>Date Range: {dateRange[0].toLocaleDateString()} - {dateRange[1].toLocaleDateString()}</Tag>
        <Tag>Data Points: {chartData.length}</Tag>
        <Tag>Location: {defaultCity.name} ({defaultCity.lat}°, {defaultCity.lon}°)</Tag>
      </div>
    </Card>
  );
}
