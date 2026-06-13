import jwt from "jsonwebtoken";
import {
  errorResponse,
  internalError,
  ok,
  unauthorized,
  forbidden,
} from "../utils/response.js";

// dynamic middleware to check for required roles
const authMiddleware = (requiredRoles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers?.authorization;
    
    if (!authHeader) {
      return unauthorized(res, "Authorization header missing");
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return unauthorized(res, "Token missing");
    }
    try {

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      
      req.user = decoded;

      if (requiredRoles.length > 0 && !requiredRoles.includes(decoded.role)) {
        return forbidden(res, "Insufficient permissions");
      }
      next();
    }
      catch (error) { 
        return unauthorized(res, "Invalid token");
      }
  };
}


export default authMiddleware;