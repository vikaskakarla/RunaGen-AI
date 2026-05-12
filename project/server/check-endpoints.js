
import io from 'socket.io-client';
import axios from 'axios';

const API_URL = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';
const USER_ID = 'test-user-' + Date.now();

async function runTest() {
    console.log('🔵 Connecting to socket...');
    const socket = io(SOCKET_URL);

    socket.on('connect', async () => {
        console.log('✅ Socket connected:', socket.id);

        // Register user
        socket.emit('register', USER_ID);

        try {
            console.log('🔵 triggering /generate-simulations...');
            const response = await axios.post(`${API_URL}/generate-simulations`, {
                userId: USER_ID,
                role: 'Software Engineer',
                skillsPresent: ['JavaScript', 'React'],
                skillsMissing: ['Python', 'AWS']
            });

            console.log('📥 API Response Status:', response.status);
            console.log('📥 API Response Data:', JSON.stringify(response.data, null, 2));

        } catch (error) {
            console.error('❌ API Call Failed:', error.message);
            if (error.response) {
                console.error('Data:', error.response.data);
            }
        }
    });

    socket.on('simulation_generated', (data) => {
        console.log('📩 Received simulation_generated event');
        console.log('DATA:', JSON.stringify(data, null, 2));

        if (data.simulations && data.simulations.length > 0) {
            const sim = data.simulations[0];
            if (sim.title && sim.description) {
                console.log('✅ Simulation has title and description');
            } else {
                console.error('❌ Simulation MISSING title or description');
            }
        } else {
            console.error('❌ No simulations returned');
        }

        socket.disconnect();
        process.exit(0);
    });

    // Timeout
    setTimeout(() => {
        console.log('⏳ Timeout waiting for socket event');
        process.exit(1);
    }, 90000);
}

runTest();
