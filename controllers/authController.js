const authService = require('../services/authService');

const registerUser = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);

    res.status(201).json({
      message: 'Registration successful',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Register error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Registration failed'
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const result = await authService.loginUser(req.body);

    res.json({
      message: 'Login successful',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Login failed'
    });
  }
};

module.exports = {
  registerUser,
  loginUser
};