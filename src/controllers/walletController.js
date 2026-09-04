const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @desc    Get current user's wallet details
// @route   GET /api/wallet
// @access  Private
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

// @desc    Add funds to current user's wallet
// @route   POST /api/wallet/add-money
// @access  Private
exports.addMoney = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid positive amount',
      });
    }

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

// @desc    Transfer money with 4-digit PIN verification
// @route   POST /api/wallet/transfer
// @access  Private
exports.transferMoney = async (req, res) => {
  try {
    const { recipientIdentifier, amount, description, pin } = req.body;

    // 1. Input Validation
    if (!recipientIdentifier || !amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid recipient (email/phone) and positive amount',
      });
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'A valid 4-digit transaction PIN is required',
      });
    }

    // 2. Fetch sender and verify PIN
    const sender = await User.findById(req.user.id);
    if (!sender.pin) {
      return res.status(400).json({
        success: false,
        message: 'Please set up a 4-digit transaction PIN before transferring money',
      });
    }

    const isPinMatch = await bcrypt.compare(pin, sender.pin);
    if (!isPinMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect 4-digit transaction PIN',
      });
    }

    // 3. Find Recipient
    const recipient = await User.findOne({
      $or: [{ email: recipientIdentifier }, { phone: recipientIdentifier }],
    });

    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    // 4. Prevent Self Transfer
    if (recipient._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer money to yourself',
      });
    }

    // 5. Atomically Deduct Sender Balance
    const senderWallet = await Wallet.findOneAndUpdate(
      { userId: req.user.id, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true }
    );

    if (!senderWallet) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance or sender wallet not found',
      });
    }

    // 6. Atomically Increment Recipient Balance
    const recipientWallet = await Wallet.findOneAndUpdate(
      { userId: recipient._id },
      { $inc: { balance: amount } },
      { new: true }
    );

    if (!recipientWallet) {
      // Rollback deduction if recipient wallet fails
      await Wallet.findOneAndUpdate(
        { userId: req.user.id },
        { $inc: { balance: amount } }
      );
      return res.status(404).json({
        success: false,
        message: 'Recipient wallet not found',
      });
    }

    // 7. Record Transaction in Ledger
    const transaction = await Transaction.create({
      sender: req.user.id,
      receiver: recipient._id,
      amount,
      description: description || 'P2P Transfer',
      status: 'SUCCESS',
    });

    // 8. Emit Real-Time Socket Event to Recipient
    const io = req.app.get('io');
    if (io) {
      io.to(recipient._id.toString()).emit('payment_received', {
        senderName: req.user.name,
        amount,
        description: description || 'P2P Transfer',
        newBalance: recipientWallet.balance,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully transferred ₹${amount} to ${recipient.name}`,
      data: {
        transactionId: transaction._id,
        currentBalance: senderWallet.balance,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user transaction ledger
// @route   GET /api/wallet/transactions
// @access  Private
exports.getTransactionHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
    };

    const totalTransactions = await Transaction.countDocuments(query);

    const transactions = await Transaction.find(query)
      .populate('sender', 'name email phone')
      .populate('receiver', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedTransactions = transactions.map((tx) => {
      const isSender = tx.sender._id.toString() === req.user.id;
      return {
        id: tx._id,
        type: isSender ? 'DEBIT' : 'CREDIT',
        amount: tx.amount,
        party: isSender ? tx.receiver.name : tx.sender.name,
        partyContact: isSender ? tx.receiver.phone : tx.sender.phone,
        status: tx.status,
        description: tx.description,
        timestamp: tx.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedTransactions.length,
      pagination: {
        page,
        totalPages: Math.ceil(totalTransactions / limit),
        totalTransactions,
      },
      data: formattedTransactions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set or update 4-digit transaction PIN
// @route   POST /api/wallet/set-pin
// @access  Private
exports.setPin = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 numeric digits',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    await User.findByIdAndUpdate(req.user.id, { pin: hashedPin });

    return res.status(200).json({
      success: true,
      message: 'Transaction PIN set successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check if user has already set a PIN
// @route   GET /api/wallet/pin-status
// @access  Private
exports.getPinStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('pin');
    return res.status(200).json({
      success: true,
      hasPin: Boolean(user?.pin),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};