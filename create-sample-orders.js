const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');
const Organization = require('./models/Organization');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://natnaelargawnatnael_db_user:nati1234@lost.uojr3iu.mongodb.net/findit?retryWrites=true&w=majority&appName=lostupdate';

async function createSampleOrders() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get existing users and organizations
    const users = await User.find().limit(5);
    const organizations = await Organization.find().limit(3);

    console.log('📊 Users found:', users.map(u => ({ id: u._id, name: u.name, email: u.email })));
    console.log('📊 Organizations found:', organizations.map(o => ({ id: o._id, name: o.name })));

    if (users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      return;
    }

    if (organizations.length === 0) {
      console.log('❌ No organizations found. Please create organizations first.');
      return;
    }

    console.log(`📊 Found ${users.length} users and ${organizations.length} organizations`);

    // Sample order data
    const sampleOrders = [
      {
        userId: users[0]._id,
        organizationId: organizations[0]._id,
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            name: 'Lost iPhone 13',
            quantity: 1,
            price: 50.00,
            total: 50.00
          }
        ],
        totalPrice: 50.00,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'credit_card',
        shippingAddress: {
          fullName: users[0].name || 'John Doe',
          phone: '+251911123456',
          email: users[0].email || 'john@example.com',
          street: '123 Bole Road',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          zipCode: '1000',
          country: 'Ethiopia'
        },
        notes: 'Please handle with care',
        priority: 'normal',
        source: 'website'
      },
      {
        userId: users[1]._id,
        organizationId: organizations[0]._id,
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            name: 'Found Wallet',
            quantity: 1,
            price: 25.00,
            total: 25.00
          },
          {
            itemId: new mongoose.Types.ObjectId(),
            name: 'Processing Fee',
            quantity: 1,
            price: 10.00,
            total: 10.00
          }
        ],
        totalPrice: 35.00,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'bank_transfer',
        shippingAddress: {
          fullName: users[1].name || 'Jane Smith',
          phone: '+251922234567',
          email: users[1].email || 'jane@example.com',
          street: '456 Piazza Street',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          zipCode: '1001',
          country: 'Ethiopia'
        },
        notes: 'Urgent delivery requested',
        priority: 'high',
        source: 'mobile_app'
      },
      {
        userId: users[2]._id,
        organizationId: organizations[1]._id,
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            name: 'Lost Keys Set',
            quantity: 1,
            price: 15.00,
            total: 15.00
          }
        ],
        totalPrice: 15.00,
        status: 'processing',
        paymentStatus: 'paid',
        paymentMethod: 'cash_on_delivery',
        shippingAddress: {
          fullName: users[2].name || 'Bob Johnson',
          phone: '+251933345678',
          email: users[2].email || 'bob@example.com',
          street: '789 Merkato Area',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          zipCode: '1002',
          country: 'Ethiopia'
        },
        trackingNumber: 'TRK123456789',
        priority: 'normal',
        source: 'website'
      },
      {
        userId: users[3]._id,
        organizationId: organizations[1]._id,
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            name: 'Found Laptop Bag',
            quantity: 1,
            price: 75.00,
            total: 75.00
          }
        ],
        totalPrice: 75.00,
        status: 'shipped',
        paymentStatus: 'paid',
        paymentMethod: 'paypal',
        shippingAddress: {
          fullName: users[3].name || 'Alice Brown',
          phone: '+251944456789',
          email: users[3].email || 'alice@example.com',
          street: '321 Kazanchis Road',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          zipCode: '1003',
          country: 'Ethiopia'
        },
        trackingNumber: 'TRK987654321',
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        priority: 'normal',
        source: 'website'
      },
      {
        userId: users[4]._id,
        organizationId: organizations[0]._id,
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            name: 'Lost Watch',
            quantity: 1,
            price: 100.00,
            total: 100.00
          }
        ],
        totalPrice: 100.00,
        status: 'delivered',
        paymentStatus: 'paid',
        paymentMethod: 'credit_card',
        shippingAddress: {
          fullName: users[4].name || 'Charlie Wilson',
          phone: '+251955567890',
          email: users[4].email || 'charlie@example.com',
          street: '654 CMC Road',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          zipCode: '1004',
          country: 'Ethiopia'
        },
        deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        priority: 'high',
        source: 'mobile_app'
      },
      {
        userId: users[0]._id,
        organizationId: organizations[0]._id,
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            name: 'Found Backpack',
            quantity: 1,
            price: 40.00,
            total: 40.00
          }
        ],
        totalPrice: 40.00,
        status: 'cancelled',
        paymentStatus: 'refunded',
        paymentMethod: 'credit_card',
        shippingAddress: {
          fullName: users[0].name || 'John Doe',
          phone: '+251911123456',
          email: users[0].email || 'john@example.com',
          street: '123 Bole Road',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          zipCode: '1000',
          country: 'Ethiopia'
        },
        cancelledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        cancelReason: 'Customer requested cancellation',
        refundAmount: 40.00,
        refundedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        priority: 'low',
        source: 'phone'
      }
    ];

    // Add some older orders for pagination testing
    const olderOrders = [];
    for (let i = 0; i < 25; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomOrg = organizations[Math.floor(Math.random() * organizations.length)];
      const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const paymentStatuses = ['pending', 'paid', 'failed'];
      const randomPaymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
      const itemPrice = Math.floor(Math.random() * 100) + 10;
      
      olderOrders.push({
        userId: randomUser._id,
        organizationId: randomOrg._id,
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            name: `Sample Item ${i + 1}`,
            quantity: 1,
            price: itemPrice,
            total: itemPrice
          }
        ],
        totalPrice: itemPrice,
        status: randomStatus,
        paymentStatus: randomPaymentStatus,
        paymentMethod: 'credit_card',
        shippingAddress: {
          fullName: randomUser.name || `User ${i + 1}`,
          phone: `+25191${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`,
          email: randomUser.email || `user${i + 1}@example.com`,
          street: `${Math.floor(Math.random() * 999) + 1} Sample Street`,
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          zipCode: `10${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`,
          country: 'Ethiopia'
        },
        priority: ['low', 'normal', 'high'][Math.floor(Math.random() * 3)],
        source: ['website', 'mobile_app', 'phone'][Math.floor(Math.random() * 3)],
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) // Random date within last 30 days
      });
    }

    const allOrders = [...sampleOrders, ...olderOrders];

    // Clear existing orders
    await Order.deleteMany({});
    console.log('🗑️ Cleared existing orders');

    // Create new orders
    const createdOrders = await Order.insertMany(allOrders);
    console.log(`✅ Created ${createdOrders.length} sample orders`);

    // Display summary
    const statusCounts = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalPrice' }
        }
      }
    ]);

    console.log('\n📊 Order Summary:');
    statusCounts.forEach(status => {
      console.log(`   ${status._id}: ${status.count} orders, $${status.totalValue.toFixed(2)} total`);
    });

    const totalStats = await Order.getOrderStats();
    console.log('\n📈 Overall Statistics:');
    console.log(`   Total Orders: ${totalStats.totalOrders}`);
    console.log(`   Total Revenue: $${totalStats.totalRevenue.toFixed(2)}`);
    console.log(`   Average Order Value: $${totalStats.avgOrderValue.toFixed(2)}`);
    console.log(`   Pending Orders: ${totalStats.pendingOrders}`);
    console.log(`   Completed Orders: ${totalStats.completedOrders}`);
    console.log(`   Cancelled Orders: ${totalStats.cancelledOrders}`);

    console.log('\n🎉 Sample orders created successfully!');
    console.log('🔗 You can now test the Admin Orders page at: /admin-orders');

  } catch (error) {
    console.error('❌ Error creating sample orders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔒 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  createSampleOrders();
}

module.exports = createSampleOrders;