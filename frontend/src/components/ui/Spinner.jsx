
/**
 * Small circular loading indicator. Size and color are configurable so the
 * same component works inside buttons, full-page loaders, etc.
 */
const Spinner = ({ size = 20, className = "" }) => (
  <span
    role="status"
    aria-label="Loading"
    className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-90 ${className}`}
    style={{ width: size, height: size }}
  />
);

export default Spinner;
