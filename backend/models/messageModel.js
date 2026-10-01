import mongoose from "mongoose";

// Chat history for a project. Without this, messages only existed in the
// browser tab that received them: refreshing cleared the chat and anything
// sent while a collaborator was away was lost.
const messageSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "project",
      required: true,
      index: true,
    },
    sender: {
      email: { type: String, required: true },
      name: { type: String },
    },
    message: {
      type: String,
      required: true,
    },
    // Emails of collaborators whose app has received / opened the message,
    // stored so the sender's ticks survive a refresh.
    deliveredTo: {
      type: [String],
      default: [],
    },
    readBy: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("message", messageSchema);

export default Message;
