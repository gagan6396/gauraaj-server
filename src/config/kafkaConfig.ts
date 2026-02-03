import { Kafka } from "kafkajs";

const kafkaEnabled = process.env.ENABLE_KAFKA === "true";

// Create Kafka instance ONLY if enabled
const kafka = kafkaEnabled
  ? new Kafka({
      clientId: "shiprocket-service",
      brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
    })
  : null;

export const producer = kafka ? kafka.producer() : null;

// Initialize Kafka producer only when enabled
export const initializeKafka = async () => {
  if (!kafkaEnabled || !producer) {
    console.log("Kafka disabled. Skipping Kafka initialization.");
    return;
  }

  let retries = 5;
  while (retries > 0) {
    try {
      await producer.connect();
      console.log("Kafka Producer Connected");
      break;
    } catch (error) {
      console.error("Error connecting to Kafka:", error);
      retries--;
      if (retries === 0) {
        console.error("Failed to connect to Kafka after several attempts.");
        throw new Error("Failed to connect to Kafka");
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
};

// Send message ONLY if Kafka is enabled
export const sendMessageToKafka = async (topic: string, message: any) => {
  if (!kafkaEnabled || !producer) {
    console.log("Kafka disabled. Skipping message send.");
    return;
  }

  await producer.send({
    topic,
    messages: [
      {
        key: message.orderId,
        value: JSON.stringify(message),
      },
    ],
  });
};

// 🔥 IMPORTANT: only auto-init if enabled
if (kafkaEnabled) {
  initializeKafka().catch((error) => {
    console.error("Failed to initialize Kafka producer:", error);
  });
}
