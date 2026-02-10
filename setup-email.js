const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('📧 Email Verification Setup for FindIt\n');
console.log('This utility will help you configure email verification codes.\n');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEmail() {
  try {
    console.log('📋 Please provide your email configuration:\n');
    
    const email = await question('Enter your Gmail address: ');
    const appPassword = await question('Enter your Gmail App Password (16 characters): ');
    
    console.log('\n🔍 Validating configuration...');
    
    // Basic validation
    if (!email.includes('@gmail.com')) {
      console.log('⚠️  Warning: This setup is optimized for Gmail. Other providers may need different settings.');
    }
    
    if (appPassword.replace(/\s/g, '').length !== 16) {
      console.log('⚠️  Warning: Gmail App Passwords are typically 16 characters long.');
    }
    
    // Read current .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update email configuration
    const emailConfig = `
# Email Configuration (for OTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=${email}
EMAIL_PASSWORD=${appPassword.replace(/\s/g, '')}
`;
    
    // Remove existing email config and add new one
    envContent = envContent.replace(/# Email Configuration[\s\S]*?(?=\n#|\n[A-Z]|$)/g, '');
    envContent += emailConfig;
    
    // Write updated .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Email configuration saved to .env file');
    console.log('\n🧪 Testing email configuration...');
    
    // Test the configuration
    process.env.EMAIL_HOST = 'smtp.gmail.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = email;
    process.env.EMAIL_PASSWORD = appPassword.replace(/\s/g, '');
    
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    
    // Send test email
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await transporter.sendMail({
      from: `FindIt <${email}>`,
      to: email,
      subject: '🎉 Email Verification Setup Complete - FindIt',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; text-align: center;">🎉 Email Setup Complete!</h2>
          <div style="background-color: #f0f9ff; border: 2px solid #2563eb; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="color: #1e40af; margin: 0;">Test Verification Code:</h3>
            <h1 style="color: #2563eb; font-size: 36px; letter-spacing: 8px; margin: 10px 0; font-family: monospace;">${testCode}</h1>
          </div>
          <div style="background-color: #f0fdf4; border: 2px solid #16a34a; border-radius: 10px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #15803d; margin: 0 0 10px 0;">✅ Your Email Verification is Now Active!</h4>
            <ul style="color: #166534; margin: 10px 0; padding-left: 20px;">
              <li>Users will receive verification codes when they register</li>
              <li>Codes are valid for 10 minutes</li>
              <li>Backup console logging is still available</li>
              <li>All email activities are logged for admin monitoring</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              FindIt Lost & Found - Email Verification System<br>
              Setup completed: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `
    });
    
    console.log('\n🎉 Setup Complete!');
    console.log(`📧 Test email sent to: ${email}`);
    console.log(`🔢 Test verification code: ${testCode}`);
    console.log('\n📋 Next steps:');
    console.log('1. Check your email inbox for the test message');
    console.log('2. Restart your backend server: npm start');
    console.log('3. Test user registration with email verification');
    console.log('\n🔒 Security reminders:');
    console.log('- Never share your App Password');
    console.log('- Keep 2-factor authentication enabled');
    console.log('- Rotate App Passwords regularly');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure you have a Gmail App Password (not regular password)');
    console.log('2. Enable 2-factor authentication on your Gmail account');
    console.log('3. Check your internet connection');
    console.log('4. Verify the email address is correct');
    console.log('\n📖 See EMAIL_SETUP_GUIDE.md for detailed instructions');
  } finally {
    rl.close();
  }
}

// Show instructions first
console.log('📖 Before starting, make sure you have:');
console.log('1. ✅ Gmail account with 2-factor authentication enabled');
console.log('2. ✅ Gmail App Password generated (16 characters)');
console.log('3. ✅ Internet connection');
console.log('\n💡 If you need help generating an App Password, see EMAIL_SETUP_GUIDE.md\n');

question('Press Enter to continue or Ctrl+C to exit...').then(() => {
  setupEmail();
});