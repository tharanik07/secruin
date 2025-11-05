const pool = require('../db/db');


const getCveById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cves WHERE cveId = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'CVE not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const getCvesModifiedInDays = async (req, res) => {
  try {
    const days = parseInt(req.params.days);
    const sql = `
      SELECT * FROM cves
      WHERE lastModified >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY lastModified DESC
    `;
    const [rows] = await pool.query(sql, [days]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCveById, getCvesModifiedInDays };
