const notificationService = require('../services/notificationService');

const getMyNotifications = async (req, res) => {
  try {
    const result = await notificationService.getMyNotifications(req.user._id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to get notifications' });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user._id
    );

    res.status(200).json({ notification });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to mark notification as read'
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
};

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
