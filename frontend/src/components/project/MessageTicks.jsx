import { MESSAGE_STATUS } from "../../utils/messageStatus";

const TICKS = {
  [MESSAGE_STATUS.PENDING]: { icon: "ri-time-line", className: "text-indigo-200/70", label: "Sending" },
  [MESSAGE_STATUS.SENT]: { icon: "ri-check-line", className: "text-indigo-200/80", label: "Sent" },
  [MESSAGE_STATUS.DELIVERED]: {
    icon: "ri-check-double-line",
    className: "text-indigo-200/80",
    label: "Delivered",
  },
  [MESSAGE_STATUS.READ]: { icon: "ri-check-double-line", className: "text-sky-300", label: "Read" },
};

/** Delivery ticks shown on your own messages. */
const MessageTicks = ({ status }) => {
  const tick = TICKS[status];
  if (!tick) return null;
  return <i className={`${tick.icon} text-sm leading-none ${tick.className}`} title={tick.label} />;
};

export default MessageTicks;
