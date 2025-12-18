import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verify JWT token
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Check if user is banned
      if (req.user.isBanned) {
        return res.status(403).json({ message: 'Your account has been banned' });
      }

      // Check if user is deleted
      if (req.user.deletedAt) {
        return res.status(403).json({ message: 'Account has been deleted' });
      }

      User.updateOne({ _id: req.user._id }, { $set: { lastSeenAt: new Date() } }).catch(() => {});

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Role-based access control
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

// Check if user is muted (for discussions)
export const checkMuted = async (req, res, next) => {
  if (req.user.isMuted) {
    if (req.user.mutedUntil && new Date() < req.user.mutedUntil) {
      return res.status(403).json({
        message: `You are muted until ${req.user.mutedUntil}`,
      });
    } else {
      // Unmute user if mute period has expired
      req.user.isMuted = false;
      req.user.mutedUntil = null;
      await req.user.save();
    }
  }
  next();
};

// Generate JWT Token
export const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Generate Refresh Token
export const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE,
  });
};
