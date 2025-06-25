const auth = (req, res, next) => {
  // Check if user is authenticated via session
  if (!req.session || !req.session.userInfo) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Add user info to request object
  req.user = {
    id: req.session.userInfo.id,
    username: req.session.userInfo.name,
    robloxId: req.session.userInfo.id, // Using id as robloxId since they're the same
    avatar: req.session.userInfo.avatar // Add avatar from session
  };

  next();
};

module.exports = { auth }; 