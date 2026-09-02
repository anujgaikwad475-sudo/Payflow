const express = require('express');
const router = express.Router();
const { getWallet, addMoney } = require('../controllers/walletController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, getWallet);
router.post('/add-money', protect, addMoney);

module.exports = router;