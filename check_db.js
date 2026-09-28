const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/requirement_dashboard');
  const db = mongoose.connection;
  const collection = db.collection('emailconfigs');
  const configs = await collection.find({}).toArray();
  console.log(JSON.stringify(configs, null, 2));
  process.exit(0);
}

check().catch(console.error);
