const { BrevoClient } = require('@getbrevo/brevo');

const getBrevoClient = () => {
	const apiKey = process.env.BREVO_API_KEY;

	if (!apiKey) {
		throw new Error('BREVO_API_KEY is not configured');
	}

	return new BrevoClient({ apiKey });
};

const normalizeRecipients = (recipients) => {
	const values = Array.isArray(recipients) ? recipients : [recipients];

	return values.map((recipient) => {
		if (typeof recipient === 'string') {
			return { email: recipient };
		}

		return recipient;
	});
};

const sendEmail = async ({ to, subject, html, text, replyTo }) => {
	const senderEmail = process.env.BREVO_SENDER_EMAIL;

	if (!senderEmail) {
		throw new Error('BREVO_SENDER_EMAIL is not configured');
	}

	if (!to || !subject || (!html && !text)) {
		throw new Error('Email requires to, subject, and html or text content');
	}

	const email = {
		subject,
		sender: {
			email: senderEmail,
			name: process.env.BREVO_SENDER_NAME || 'Agro',
		},
		to: normalizeRecipients(to),
	};

	if (html) email.htmlContent = html;
	if (text) email.textContent = text;
	if (replyTo) email.replyTo = typeof replyTo === 'string' ? { email: replyTo } : replyTo;

	return getBrevoClient().transactionalEmails.sendTransacEmail(email);
};

module.exports = { sendEmail };
