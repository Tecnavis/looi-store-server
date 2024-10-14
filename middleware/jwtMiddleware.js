const jwt = require('jsonwebtoken');

const jwtMiddleware = (req, res, next) => {
   console.log("Inside JWT Middleware!!!");
   
   // Log all the headers to debug
   console.log("Headers: ", req.headers);

   const authHeader = req.headers["authorization"];
   
   if (authHeader && authHeader.startsWith("Bearer ")) {
       const token = authHeader.split(" ")[1];
       console.log(token);

       try {
           const jwtResponse = jwt.verify(token, process.env.JWT_SECRET);
           console.log(jwtResponse);
           req.payload = jwtResponse.userId;
           req.user = { _id: jwtResponse.userId };
           next();
       } catch (err) {
           return res.status(401).json("Authorization failed... Please login!!!");
       }
   } else {
       return res.status(406).json("Authorization header is missing or improperly formatted");
   }
};

module.exports = jwtMiddleware;