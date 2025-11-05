const axios = require('axios');
const pool = require('../db/db');

const fetchAndStoreAllCves = async () => {
  try {
    let startIndex = 0;
    const resultsPerPage = 2000;
    let moreData = true;

    while (moreData) {
      const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?startIndex=${startIndex}&resultsPerPage=${resultsPerPage}`;
      console.log(`📥 Fetching from: ${url}`);

      const res = await axios.get(url);
      const data = res.data;

      if (!data.vulnerabilities || data.vulnerabilities.length === 0) break;

      const connection = await pool.getConnection();

      for (const v of data.vulnerabilities) {
        const cveData = v.cve;
        const cveId = cveData.id;
        const desc = cveData.descriptions?.[0]?.value || 'No description';
        const source = cveData.sourceIdentifier || 'Unknown';
        const published = cveData.published;
        const lastModified = cveData.lastModified;

        const sql = `
          INSERT INTO cves (cveId, sourceIdentifier, published, lastModified, description)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            sourceIdentifier = VALUES(sourceIdentifier),
            published = VALUES(published),
            lastModified = VALUES(lastModified),
            description = VALUES(description)
        `;

        await connection.query(sql, [cveId, source, published, lastModified, desc]);
      }

      connection.release();
      startIndex += resultsPerPage;
      moreData = startIndex < data.totalResults;
    }

    console.log('✅ All CVEs fetched and stored successfully!');
  } catch (err) {
    console.error('❌ Error fetching CVEs:', err.message);
  }
};

module.exports = { fetchAndStoreAllCves };
