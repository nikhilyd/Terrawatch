"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectKafka = exports.scanConsumer = exports.consumer = exports.producer = void 0;
const kafkajs_1 = require("kafkajs");
const env_1 = __importDefault(require("./env"));
const kafka = new kafkajs_1.Kafka({
    clientId: 'ecowatch-node-service',
    brokers: [env_1.default.KAFKA_BROKER],
});
exports.producer = kafka.producer();
exports.consumer = kafka.consumer({ groupId: env_1.default.KAFKA_GROUP });
// Separate consumer for scan processing (subscribes to scan-jobs topic)
exports.scanConsumer = kafka.consumer({ groupId: 'ecowatch-scan-processor' });
const connectKafka = async () => {
    try {
        await exports.producer.connect();
        await exports.consumer.connect();
        await exports.scanConsumer.connect();
        console.log('Kafka connected');
    }
    catch (error) {
        console.error('Kafka connection failed:', error);
        process.exit(1);
    }
};
exports.connectKafka = connectKafka;
exports.default = kafka;
//# sourceMappingURL=kafka.js.map