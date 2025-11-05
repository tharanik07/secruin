const express = require('express');
const pool = require('./db/db');
const cveRoutes = require('./routes/cveroutes');
const { fetchAndStoreAllCves } = require('./services/cveFetchservice');
const cors = require('cors');

const app = express();


app.use(
  cors({
    origin: "http://localhost:5173", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, 
  })
);


app.use(express.json());
app.use('/api/cves', cveRoutes);


(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Connected');
    connection.release();
  } catch (err) {
    console.error('❌ MySQL Connection Failed:', err.message);
  }
})();

// fetchAndStoreAllCves();  -- > use only when neeeded to fetch all CVEs

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
