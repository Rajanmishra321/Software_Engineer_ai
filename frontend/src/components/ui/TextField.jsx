
/**
 * Text input with an optional leading icon and trailing element (e.g. a
 * password visibility toggle). Used by Login, Register and Home so those
 * forms share one implementation instead of duplicating input markup.
 *
 * Deliberately has no baked-in colors: only layout (padding, border-radius,
 * icon position) is fixed here. Every caller passes its own bg/text/border/
 * focus colors via `className` so a light-theme screen (Home) and a
 * dark-theme screen (Login/Register) can't fight over which color wins —
 * Tailwind resolves same-specificity utility classes by stylesheet order,
 * not by where they appear in the className string, so mixing a default
 * color here with an override in `className` is unreliable.
 */
const TextField = ({ icon: Icon, rightElement, className = "", iconClassName = "", ...props }) => (
  <div className="relative">
    {Icon && (
      <Icon
        size={20}
        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${iconClassName}`}
      />
    )}
    <input
      className={`w-full rounded-xl border py-3 transition-all outline-none focus:ring-2 ${
        Icon ? "pl-12" : "pl-4"
      } ${rightElement ? "pr-12" : "pr-4"} ${className}`}
      {...props}
    />
    {rightElement && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
    )}
  </div>
);

export default TextField;
