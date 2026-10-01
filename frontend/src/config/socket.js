import { getToken } from "../utils/token";
import socket from "socket.io-client";

let socketInstance = null;

export const initializeSocket = (projectId) => {
    // Drop any previous connection so reopening a project doesn't leave a
    // stale socket (and its listeners) delivering duplicate messages.
    disconnectSocket();

    socketInstance = socket(import.meta.env.VITE_API_URL, {
        auth: {
            token: getToken()
        },
        query: {
            projectId
        }
    });

    return socketInstance;
};

/** Subscribes to an event and returns a function that unsubscribes. */
export const receiveMessage = (eventName, cb) => {
    const current = socketInstance;
    current?.on(eventName, cb);
    return () => current?.off(eventName, cb);
};

/** `ack` is called with the server's reply, e.g. the stored message's id. */
export const sendMessage = (eventName, data, ack) => {
    socketInstance?.emit(eventName, data, ack);
};

export const disconnectSocket = () => {
    socketInstance?.disconnect();
    socketInstance = null;
};
