/* eslint-disable @typescript-eslint/no-unused-vars */
import { fastify } from 'fastify';
import cors from '@fastify/cors';
import mongoose, { Schema, model } from 'mongoose';
import { runMongo, TableParams, tableParamsSchema } from '../src/index.js';

const DB_URL = 'mongodb://localhost:27017/testdb';
const HTTP_PORT = 3000;

// 1. Define an interface for TypeScript type safety
interface IUser {
    id: number;
    name: string;
    email: string;
}

// 2. Create a Mongoose schema and model
const userSchema = new Schema<IUser>({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
});

const User = model<IUser>('User', userSchema);

listen();

async function listen() {
    const app = fastify();

    await mongoose.connect(DB_URL);

    // Register CORS plugin
    await app.register(cors, {
        // Allow all origins (for development)
        origin: true,
        // For production, specify: origin: ['https://your-frontend.com']
        maxAge: 1728000,
    });

    app.post<{ Body: TableParams }>('/', { schema: { body: tableParamsSchema } }, (req, reply) => {
        (async () => {
            try {
                const params = req.body;

                console.log(params);

                reply.send(await runMongo(User, params));

                // eslint-disable-next-line no-empty
            } catch {}
        })();
    });

    await app.listen({ port: HTTP_PORT });

    console.log(`Server running at http://localhost:${HTTP_PORT}`);
}

// 4. Connect to MongoDB & push data
async function pushData() {
    try {
        // 3. Generate Mock Data
        const mockData: IUser[] = [];
        for (let i = 1; i <= 100; i++) {
            mockData.push({
                id: i,
                name: `Name ${i}`,
                email: `email${i}@example.com`,
            });
        }

        await mongoose.connect(DB_URL);

        // You may want to clear the collection first (optional)
        // await User.deleteMany({}); // CAUTION: deletes all docs in 'users' collection

        const result = await User.insertMany(mockData, { ordered: false });
        console.log(`Inserted ${result.length} users`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}
