import { Server } from "./server";
var fs = require('fs');
const server = new Server();


server.listen((port: any) => {
 console.log(`Server is listening on https://localhost:${port}`);
});