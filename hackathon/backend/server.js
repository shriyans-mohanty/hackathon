const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const WAQI_TOKEN = '80700031d692434b9fcce1d2f244cc50e35172c6';

app.get('/api/aqi', async (req, res) => {
  try {
    // Bounding box covering Delhi NCR
    const response = await axios.get(
      `https://api.waqi.info/map/bounds/`,
      {
        params: {
          token: WAQI_TOKEN,
          latlng: '28.40,76.80,28.90,77.50'
        }
      }
    );

    if (response.data.status !== 'ok') {
      return res.status(500).json({ error: 'WAQI API error' });
    }

    res.json(response.data.data); // <-- ARRAY OF STATIONS
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch AQI' });
  }
});

app.listen(3000, () => console.log('Backend running on port 3000'));