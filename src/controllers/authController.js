const User = require("../models/Users");
const jwt = require("jsonwebtokens");


const generateToken = (userID) =>
{
    return jwt.sign({id : userID } , process.env.JWT_SECRET , {
        expiresIn : process.env.JWT_EXPRIES_IN || '7d' , 
    });
};


exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email or phone already registered' });
    }

    // Create user
    const user = await User.create({ name, email, password, phone });

    // Generate JWT
    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};