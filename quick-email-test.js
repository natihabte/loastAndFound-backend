const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('🔄 Testing Gmail configuration...');
  
  if (process.env.EMAIL_PASSWORD === 'your_gmail_app_password_here') {
    console.log('❌ Email password is still placeholder');
    console.log('💡 Please update EMAIL_PASSWORD in .env with your Gmail App Password');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  try {
    // Test connection
    await transporter.verify();
    console.log('✅ Gmail SMTP connection successful!');
    
    // Send test email
    const info = await transporter.sendMail({
      from: `FindIt <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'FindIt - Email Test Successful!',
      html: `
        <h2>🎉 Email Configuration Working!</h2>
        <p>Your FindIt application can now send emails.</p>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Test Verification Code: <span style="color: #2563eb; font-size: 24px;">123456</span></h3>
        </div>
        <p>Users will now receive verification codes via email!</p>
      `
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📬 Check your inbox:', process.env.EMAIL_USER);
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('💡 Common issues:');
    console.log('   - Wrong Gmail App Password');
    console.log('   - 2-Step Verification not enabled');
    console.log('   - Using regular password instead of App Password');
  }
}

testEmail();