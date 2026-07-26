/**
 * Campaign Scheduler
 * ------------------
 * Har ghante active campaigns check karo.
 * Agar kisi campaign ka next scan due ho → Kafka pe trigger karo.
 * Scan complete hone pe: compare + alert + final report.
 */
export declare const processCampaignScanResult: (campaignId: string, scanIdx: number, scanDocId: string) => Promise<void>;
export declare const startCampaignScheduler: () => void;
//# sourceMappingURL=campaign.scheduler.d.ts.map