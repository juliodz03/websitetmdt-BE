import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send email
export const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

// Email templates
export const templates = {
  orderConfirmation: (order) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .order-details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmation</h1>
        </div>
        <div class="content">
          <p>Thank you for your order!</p>
          <div class="order-details">
            <h2>Order #${order.orderNumber}</h2>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
            <p><strong>Status:</strong> ${order.currentStatus.toUpperCase()}</p>
            
            <h3>Items:</h3>
            ${order.items.map(item => `
              <div class="item">
                <p><strong>${item.productName}</strong> - ${item.variantName}</p>
                <p>Quantity: ${item.quantity} x ${item.price.toLocaleString('vi-VN')} VND</p>
              </div>
            `).join('')}
            
            <div class="total">
              <p>Subtotal: ${order.subtotal.toLocaleString('vi-VN')} VND</p>
              ${order.discountAmount > 0 ? `<p>Discount: -${order.discountAmount.toLocaleString('vi-VN')} VND</p>` : ''}
              ${order.pointsDiscount > 0 ? `<p>Points: -${order.pointsDiscount.toLocaleString('vi-VN')} VND</p>` : ''}
              <p>Tax: ${order.taxAmount.toLocaleString('vi-VN')} VND</p>
              <p>Shipping: ${order.shippingFee.toLocaleString('vi-VN')} VND</p>
              <p style="color: #4F46E5;">Total: ${order.totalAmount.toLocaleString('vi-VN')} VND</p>
            </div>

            <h3>Shipping Address:</h3>
            <p>
              ${order.shippingAddress.fullName}<br>
              ${order.shippingAddress.phone}<br>
              ${order.shippingAddress.street}<br>
              ${order.shippingAddress.city}, ${order.shippingAddress.province}<br>
              ${order.shippingAddress.country}
            </p>
          </div>
          <p>You earned <strong>${order.pointsEarned}</strong> loyalty points with this order!</p>
        </div>
        <div class="footer">
          <p>Thank you for shopping with us!</p>
        </div>
      </div>
    </body>
    </html>
  `,

  passwordReset: (resetUrl) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset</h1>
        </div>
        <div class="content">
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  guestAccountCreated: (email, tempPassword) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .credentials { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Created</h1>
        </div>
        <div class="content">
          <p>An account has been created for you to track your order.</p>
          <div class="credentials">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p>Please login and change your password for security.</p>
        </div>
      </div>
    </body>
    </html>
  `
};
