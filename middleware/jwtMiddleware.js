const jwt = require('jsonwebtoken');

const jwtMiddleware = (req, res, next) => {
   const authHeader = req.headers["authorization"];
   
   if (authHeader && authHeader.startsWith("Bearer ")) {
       const token = authHeader.split(" ")[1];

       try {
           const jwtResponse = jwt.verify(token, process.env.JWT_SECRET);
           // ✅ FIX: Support both 'userId' (regular login) and 'id' (Google OAuth login)
           const resolvedId = jwtResponse.userId || jwtResponse.id;
           req.payload = resolvedId;
           req.user = { _id: resolvedId };
           next();
       } catch (err) {
           return res.status(401).json({ message: "Authorization failed. Please login." });
       }
   } else {
       return res.status(406).json({ message: "Authorization header is missing or improperly formatted." });
   }
};

module.exports = jwtMiddleware;
