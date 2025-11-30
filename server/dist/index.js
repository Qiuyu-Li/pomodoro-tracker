"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const env_1 = require("./config/env");
const app = (0, server_1.createServer)();
app.listen(env_1.env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API ready on http://localhost:${env_1.env.PORT}`);
});
