import express, { Express, Request, Response } from "express";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
var https = require('https');
var fs = require('fs');
require("dotenv").config();

export class Server {
    private app: Express;
    private server;
    private io: SocketIOServer;
    private activeSockets: string[] = [];

    constructor() {
        this.app = express();
        this.configureApp();
        this.server = https.createServer({
            key: fs.readFileSync('./key.pem'),
            cert: fs.readFileSync('./cert.pem'),
            passphrase: process.env.CERT_PASSPHRASE
        }, this.app);
        this.io = new SocketIOServer(this.server);

        this.handleRoutes();
        this.handleSocketConnection();
    }

    private configureApp(): void {
        this.app.use(express.static(path.join(__dirname, "../public")));
    }

    private handleRoutes(): void {

    }

    private handleSocketConnection(): void {
        this.io.on("connection", (socket: any) => {
            console.log("Socket connected.");
        });

        this.io.on("connection", socket => {
            const existingSocket = this.activeSockets.find(connectedSocket => connectedSocket === socket.id);

            if (!existingSocket) {
                this.activeSockets.push(socket.id);
                socket.emit("update-user-list", {
                    users: this.activeSockets.filter(connectedSocket => connectedSocket !== socket.id)
                });
                socket.broadcast.emit("update-user-list", {
                    users: [socket.id]
                });
                socket.on("disconnect", () => {
                    this.activeSockets = this.activeSockets.filter(connectedSocket => connectedSocket !== socket.id);
                    socket.broadcast.emit("remove-user", {
                        socketId: socket.id
                    });
                });
                socket.on("call-user", data => {
                    socket.to(data.to).emit("call-made", {
                        offer: data.offer,
                        socket: socket.id
                    });
                });
                socket.on("make-answer", data => {
                    socket.to(data.to).emit("answer-made", {
                        socket: socket.id,
                        answer: data.answer
                    });
                });
            }
        });
    }

    public listen(cb: (port: any) => void): void {
        this.server.listen(process.env.port || 3000, () => {
            cb(process.env.port || 3000);
        });
    }
}