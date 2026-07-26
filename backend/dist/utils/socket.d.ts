import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
export declare const initSocket: (server: HttpServer) => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const getIO: () => Server;
/**
 * Broadcast new alert to all connected clients.
 * Frontend can listen to 'new_alert' event.
 */
export declare const broadcastAlert: (alertData: any) => void;
/**
 * Broadcast new field report to all connected clients.
 * Frontend can listen to 'new_field_report' event.
 */
export declare const broadcastFieldReport: (reportData: any) => void;
export declare const broadcastScanUpdate: (scanData: any) => void;
export declare const broadcastZoneUpdate: (zoneData: any, action: "created" | "updated" | "deleted") => void;
export declare const broadcastAlertUpdate: (alertData: any) => void;
//# sourceMappingURL=socket.d.ts.map