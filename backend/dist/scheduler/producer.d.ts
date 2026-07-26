/**
 * Scheduler / Producer
 * ---------------------
 * 1. Auto-scan cron       — Raat 2 baje saare zones scan karo
 * 2. Stuck scan handler   — 30 min se zyada "pending" → "failed" mark karo + email
 */
export declare const publishScanJob: (zoneId: string) => Promise<string | null>;
export declare const startScheduler: () => void;
//# sourceMappingURL=producer.d.ts.map