const authService = require('../services/authService');
const { sendEmail } = require('../services/email.Service');
const { recordFailedRegistration } = require('../middleware/registrationRateLimit');

const REGISTRATION_TIMEOUT_MS = 60 * 1000;
const LOGIN_TIMEOUT_MS = 60 * 1000;

const sendVerificationEmail = async (user) => {
  try {
    const result = await sendEmail({
      to: user.email,
      subject: 'Verify your Agro email address',
      text: `Hi ${user.firstName}, your Agro email verification code is ${user.verificationCode}. It expires in 10 minutes.`,
      html: `
        <h2>Verify your Agro email address</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your email verification code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${user.verificationCode}</p>
        <p>This code expires in 10 minutes.</p>
      `
    });

    console.log(`Welcome email accepted by Brevo for ${user.email}. Message ID: ${result.messageId}`);

    return {
      status: 'accepted_by_brevo',
      messageId: result.messageId
    };
  } catch (error) {
    console.error('Welcome email error:', error.message);

    return {
      status: 'failed',
      message: error.message
    };
  }
};

const registerUser = async (req, res) => {
  try {
    const result = await Promise.race([
      authService.registerUser(req.body),
      new Promise((resolve, reject) => {
        setTimeout(() => reject({
          statusCode: 408,
          message: 'Registration timed out. Please try again.'
        }), REGISTRATION_TIMEOUT_MS);
      })
    ]);
    let verificationEmail = null;

    if (result.verificationCode) {
      verificationEmail = await sendVerificationEmail({
        ...result.user,
        verificationCode: result.verificationCode
      });
    }

    res.status(201).json({
      message: 'Registration successful',
      token: result.token,
      user: result.user,
      emailVerificationRequired: Boolean(result.verificationCode),
      verificationEmail
    });
  } catch (error) {
    recordFailedRegistration(req);
    console.error('Register error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Registration failed'
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const result = await Promise.race([
      authService.loginUser(req.body),
      new Promise((resolve, reject) => {
        setTimeout(() => reject({
          statusCode: 408,
          message: 'Login timed out. Please try again.'
        }), LOGIN_TIMEOUT_MS);
      })
    ]);

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

const requestPasswordReset = async (req, res) => {
  try {
    const resetRequest = await authService.requestPasswordReset(req.body.email);

    if (!resetRequest) {
      return res.status(404).json({
        message: 'Email not found or user is not registered'
      });
    }

    const result = await sendEmail({
      to: resetRequest.user.email,
      subject: 'Your Agro password reset code',
      text: `Hi ${resetRequest.user.firstName}, your Agro password reset code is ${resetRequest.resetCode}. It expires in 10 minutes.`,
      html: `
        <h2>Password reset request</h2>
        <p>Hi ${resetRequest.user.firstName},</p>
        <p>Your Agro password reset code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${resetRequest.resetCode}</p>
        <p>This code expires in 10 minutes.</p>
      `
    });

    console.log(`Password reset email accepted by Brevo for ${resetRequest.user.email}. Message ID: ${result.messageId}`);

    res.json({ message: 'Password reset code sent to your email' });
  } catch (error) {
    console.error('Password reset request error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Could not send password reset code'
    });
  }
};

const resendVerificationCode = async (req, res) => {
  try {
    const verificationRequest = await authService.resendVerificationCode(req.body.email);
    const verificationEmail = await sendVerificationEmail({
      ...verificationRequest.user,
      verificationCode: verificationRequest.verificationCode
    });

    res.json({
      message: 'A new verification code has been sent to your email',
      verificationEmail
    });
  } catch (error) {
    console.error('Resend verification error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Could not resend verification code'
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Password reset failed'
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const user = await authService.verifyEmail(req.body);
    const welcomeEmail = await sendEmail({
      to: user.email,
      subject: 'Welcome to Agro',
      text: `Hi ${user.firstName}, your email has been verified successfully. Welcome to Agro!`,
      html: `
        <h2>Welcome to Agro, ${user.firstName}!</h2>
        <p>Your email has been verified successfully.</p>
        <p>Your Agro account is now ready to use.</p>
      `
    });

    console.log(`Welcome email accepted by Brevo for ${user.email}. Message ID: ${welcomeEmail.messageId}`);

    res.json({
      message: 'Email verified successfully. You can now log in.',
      welcomeEmail: {
        status: 'accepted_by_brevo',
        messageId: welcomeEmail.messageId
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Email verification failed'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  requestPasswordReset,
  resendVerificationCode,
  resetPassword,
  verifyEmail
};
