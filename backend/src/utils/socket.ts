import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*', // For production, restrict this to frontend URL
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket] WebSockets initialized');
  return io;
};

// Singleton getter
export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

/**
 * Broadcast new alert to all connected clients.
 * Frontend can listen to 'new_alert' event.
 */
export const broadcastAlert = (alertData: any) => {
  if (io) {
    io.emit('new_alert', alertData);
    console.log(`[Socket] Broadcasted new_alert: ${alertData._id}`);
  }
};

/**
 * Broadcast new field report to all connected clients.
 * Frontend can listen to 'new_field_report' event.
 */
export const broadcastFieldReport = (reportData: any) => {
  if (io) {
    io.emit('new_field_report', reportData);
    console.log(`[Socket] Broadcasted new_field_report: ${reportData._id}`);
  }
};

export const broadcastScanUpdate = (scanData: any) => {
  if (io) {
    io.emit('scan_updated', scanData);
    console.log(`[Socket] Broadcasted scan_updated: ${scanData._id || scanData.jobId}`);
  }
};

export const broadcastZoneUpdate = (zoneData: any, action: 'created' | 'updated' | 'deleted') => {
  if (io) {
    io.emit('zone_updated', { action, zone: zoneData });
    console.log(`[Socket] Broadcasted zone_updated [${action}]: ${zoneData._id}`);
  }
};

export const broadcastAlertUpdate = (alertData: any) => {
  if (io) {
    io.emit('alert_updated', alertData);
    console.log(`[Socket] Broadcasted alert_updated: ${alertData._id}`);
  }
};
