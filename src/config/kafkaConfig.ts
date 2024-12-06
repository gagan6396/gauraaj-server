import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "shiprocket-service",
  brokers: ["localhost:9092"],
});

export const producer = kafka.producer();

// Function to initialize Kafka producer with retry mechanism
export const initializeKafka = async () => {
  let retries = 5; // Retry up to 5 times
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
      } else {
        console.log(
          `Retrying to connect to Kafka... Attempts remaining: ${retries}`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retrying
      }
    }
  }
};

// Function to send messages to Kafka with error handling
export const sendMessageToKafka = async (topic: string, message: any) => {
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: message.orderId,
          value: JSON.stringify(message),
        },
      ],
    });
    console.log(`Message sent to Kafka topic ${topic}`);
  } catch (error) {
    console.error("Error sending message to Kafka:", error);
    throw new Error("Error sending message to Kafka");
  }
};

// Event listener for producer errors
producer.on("producer.connect", () => {
  console.log("Kafka Producer connected successfully.");
});

// Ensure Kafka Producer is connected before using it in other parts of your application
initializeKafka().catch((error) => {
  console.error("Failed to initialize Kafka producer:", error);
});
