const mongoose = require('mongoose');

async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codebuddy';
  
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
    console.log('✅ Connected to MongoDB at:', MONGODB_URI);
    return true;
  } catch (err) {
    console.warn('⚠️ Standard MongoDB unavailable. Launching MongoMemoryServer fallback...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('✅ Connected to MongoMemoryServer fallback at:', uri);
      return true;
    } catch (memErr) {
      console.error('❌ Database connection error:', memErr.message);
      return false;
    }
  }
}

module.exports = { connectDB };
