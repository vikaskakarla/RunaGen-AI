import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB = process.env.MONGO_DB || 'career-companion';

console.log('Testing MongoDB Connection...');
console.log('Database:', MONGO_DB);
// Masking URI for security in logs, but showing prefix to ensure it's loaded
console.log('URI Loaded:', MONGO_URI ? 'Yes (' + MONGO_URI.substring(0, 15) + '...)' : 'No');

if (!MONGO_URI) {
    console.error('❌ Error: MONGO_URI is not defined in .env');
    process.exit(1);
}

mongoose.connect(MONGO_URI, { dbName: MONGO_DB })
    .then(() => {
        console.log('✅ Successfully connected to MongoDB Atlas!');
        return mongoose.connection.db.admin().ping();
    })
    .then(() => {
        console.log('✅ Database ping successful.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Connection failed:', err.message);
        if (err.message.includes('bad auth')) {
            console.error('   -> Check your username and password in MONGO_URI.');
        } else if (err.message.includes('whitelist') || err.message.includes('timeout')) {
            console.error('   -> Check your IP whitelist on MongoDB Atlas.');
        }
        process.exit(1);
    });
