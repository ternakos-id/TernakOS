// /api/weather.js — NexusAgri weather endpoint
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { city, lat, lon } = req.query;
  const location = (lat && lon) ? `${lat},${lon}` : (city || 'Mojosari');

  try {
    const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
    const r = await fetch(url, { headers: { 'User-Agent': 'NexusAgri/1.0' } });
    if (!r.ok) throw new Error(`wttr.in ${r.status}`);
    const data = await r.json();

    const cur = data.current_condition[0];
    const area = data.nearest_area?.[0];
    const areaName = area?.areaName?.[0]?.value || location;
    const country = area?.country?.[0]?.value || '';

    const forecast = (data.weather || []).slice(0, 5).map((d, i) => {
      const desc = d.hourly?.[4]?.weatherDesc?.[0]?.value || '';
      return {
        date: d.date,
        day: ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][new Date(d.date).getDay()],
        max: d.maxtempC,
        min: d.mintempC,
        desc,
        precip: parseFloat(d.hourly?.[0]?.precipMM || 0)
      };
    });

    return res.status(200).json({
      temp: cur.temp_C,
      feels_like: cur.FeelsLikeC,
      humidity: cur.humidity,
      wind_kmph: cur.windspeedKmph,
      desc: cur.weatherDesc?.[0]?.value || '',
      location: `${areaName}${country ? ', ' + country : ''}`,
      forecast
    });
  } catch (e) {
    console.error('weather error:', e.message);
    // Fallback static data so UI doesn't stay stuck
    return res.status(200).json({
      temp: '--', feels_like: '--', humidity: '--',
      wind_kmph: '--', desc: 'Tidak dapat memuat cuaca',
      location: city || 'Mojosari, Mojokerto',
      forecast: [], error: e.message
    });
  }
}
