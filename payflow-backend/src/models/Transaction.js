const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Transfer amount must be at least 1'],
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PENDING'],
      default: 'SUCCESS',
    },
    description: {
      type: String,
      trim: true,
      default: 'P2P Transfer',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);