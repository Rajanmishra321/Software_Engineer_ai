import mongoose from "mongoose";

function connectDb() {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("Connected to Database");
    })
    .catch((err) => {
      console.log(`error while connecting to DB: `, err);
    });
}

export default connectDb;
