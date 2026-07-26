import { Kafka } from 'kafkajs';
declare const kafka: Kafka;
export declare const producer: import("kafkajs").Producer;
export declare const consumer: import("kafkajs").Consumer;
export declare const scanConsumer: import("kafkajs").Consumer;
export declare const connectKafka: () => Promise<void>;
export default kafka;
//# sourceMappingURL=kafka.d.ts.map