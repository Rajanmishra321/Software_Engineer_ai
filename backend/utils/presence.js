/**
 * Tracks who is connected to each project room and which file they have
 * open, so collaborators can see where everyone is working.
 *
 * Kept in memory on purpose: presence is only meaningful while sockets are
 * connected, and it is rebuilt as clients reconnect.
 */
const rooms = new Map(); // roomId -> Map<socketId, { email, file }>

const roomMembers = (roomId) => {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
};

export const join = (roomId, socketId, email) => {
  roomMembers(roomId).set(socketId, { email, file: null });
};

export const setFile = (roomId, socketId, file) => {
  const member = roomMembers(roomId).get(socketId);
  if (member) member.file = typeof file === "string" ? file : null;
};

export const leave = (roomId, socketId) => {
  const members = roomMembers(roomId);
  members.delete(socketId);
  if (members.size === 0) rooms.delete(roomId);
};

/** One entry per person in the room (a user open in two tabs appears once). */
export const list = (roomId) => {
  const byEmail = new Map();
  for (const { email, file } of roomMembers(roomId).values()) {
    // Prefer an entry that has a file open over an idle one.
    if (!byEmail.get(email)?.file) byEmail.set(email, { email, file });
  }
  return [...byEmail.values()];
};
