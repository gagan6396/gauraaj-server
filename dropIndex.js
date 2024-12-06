import mongoose from "mongoose";

const uri = "mongodb+srv://ravi:ravi1234@cluster1.wkayd5z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1"; 

const dropIndex = async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const collection = mongoose.connection.db.collection("users");
    await collection.dropIndex("username_1");

    console.log("Index 'username_1' dropped successfully.");
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error dropping index:", error);
  }
};

dropIndex();
