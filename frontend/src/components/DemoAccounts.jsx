import { DEMO_ACCOUNTS, DEMO_HINT, DEMO_PASSWORD } from "../config/demo";

/**
 * One-click sign-in with the shared demo accounts, so a visitor can see the
 * app immediately instead of having to register.
 */
const DemoAccounts = ({ onUse, disabled }) => (
  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
    <p className="flex items-center gap-2 text-sm font-semibold text-white">
      <i className="ri-flashlight-line text-indigo-400"></i>
      Try it instantly
    </p>
    <p className="mt-1 text-xs text-slate-400">{DEMO_HINT}</p>

    <div className="mt-3 space-y-2">
      {DEMO_ACCOUNTS.map(({ email, label }) => (
        <button
          key={email}
          type="button"
          disabled={disabled}
          onClick={() => onUse(email, DEMO_PASSWORD)}
          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-left transition-colors hover:border-indigo-400/60 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <i className="ri-user-smile-line text-lg text-indigo-400"></i>
          <span className="min-w-0 flex-grow">
            <span className="block truncate text-sm font-medium text-white">{email}</span>
            <span className="block text-xs text-slate-500">
              {label} · password {DEMO_PASSWORD}
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-indigo-300">Sign in</span>
        </button>
      ))}
    </div>
  </div>
);

export default DemoAccounts;
