const express = require('express');
const router = express.Router();
const {
  getWallet,
  addMoney,
  transferMoney,
  getTransactionHistory,
  setPin,
  getPinStatus,
} = require('../controllers/walletController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, getWallet);
router.post('/add-money', protect, addMoney);
router.post('/transfer', protect, transferMoney);
router.get('/transactions', protect, getTransactionHistory);
router.post('/set-pin', protect, setPin);
router.get('/pin-status', protect, getPinStatus);

module.exports = router;