const Wallet = require('../models/Wallet');

// GET /api/wallet
exports.getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.id });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    return res.status(200).json({
      success: true,
      balance: wallet.balance,
      walletId: wallet._id,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/wallet/add-money
exports.addMoney = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid positive amount',
      });
    }

    // Atomic increment using MongoDB $inc
    const wallet = await Wallet.findOneAndUpdate(
      { userId: req.user.id },
      { $inc: { balance: amount } },
      { new: true }
    );

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully added ₹${amount} to your wallet`,
      balance: wallet.balance,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};