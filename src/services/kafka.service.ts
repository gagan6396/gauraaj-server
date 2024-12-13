import { KafkaClient, Producer, Consumer } from "kafka-node";

const kafkaClient = new KafkaClient({ kafkaHost: "localhost:9092" });
const kafkaProducer = new Producer(kafkaClient);

const publishEvent = (topic: string, message: any) => {
  return new Promise((resolve, reject) => {
    const payloads = [{ topic, messages: JSON.stringify(message) }];
    kafkaProducer.send(payloads, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
};

const subscribeEvent = (
  topic: string,
  callback: (message: any) => void
) => {
  const consumer = new Consumer(kafkaClient, [{ topic }], { autoCommit: true });

  consumer.on("message", (message) => {
    try {
      const parsedMessage = JSON.parse(message.value as string);
      callback(parsedMessage);
    } catch (err) {
      console.error("Error parsing Kafka message:", err);
    }
  });

  consumer.on("error", (err) => {
    console.error("Error in Kafka consumer:", err);
  });
};


export {publishEvent, subscribeEvent};