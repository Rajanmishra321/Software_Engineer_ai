import mongoose from "mongoose";
import Message from "../models/messageModel.js";

// AI replies carry a whole file tree, so messages can be large. Cap what is
// stored so one reply can't bloat the history (the files themselves are
// saved separately on the project).
const MAX_MESSAGE_LENGTH = 100_000;

// How many messages a project's chat loads when it is opened.
export const HISTORY_LIMIT = 200;

export const createMessage = async ({ projectId, sender, message }) => {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid project id");
  }
  if (!sender?.email || typeof message !== "string" || !message) {
    throw new Error("Sender email and message are required");
  }

  return Message.create({
    project: projectId,
    sender: { email: sender.email, name: sender.name },
    message: message.slice(0, MAX_MESSAGE_LENGTH),
  });
};

// Receipt fields a reader can be added to.
const RECEIPT_FIELDS = { delivered: "deliveredTo", read: "readBy" };

/**
 * Records that `email` received ("delivered") or opened ("read") the given
 * messages. Reading implies delivery, so both are recorded for "read".
 */
export const markMessages = async ({ projectId, ids, email, status }) => {
  const field = RECEIPT_FIELDS[status];
  if (!field || !email || !Array.isArray(ids) || ids.length === 0) return;

  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) return;

  const addToSet =
    status === "read" ? { readBy: email, deliveredTo: email } : { deliveredTo: email };

  await Message.updateMany(
    { _id: { $in: validIds }, project: projectId },
    { $addToSet: addToSet }
  );
};

/** Returns the most recent messages for a project, oldest first. */
export const getProjectMessages = async ({ projectId, limit = HISTORY_LIMIT }) => {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid project id");
  }

  // _id breaks ties: messages saved within the same millisecond would
  // otherwise come back in an arbitrary order.
  const messages = await Message.find({ project: projectId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();

  return messages.reverse();
};
