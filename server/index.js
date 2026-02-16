import express from "express";
import redis from "redis";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import { createAdapter } from "@socket.io/redis-adapter";

const serverName = process.env.SERVER_NAME;

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

app.use(cors());
app.use(express.static("public"));
let redisClient;
async function initRedis() {
    redisClient = await redis.createClient({
        url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    });

    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));

    await redisClient.connect();

    await Promise.all([
        redisClient.hSet("servers", serverName, JSON.stringify({
            serverName,
            connectedUsers: 0,
        })),
        redisClient.set("online-users", 0)
    ])
}

app.get("/", async (req, res) => {
    try {
        res.send(`Hello, I am Server ${serverName}`);
    } catch (error) {
        res.status(500).send("Error connecting to Redis");
    }
});

async function getAllServersStats(socketID) {
    const servers = await redisClient.hGetAll("servers");
    return {
        servers: Object.values(servers).map(server => JSON.parse(server)).reduce((acc, server) => {
            acc[server.serverName] = server;
            return acc;
        }, {}),
        onlineUsers: Number(await redisClient.get("online-users")),
        currentServer: serverName,
        socketID
    };
}

async function updateServerConnection(delta) {
    await redisClient.incrBy("online-users", delta);
    const raw = await redisClient.hGet("servers", serverName);
    const serverData = JSON.parse(raw);
    serverData.connectedUsers = Math.max(0, serverData.connectedUsers + delta);
    await redisClient.hSet("servers", serverName, JSON.stringify(serverData));
}

io.on("connection", async (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    await updateServerConnection(1);
    io.emit("user:connected", await getAllServersStats(socket.id));
    socket.on("disconnect", async () => {
        console.log(`Socket disconnected: ${socket.id}`);
        await updateServerConnection(-1);
        io.emit("user:disconnected", await getAllServersStats(socket.id));
    });
});

async function startServer() {
    try {
        await initRedis();
        console.log(`Connected to Redis on redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
        server.listen(3000, () => {
            console.log(`Server ${serverName} started on port 3000`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}

startServer();