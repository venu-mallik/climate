import { Body, AstroTime, Equator, Horizon, Observer } from 'astronomy-engine';

export const planets = [
  { name: 'Sun', body: Body.Sun, color: '#FFD700' },
  { name: 'Moon', body: Body.Moon, color: '#C0C0C0' },
  { name: 'Mercury', body: Body.Mercury, color: '#A9A9A9' },
  { name: 'Venus', body: Body.Venus, color: '#FFA500' },
  { name: 'Mars', body: Body.Mars, color: '#FF4500' },
  { name: 'Jupiter', body: Body.Jupiter, color: '#DEB887' },
  { name: 'Saturn', body: Body.Saturn, color: '#F4A460' },
  { name: 'Uranus', body: Body.Uranus, color: '#87CEEB' },
  { name: 'Neptune', body: Body.Neptune, color: '#4169E1' },
  { name: 'Pluto', body: Body.Pluto, color: '#8B4513' },
  { name: 'Rahu', body: 'RAHU', color: '#9932CC' },
  { name: 'Ketu', body: 'KETU', color: '#DC143C' }
];

export function getLahari(date) {
  if (date instanceof Date) {
    let a = (16.90709 * date.getFullYear() / 1000) - 0.757371 * (date.getFullYear() / 1000) * (date.getFullYear() / 1000) - 6.92416100010001000;
    let b = ((date.getMonth() + date.getDate() / 30) / 30) * 1.1574074 / 1000;
    return Math.abs(a + b);
  }
  return Number(23.5);
}

export function calculatePlanetDegree(body, date, obs, lahiri) {
  if (body === 'RAHU' || body === 'KETU') {
    return calculateNodeDegree(body, date, lahiri);
  }

  const time = new AstroTime(date);
  const eq = Equator(body, time, obs, true, true);
  const hr = Horizon(time, obs, eq.ra, eq.dec, 'normal');
  const tropicalDegree = hr.ra * 15;
  const siderealDegree = ((tropicalDegree - lahiri) % 360 + 360) % 360;
  return siderealDegree;
}

export function calculateNodeDegree(nodeType, date, lahiri) {
  const targetDate = new Date(date);
  
  // 1. Calculate Julian Day (JD) for the given date
  // Formula for JD: days since Jan 1, 4713 BC
  const jd = (targetDate.getTime() / 86400000) + 2440587.5;
  
  // 2. Calculate Julian Centuries (T) from J2000.0
  const T = (jd - 2451545.0) / 36525;

  // 3. Mean Longitude of the Ascending Node (Rahu)
  // This formula is based on the IAU expression for the mean node
  let nodeDegree = 125.0445479 - (1934.1362891 * T) + (0.0020754 * Math.pow(T, 2)) + (Math.pow(T, 3) / 467441) - (Math.pow(T, 4) / 60616000);

  // Normalize to 0-360 degrees
  nodeDegree = ((nodeDegree % 360) + 360) % 360;

  // 4. Handle Node Types
  // Traditionally, the formula above represents the Mean Rahu.
  // Ketu is always 180 degrees away.
  if (nodeType === 'KETU') {
    nodeDegree = (nodeDegree + 180) % 360;
  }

  // 5. Apply Ayanamsa (Lahiri) for Sidereal position
  const siderealNode = ((nodeDegree - lahiri) % 360 + 360) % 360;

  return siderealNode;
}


export function getAscendant(date, obs, lahiri) {
  const time = new AstroTime(date);
  const eq = Equator(Body.Sun, time, obs, true, true);
  const hr = Horizon(time, obs, eq.ra, eq.dec, 'normal');

  const latRad = obs.latitude * Math.PI / 180;
  const dec = eq.dec * Math.PI / 180;
  const ra = hr.ra * Math.PI / 180;

  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);

  const cosH = -sinLat * sinDec / (cosLat * cosDec);
  const H = Math.acos(Math.min(1, Math.max(-1, cosH)));

  const obliquity = 23.44 * Math.PI / 180;
  const sinLambda = sinDec * Math.sin(obliquity) + cosDec * Math.cos(obliquity) * Math.cos(H);

  const lambda = Math.asin(Math.min(1, Math.max(-1, sinLambda))) * 180 / Math.PI;
  const tropicalAsc = (lambda + 360) % 360;
  const siderealAsc = ((tropicalAsc - lahiri) % 360 + 360) % 360;

  return siderealAsc;
}

export function getHouseNumber(planetDegree, ascendantDegree) {
  const relativeDegree = (planetDegree - ascendantDegree + 360) % 360;
  return Math.floor(relativeDegree / 30) + 1;
}

export function getHousePlanets(date, selectedBodies, obs, lahiri) {
  const ascendant = getAscendant(date, obs, lahiri);
  const ascSignNum = Math.floor(ascendant / 30) + 1;
  const houses = {};

  for (let i = 1; i <= 12; i++) {
    houses[i] = [];
  }

  selectedBodies.forEach(planet => {
    const degree = calculatePlanetDegree(planet.body, date, obs, lahiri);
    const houseNum = getHouseNumber(degree, ascendant);
    const houseStart = ((houseNum - 1) * 30 + ascendant) % 360;
    let positionInHouse = degree - houseStart;
    if (positionInHouse < 0) positionInHouse += 360;
    houses[houseNum].push({
      name: planet.name,
      degree: Number(degree.toFixed(2)),
      positionInHouse: Number(positionInHouse.toFixed(2)),
      color: planet.color
    });
    houses[houseNum].sort((a, b) => a.positionInHouse - b.positionInHouse);
  });

  return { houses, ascendant: Number(ascendant.toFixed(2)), ascSignNum };
}

export function generateTimeRange(baseDate, daysBack, daysForward, resolutionMs) {
  const times = [];
  const base = new Date(baseDate);
  const start = new Date(base.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const end = new Date(base.getTime() + daysForward * 24 * 60 * 60 * 1000);

  let current = new Date(start);
  while (current <= end) {
    times.push(new Date(current));
    current = new Date(current.getTime() + resolutionMs);
  }

  return times;
}

export function generateTimeseriesData(baseDate, daysBack, daysForward, resolution, selectedPlanets, obs, lahiri) {
  const resolutionMap = {
    '1min': 60 * 1000,
    '5min': 5 * 60 * 1000,
    '15min': 15 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    '60min': 60 * 60 * 1000,
    '1day': 24 * 60 * 60 * 1000,
    '1week': 7 * 24 * 60 * 60 * 1000,
    '1month': 30 * 24 * 60 * 60 * 1000,
    '3month': 90 * 24 * 60 * 60 * 1000,
    '6month': 180 * 24 * 60 * 60 * 1000,
    '1year': 365 * 24 * 60 * 60 * 1000,
    '5year': 5 * 365 * 24 * 60 * 60 * 1000,
    '10year': 10 * 365 * 24 * 60 * 60 * 1000
  };

  const resMs = resolutionMap[resolution] || resolutionMap['1day'];
  const times = generateTimeRange(baseDate, daysBack, daysForward, resMs);

  return times.map(time => {
    const row = { date: time.toISOString() };
    selectedPlanets.forEach(planet => {
      row[planet.name] = Number(calculatePlanetDegree(planet.body, time, obs, lahiri).toFixed(2));
    });
    return row;
  });
}

export function exportToCSV(data, filename) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => row[h]).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export function getHouseName(houseNum) {
  const houseNames = {
    1: 'Aries (Mesha)',
    2: 'Taurus (Vrishabha)',
    3: 'Gemini (Mithuna)',
    4: 'Cancer (Karka)',
    5: 'Leo (Simha)',
    6: 'Virgo (Kanya)',
    7: 'Libra (Tula)',
    8: 'Scorpio (Vrishchika)',
    9: 'Sagittarius (Dhanu)',
    10: 'Capricorn (Makara)',
    11: 'Aquarius (Kumbha)',
    12: 'Pisces (Meena)'
  };
  return houseNames[houseNum] || `House ${houseNum}`;
}
