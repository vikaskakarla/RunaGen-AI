import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;
const TARGET_USER_ID = '696617113fe5ff7182c4ef80'; // From logs

if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in environment');
    process.exit(1);
}

// Define Schemas inline to avoid import issues in standalone script
const SessionSchema = new mongoose.Schema({
    userId: String,
    modeId: String,
    guidedPlan: Array
});

const SimulationSchema = new mongoose.Schema({
    userId: String,
    progress: {
        completed_modes: [String],
        overall_progress: Number
    },
    modes: [{
        id: String,
        completed: Boolean
    }],
    status: String
});

const SimulationSession = mongoose.models.SimulationSession || mongoose.model('SimulationSession', SessionSchema);
const Simulation = mongoose.models.Simulation || mongoose.model('Simulation', SimulationSchema);

async function cleanup() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        // 1. Delete legacy guided sessions
        console.log(`🗑️ Deleting Guided sessions for user: ${TARGET_USER_ID}`);
        const sessionResult = await SimulationSession.deleteMany({
            userId: TARGET_USER_ID,
            modeId: 'guided'
        });
        console.log(`✅ Deleted ${sessionResult.deletedCount} sessions.`);

        // 2. Reset progress in Simulations
        console.log(`🔄 Resetting Simulation progress for user: ${TARGET_USER_ID}`);
        const simResult = await Simulation.updateMany(
            { userId: TARGET_USER_ID },
            {
                $pull: { 'progress.completed_modes': 'guided' },
                $set: {
                    'progress.overall_progress': 0,
                    'status': 'active'
                }
            }
        );
        console.log(`✅ Updated ${simResult.modifiedCount} simulations (progress reset).`);

        // 3. Mark guided mode as not completed in the modes array
        const modeResult = await Simulation.updateMany(
            { userId: TARGET_USER_ID, 'modes.id': 'guided' },
            { $set: { 'modes.$.completed': false } }
        );
        console.log(`✅ Updated ${modeResult.modifiedCount} simulations (mode completion reset).`);

        console.log('🎉 Cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

cleanup();
