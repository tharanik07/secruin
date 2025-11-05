const express = require('express');
const router = express.Router();
const { getCveById, getCvesModifiedInDays } = require('../controller/cveController');

router.get('/:id', getCveById);
router.get('/modified/:days', getCvesModifiedInDays);

module.exports = router;
