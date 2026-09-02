const jwt = require("jsonwebtoken");

const protect = async (req , res , next) =>
{
    let token ; 

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }


  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }



try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);//recalculates the jwt sign and checks its expiry 
    req.user = decoded; // Attach payload { id: userId } to request object
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

module.exports = { protect };

