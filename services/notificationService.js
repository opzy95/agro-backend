const Notification = require('../models/notification');
const User = require('../models/user');

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  order,
  withdrawal
}) => Notification.create({
  recipient,
  type,
  title,
  message,
  order: order || null,
  withdrawal: withdrawal || null
});

const notifyRole = async ({ role, type, title, message, order, withdrawal }) => {
  const recipients = await User.find({ role }).select('_id');

  if (recipients.length === 0) {
    return [];
  }

  return Notification.insertMany(
    recipients.map((recipient) => ({
      recipient: recipient._id,
      type,
      title,
      message,
      order: order || null,
      withdrawal: withdrawal || null
    }))
  );
};

const getMyNotifications = async (userId) => {
  const notifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    readAt: null
  });

  return {
    unreadCount,
    notifications
  };
};

const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { readAt: new Date() } },
    { new: true }
  );

  if (!notification) {
    throw {
      statusCode: 404,
      message: 'Notification not found'
    };
  }

  return notification;
};

const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, readAt: null },
    { $set: { readAt: new Date() } }
  );

  return { updated: result.modifiedCount };
};

module.exports = {
  createNotification,
  notifyRole,
  getMyNotifications,
  markAsRead,
  markAllAsRead
};
