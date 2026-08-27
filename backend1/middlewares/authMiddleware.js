import jwt from "jsonwebtoken";

const { verify } = jwt;

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    let token = req.cookies?.token;

    if (!token && authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        message: "Please login first"
      });
    }

    const decodedToken = verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = {
      id: decodedToken.id,
      role: decodedToken.role
    };

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid token"
    });
  }
};