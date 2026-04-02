const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Manually parse .env.local to get MONGODB_URI
 * This avoids dependency on 'dotenv' package for this standalone script.
 */
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const fileContent = fs.readFileSync(envPath, 'utf8');
    const lines = fileContent.split('\n');
    const envVars = {};
    
    lines.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        envVars[key.trim()] = value;
      }
    });
    
    if (envVars.MONGODB_URI) {
      process.env.MONGODB_URI = envVars.MONGODB_URI;
      console.log('Loaded MONGODB_URI from .env.local');
    }
  }
}

// 1. Initial Load
loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI not found in .env.local or process.env');
  process.exit(1);
}

// 2. Define a minimal User Schema for seeding
// Note: We match the requirements of the actual model in 'src/lib/models/User.ts'
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'SALES'], default: 'SALES' },
  phoneNumber: { type: String, required: true },
  location: { type: String, required: true },
}, { timestamps: true });

// Check if model already exists to avoid OverwriteModelError
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    const adminEmail = 'admin@biometrik.com';
    const adminPassword = 'admin123';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`Admin user '${adminEmail}' already exists in the database.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash the password
    console.log('Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create the initial admin user with defaults for required fields
    const newAdmin = new User({
      name: 'Initial Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      phoneNumber: '0000000000',
      location: 'Biometrik Office'
    });

    await newAdmin.save();
    console.log('--------------------------------------------------');
    console.log('Initial Admin User Created Successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('--------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('An error occurred during seeding:');
    console.error(error.message);
    process.exit(1);
  }
}

seedAdmin();
