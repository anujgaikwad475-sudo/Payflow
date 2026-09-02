const User = require("../models/User");
const jwt = require("jsonwebtoken");


const generateToken = (userID) =>
{
  //assign payload as userID and cryptographic key for signature verififcation
  //genrates three parts =>header , payload , signature  
    return jwt.sign({id : userID } , process.env.JWT_SECRET , {
        expiresIn : process.env.JWT_EXPRIES_IN || '7d' ,//sets the token lifespan to 7d after 7d auth fails 
    });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;//extracts the name email password phone from the usrs json data set 

    // Check if user already exists;this triggers the pre save hook in models/users.js file
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });//checks if this data conatins exact this number OR mailid
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email or phone already registered' });
    }

    // Create user
    const user = await User.create({ name, email, password, phone });//initiates a new mongoose documanet to register the user

    // Generate JWT
    const token = generateToken(user._id);//calls the token function to create the new token 

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







exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Explicitly select password since it has select: false in schema
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {//triggers the bycrypt matching password method in models/users.js
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
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


//route handler for getting active users details 
exports.getMe = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    const user = await User.findById(req.user.id);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};