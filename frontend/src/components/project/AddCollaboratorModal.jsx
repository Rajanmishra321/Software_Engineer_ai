import { useState } from "react";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";

/**
 * Lets the user pick collaborators to add. Users already in the project
 * are shown but can't be selected again.
 */
const AddCollaboratorModal = ({ isOpen, users = [], memberIds, onClose, onConfirm }) => {
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const close = () => {
    setSelectedIds(new Set());
    setError("");
    onClose();
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    setError("");
    try {
      await onConfirm([...selectedIds]);
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={close}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-xl font-semibold text-slate-900">Add Collaborators</h2>
          <button
            onClick={close}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <i className="ri-close-fill text-xl"></i>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
          {users.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">No other users found</p>
          )}
          {users.map((candidate) => {
            const isMember = memberIds.has(candidate._id);
            const isSelected = selectedIds.has(candidate._id);
            return (
              <button
                key={candidate._id}
                type="button"
                disabled={isMember}
                onClick={() => toggle(candidate._id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected ? "border-indigo-200 bg-indigo-50" : "border-transparent hover:bg-slate-50"
                }`}
              >
                <Avatar />
                <span className="truncate font-medium text-slate-800">{candidate.email}</span>
                {isMember && <span className="ml-auto text-xs text-slate-400">Already added</span>}
                {isSelected && <i className="ri-check-line ml-auto text-lg text-indigo-600"></i>}
              </button>
            );
          })}
        </div>

        {error && <p className="px-4 text-sm text-red-600">{error}</p>}

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 p-4">
          <Button variant="ghost" onClick={close} className="!py-2">
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={isSaving} disabled={selectedIds.size === 0} className="!py-2">
            Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddCollaboratorModal;
