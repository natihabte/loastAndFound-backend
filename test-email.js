const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('🔄 Testing email configuration...');
console.log('📧 Email Host:', process.env.EMAIL_HOST);
console.log('📧 Email User:', process.env.EMAIL_USER);
console.log('📧 Email Password:', process.env.EMAIL_PASSWORD ? 'Set' : 'Missing');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Test email
const testEmail = {
  from: `FindIt <${process.env.EMAIL_USER}>`,
  to: process.env.EMAIL_USER, // Send to yourself for testing
  subject: 'FindIt Email Test - Verification Code',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">FindIt Email Test</h2>
      <p>This is a test email from your FindIt application.</p>
      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0;">123456</h1>
      </div>
      <p>If you received this email, your email configuration is working correctly!</p>
      <p style="color: #6b7280; font-size: 12px;">FindIt - Lost & Found Platform</p>
    </div>
  `
};

transporter.sendMail(testEmail)
  .then(() => {
    console.log('✅ SUCCESS: Test email sent successfully!');
    console.log('📬 Check your inbox:', process.env.EMAIL_USER);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ FAILED: Email sending failed');
    console.error('🔍 Error:', err.message);
    console.log('\n💡 Common issues:');
    console.log('   - Gmail App Password not set correctly');
    console.log('   - 2-Step Verification not enabled');
    console.log('   - Wrong email/password combination');
    process.exit(1);
  });