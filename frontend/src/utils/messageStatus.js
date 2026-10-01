/**
 * Delivery state of a message you sent, in the familiar chat-app sense:
 *
 *   PENDING   - still on its way to the server (clock)
 *   SENT      - stored by the server (one tick)
 *   DELIVERED - every other collaborator's app has it (two ticks)
 *   READ      - every other collaborator has actually seen it (blue ticks)
 *
 * "Every other collaborator" matches group-chat behaviour: someone who is
 * offline keeps the message on one tick until their app picks it up.
 */
export const MESSAGE_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
};

const coveredByAll = (recipients = [], receipts = []) =>
  recipients.length > 0 && recipients.every((email) => receipts.includes(email));

export const getMessageStatus = (message, recipientEmails) => {
  if (!message.id) return MESSAGE_STATUS.PENDING;
  if (coveredByAll(recipientEmails, message.readBy)) return MESSAGE_STATUS.READ;
  if (coveredByAll(recipientEmails, message.deliveredTo)) return MESSAGE_STATUS.DELIVERED;
  return MESSAGE_STATUS.SENT;
};
