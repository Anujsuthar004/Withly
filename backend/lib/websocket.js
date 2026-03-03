/**
 * WebSocket server for real-time chat and match notifications.
 * Uses the `ws` library attached to the existing HTTP server.
 */
const { WebSocketServer } = require("ws");
const { URL } = require("node:url");

// userId -> Set<WebSocket>
const clients = new Map();

let _verifyToken = null;
let _tokenSecret = null;
let _findUserById = null;

/**
 * Initialize WebSocket server on the existing HTTP server.
 */
function initWebSocket(httpServer, { verifyToken, tokenSecret, findUserById }) {
    _verifyToken = verifyToken;
    _tokenSecret = tokenSecret;
    _findUserById = findUserById;

    const wss = new WebSocketServer({ noServer: true });

    httpServer.on("upgrade", async (req, socket, head) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
            if (url.pathname !== "/ws") {
                socket.destroy();
                return;
            }

            const token = url.searchParams.get("token");
            if (!token) {
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            let payload;
            try {
                payload = _verifyToken(token, _tokenSecret);
            } catch {
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            const user = await _findUserById(payload.sub);
            if (!user) {
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            wss.handleUpgrade(req, socket, head, (ws) => {
                ws.userId = user.id;
                ws.displayName = user.displayName || user.email;
                wss.emit("connection", ws, req);
            });
        } catch (err) {
            console.error("WebSocket upgrade error:", err.message);
            socket.destroy();
        }
    });

    wss.on("connection", (ws) => {
        const userId = ws.userId;
        if (!clients.has(userId)) {
            clients.set(userId, new Set());
        }
        clients.get(userId).add(ws);

        ws.on("close", () => {
            const set = clients.get(userId);
            if (set) {
                set.delete(ws);
                if (set.size === 0) {
                    clients.delete(userId);
                }
            }
        });

        ws.on("error", () => {
            ws.close();
        });

        // Send a welcome message
        ws.send(JSON.stringify({ type: "connected", userId }));
    });

    return wss;
}

/**
 * Send a message to all WebSocket connections for a given userId.
 */
function sendToUser(userId, data) {
    const set = clients.get(String(userId));
    if (!set) return;
    const payload = JSON.stringify(data);
    for (const ws of set) {
        if (ws.readyState === 1) {
            ws.send(payload);
        }
    }
}

/**
 * Broadcast a new chat message to both matched users.
 */
function broadcastChatMessage(requestOwnerId, matchedUserId, message) {
    const data = {
        type: "chat_message",
        requestId: message.requestId,
        message,
    };
    sendToUser(requestOwnerId, data);
    sendToUser(matchedUserId, data);
}

/**
 * Notify both users that a match has been confirmed.
 */
function broadcastMatchConfirmed({ requestId, ownerUserId, matchedUserId, ownerName, matchedName }) {
    sendToUser(ownerUserId, {
        type: "match_confirmed",
        requestId,
        matchedWith: matchedName,
    });
    sendToUser(matchedUserId, {
        type: "match_confirmed",
        requestId,
        matchedWith: ownerName,
    });
}

module.exports = {
    initWebSocket,
    broadcastChatMessage,
    broadcastMatchConfirmed,
};
