"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastAlertUpdate = exports.broadcastZoneUpdate = exports.broadcastScanUpdate = exports.broadcastFieldReport = exports.broadcastAlert = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*', // For production, restrict this to frontend URL
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
    });
    io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);
        socket.on('disconnect', () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
        });
    });
    console.log('[Socket] WebSockets initialized');
    return io;
};
exports.initSocket = initSocket;
// Singleton getter
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};
exports.getIO = getIO;
/**
 * Broadcast new alert to all connected clients.
 * Frontend can listen to 'new_alert' event.
 */
const broadcastAlert = (alertData) => {
    if (io) {
        io.emit('new_alert', alertData);
        console.log(`[Socket] Broadcasted new_alert: ${alertData._id}`);
    }
};
exports.broadcastAlert = broadcastAlert;
/**
 * Broadcast new field report to all connected clients.
 * Frontend can listen to 'new_field_report' event.
 */
const broadcastFieldReport = (reportData) => {
    if (io) {
        io.emit('new_field_report', reportData);
        console.log(`[Socket] Broadcasted new_field_report: ${reportData._id}`);
    }
};
exports.broadcastFieldReport = broadcastFieldReport;
const broadcastScanUpdate = (scanData) => {
    if (io) {
        io.emit('scan_updated', scanData);
        console.log(`[Socket] Broadcasted scan_updated: ${scanData._id || scanData.jobId}`);
    }
};
exports.broadcastScanUpdate = broadcastScanUpdate;
const broadcastZoneUpdate = (zoneData, action) => {
    if (io) {
        io.emit('zone_updated', { action, zone: zoneData });
        console.log(`[Socket] Broadcasted zone_updated [${action}]: ${zoneData._id}`);
    }
};
exports.broadcastZoneUpdate = broadcastZoneUpdate;
const broadcastAlertUpdate = (alertData) => {
    if (io) {
        io.emit('alert_updated', alertData);
        console.log(`[Socket] Broadcasted alert_updated: ${alertData._id}`);
    }
};
exports.broadcastAlertUpdate = broadcastAlertUpdate;
//# sourceMappingURL=socket.js.map