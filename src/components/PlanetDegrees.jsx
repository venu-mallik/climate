import { useEffect, useState, useRef } from 'react';
import { Select, Button, DatePicker, Card, Space, Tag } from 'antd';
import { DownloadOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Body, AstroTime, Equator, Horizon, Observer } from 'astronomy-engine';
import dayjs from 'dayjs';
import { planets, generateTimeseriesData, exportToCSV, getLahari } from './PlanetUtils';
import { Stars } from './_panchangerules';

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
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [resolution, setResolution] = useState('1day');
  const [selectedPlanets, setSelectedPlanets] = useState(
    planets.map(p => p.name)
  );
  const [chartData, setChartData] = useState([]);
  const [lahiri, setLahiri] = useState(23.5);

  const obs = new Observer(defaultCity.lat, defaultCity.lon, defaultCity.elevation);

  useEffect(() => {
    const l = getLahari(selectedDate);
    setLahiri(l);
  }, [selectedDate]);

  useEffect(() => {
    const data = generateTimeseriesData(
      selectedDate,
      60,
      60,
      resolution,
      planets.filter(p => selectedPlanets.includes(p.name)),
      obs,
      lahiri
    );
    setChartData(data);
  }, [selectedDate, resolution, selectedPlanets, lahiri]);

  useEffect(() => {
    if (chartData.length === 0 || !canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    const datasets = planets
      .filter(p => selectedPlanets.includes(p.name))
      .map(planet => {
        const dataPoints = chartData.map(row => {
          const degree = row[planet.name];
          const exalDebil = getExalDebil(planet.name, degree);
          let pointStyle = 'circle';
          let pointRadius = 3;
          let pointColor = planet.color;

          if (exalDebil === 'EXA') {
            pointStyle = 'star';
            pointRadius = 6;
          } else if (exalDebil === 'DEB') {
            pointStyle = 'triangle';
            pointRadius = 5;
          }

          return {
            x: new Date(row.date),
            y: degree,
            planet: planet.name,
            degree,
            pointStyle,
            pointRadius,
            pointColor
          };
        });

        return {
          label: planet.name,
          data: dataPoints,
          borderColor: planet.color,
          backgroundColor: planet.color,
          borderWidth: 1.5,
          pointRadius: dataPoints.map(p => p.pointRadius),
          pointStyle: dataPoints.map(p => p.pointStyle),
          pointBackgroundColor: dataPoints.map(p => p.pointColor),
          pointBorderColor: dataPoints.map(p => p.pointColor),
          tension: 0.3,
          fill: false
        };
      });

    chartRef.current = new window.Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#fff',
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              title: (items) => new Date(items[0].parsed.x).toLocaleString(),
              label: (item) => {
                const degree = item.parsed.y;
                const planet = item.dataset.label;
                const d1 = getD1(degree);
                const d9 = getD9(degree);
                const star = getStar(degree);
                const starName = Stars[star] || '';
                const varg = getVargottama(degree);
                const exalDebil = getExalDebil(planet, degree);
                const gand = getGandanta(degree);

                let label = `${planet}: ${degree.toFixed(2)}°`;
                label += ` | D1:${d1} D9:${d9}`;
                label += ` | ${star} ${starName}`;
                if (varg) label += ' | VAR';
                if (exalDebil) label += ` | ${exalDebil}`;
                if (gand) label += ' | GAN';
                return label;
              }
            }
          },
          title: {
            display: true,
            text: `Planetary Positions (${resolution}) - ±60 days from ${selectedDate.toLocaleDateString()}`,
            color: '#fff',
            font: { size: 14 }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: resolution === '1day' || resolution === '1week' ? 'day' : 
                    resolution === '1month' || resolution === '3month' || resolution === '6month' ? 'month' : 'hour',
              displayFormats: {
                day: 'MMM dd',
                week: 'MMM dd',
                month: 'MMM yyyy',
                hour: 'HH:mm'
              }
            },
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: '#aaa' }
          },
          y: {
            min: 0,
            max: 360,
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: {
              color: '#aaa',
              callback: (value) => `${value}°`
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [chartData, selectedPlanets, resolution]);

  const handlePrev = () => {
    const days = resolution === '1day' ? 60 : resolution === '1week' ? 14 : resolution === '1month' ? 3 : 60;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - days);
    setSelectedDate(newDate);
  };

  const handleNext = () => {
    const days = resolution === '1day' ? 60 : resolution === '1week' ? 14 : resolution === '1month' ? 3 : 60;
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
    const filename = `planet_degrees_${selectedDate.toISOString().split('T')[0]}_${resolution}.csv`;
    exportToCSV(csvData, filename);
  };

  return (
    <Card>
      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker
          value={dayjs(selectedDate)}
          onChange={handleDateChange}
          placeholder="Select date"
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
        <span style={{ fontSize: 11, color: '#888' }}>Point Styles: </span>
        <Tag style={{ fontSize: 10 }}>● Normal</Tag>
        <Tag style={{ fontSize: 10 }}>★ Exalted</Tag>
        <Tag style={{ fontSize: 10 }}>▼ Debilitated</Tag>
      </div>

      <div style={{ height: 500 }}>
        <canvas ref={canvasRef} />
      </div>

      <div style={{ marginTop: 16 }}>
        <Tag>Lahiri Ayanamsa: {lahiri.toFixed(2)}°</Tag>
        <Tag>Date Range: ±60 days</Tag>
        <Tag>Data Points: {chartData.length}</Tag>
        <Tag>Location: {defaultCity.name} ({defaultCity.lat}°, {defaultCity.lon}°)</Tag>
      </div>
    </Card>
  );
}
