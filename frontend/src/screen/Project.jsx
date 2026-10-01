import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "../config/axios";
import { disconnectSocket, initializeSocket, receiveMessage, sendMessage } from "../config/socket";
import { UserContext } from "../context/UserContext";
import useProjectRunner from "../hooks/useProjectRunner";
import ChatPanel from "../components/project/ChatPanel";
import CollaboratorsPanel from "../components/project/CollaboratorsPanel";
import AddCollaboratorModal from "../components/project/AddCollaboratorModal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import FileExplorer from "../components/project/FileExplorer";
import CodeEditor from "../components/project/CodeEditor";
import { PreviewPane, RunControls, RunOutput } from "../components/project/RunPanel";
import {
  getFileContent,
  hashContent,
  isDirectory,
  listFilePaths,
  movePath,
  pathExists,
  pickEntryFile,
  removePath,
  setFileContent,
} from "../utils/fileTree";
import { AI_SENDER_EMAIL, getErrorMessage, parseMessage } from "../utils/messages";

// Short enough that collaborators see edits almost immediately, long enough
// that a burst of typing is sent as one update.
const SAVE_DELAY_MS = 300;

/** Returns a copy of `object` without `key`. */
const omitKey = (object, key) =>
  Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));
const AI_MENTION = "@ai";

let messageCounter = 0;
const createChatMessage = (sender, message, isOutgoing, stored = {}) => ({
  // `key` is for React and never changes. `id` is the server's id, which
  // arrives once the message is stored and drives the delivery ticks.
  key: stored._id ?? `local-${Date.now()}-${messageCounter++}`,
  id: stored._id ?? null,
  deliveredTo: stored.deliveredTo ?? [],
  readBy: stored.readBy ?? [],
  sender,
  message,
  isOutgoing,
});

/** Stored history uses the same shape as live messages. */
const toChatMessages = (storedMessages, currentUserEmail) =>
  storedMessages.map((stored) =>
    createChatMessage(stored.sender, stored.message, stored.sender?.email === currentUserEmail, stored)
  );

const Project = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const [project, setProject] = useState(location.state?.project ?? null);
  const [loadError, setLoadError] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [fileTree, setFileTreeState] = useState({});
  const [openFiles, setOpenFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [unsavedFiles, setUnsavedFiles] = useState(() => new Set());
  // Incoming versions of files you are mid-edit in, held back until you choose.
  const [conflicts, setConflicts] = useState({});
  const [presence, setPresence] = useState([]);
  const [pathToDelete, setPathToDelete] = useState(null);
  const [isOutputOpen, setIsOutputOpen] = useState(false);

  // Socket handlers and debounce timers outlive the render that created
  // them, so they read the latest values from refs instead of stale state.
  const fileTreeRef = useRef({});
  const userRef = useRef(user);
  const saveTimersRef = useRef(new Map());
  const aiStartCommandRef = useRef(null);
  // The socket connects straight away so nothing sent in the first moments
  // is lost; messages that arrive before the stored history does are held
  // here and appended once it lands, keeping the order right.
  const isHistoryLoadedRef = useRef(false);
  const pendingMessagesRef = useRef([]);
  const unsavedFilesRef = useRef(unsavedFiles);
  // path -> fingerprint of the version last agreed with collaborators.
  const baselinesRef = useRef(new Map());

  const setBaseline = useCallback((path, content) => {
    baselinesRef.current.set(path, hashContent(content));
  }, []);

  /** Records every file in a tree as the agreed starting point. */
  const setBaselinesFromTree = useCallback((tree) => {
    baselinesRef.current = new Map(
      listFilePaths(tree).map((path) => [path, hashContent(getFileContent(tree, path) ?? "")])
    );
  }, []);

  useEffect(() => {
    unsavedFilesRef.current = unsavedFiles;
  }, [unsavedFiles]);

  /** Reports messages from others as received or seen, for their ticks. */
  const reportReceipts = useCallback((ids, status) => {
    const valid = ids.filter(Boolean);
    if (valid.length > 0) sendMessage("message-status", { ids: valid, status });
  }, []);

  const appendMessage = useCallback((chatMessage) => {
    if (!isHistoryLoadedRef.current) {
      pendingMessagesRef.current.push(chatMessage);
      return;
    }
    setMessages((prev) => [...prev, chatMessage]);
  }, []);

  /**
   * Updates matching messages wherever they are: a receipt can arrive while
   * a message is still queued waiting for the history to load, so patching
   * only the rendered list would lose it.
   */
  const patchMessages = useCallback((matches, patch) => {
    const apply = (list) => list.map((msg) => (matches(msg) ? { ...msg, ...patch(msg) } : msg));
    pendingMessagesRef.current = apply(pendingMessagesRef.current);
    setMessages(apply);
  }, []);

  const {
    status: runStatus,
    output: runOutput,
    previewUrl,
    setPreviewUrl,
    clearOutput,
    isPreparing,
    prepareDependencies,
    mountTree,
    writeFile,
    renamePath,
    deletePath,
    run,
    stop,
  } = useProjectRunner();

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const setFileTree = useCallback((tree) => {
    fileTreeRef.current = tree;
    setFileTreeState(tree);
  }, []);

  const persistFileTree = useCallback(
    (tree) =>
      axios
        .put("/projects/update-file-tree", { projectId, fileTree: tree })
        .catch((err) => console.error("Error saving file tree:", err)),
    [projectId]
  );

  /**
   * Sends a file to collaborators along with `baseHash`: the version this
   * edit started from. The receiver applies it only if that is still what
   * it has, so edits made from an older copy can't silently overwrite work.
   */
  const broadcastFileUpdate = useCallback((path, content) => {
    sendMessage("project-message", {
      message: JSON.stringify({
        fileUpdate: { path, content, baseHash: baselinesRef.current.get(path) },
      }),
      sender: userRef.current,
    });
    baselinesRef.current.set(path, hashContent(content));
  }, []);

  const markSaved = useCallback((path) => {
    setUnsavedFiles((prev) => {
      if (!prev.has(path)) return prev;
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }, []);

  const dismissConflict = useCallback((path) => {
    setConflicts((prev) => omitKey(prev, path));
  }, []);

  const saveFile = useCallback(
    (path) => {
      clearTimeout(saveTimersRef.current.get(path));
      saveTimersRef.current.delete(path);

      const content = getFileContent(fileTreeRef.current, path);
      if (content === undefined) return;

      writeFile(path, content);
      persistFileTree(fileTreeRef.current);
      broadcastFileUpdate(path, content);
      markSaved(path);
    },
    [writeFile, persistFileTree, broadcastFileUpdate, markSaved]
  );

  const flushPendingSaves = useCallback(() => {
    [...saveTimersRef.current.keys()].forEach(saveFile);
  }, [saveFile]);

  /**
   * Applies a rename or delete to everything that tracks file paths: open
   * tabs, the editor, pending saves, unsaved markers and sync baselines.
   * `to` is null for a delete. Also used for incoming changes, which is why
   * it doesn't broadcast or persist anything itself.
   */
  const applyPathChange = useCallback((from, to) => {
    const isInside = (path) => path === from || path.startsWith(`${from}/`);
    const moved = (path) => (to ? `${to}${path.slice(from.length)}` : null);

    // Stop pending saves for paths that no longer exist under that name.
    for (const [path, timer] of saveTimersRef.current) {
      if (!isInside(path)) continue;
      clearTimeout(timer);
      saveTimersRef.current.delete(path);
    }

    const remap = (collection, makeEntry) => {
      const next = new Map();
      for (const [path, value] of collection) {
        if (!isInside(path)) next.set(path, value);
        else if (to) next.set(moved(path), value);
      }
      return makeEntry(next);
    };

    baselinesRef.current = remap(baselinesRef.current, (next) => next);
    setUnsavedFiles((prev) => remap([...prev].map((path) => [path, true]), (next) => new Set(next.keys())));
    setConflicts((prev) =>
      Object.fromEntries(
        Object.entries(prev)
          .filter(([path]) => !isInside(path) || to)
          .map(([path, value]) => [isInside(path) ? moved(path) : path, value])
      )
    );
    setOpenFiles((prev) =>
      prev.flatMap((path) => (isInside(path) ? (to ? [moved(path)] : []) : [path]))
    );
    setCurrentFile((prev) => (prev && isInside(prev) ? moved(prev) : prev));
  }, []);

  const openFile = useCallback((path) => {
    setCurrentFile(path);
    setOpenFiles((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }, []);

  const loadProject = useCallback(async () => {
    const { data } = await axios.get(`/projects/all-project/${projectId}`);
    if (!data) throw new Error("Project not found");
    setProject(data);
    return data;
  }, [projectId]);

  // Load project details, its saved files, chat history and the user list.
  useEffect(() => {
    let cancelled = false;
    isHistoryLoadedRef.current = false;
    pendingMessagesRef.current = [];

    const applyHistory = (storedMessages = []) => {
      if (cancelled) return;
      isHistoryLoadedRef.current = true;
      setMessages([
        ...toChatMessages(storedMessages, userRef.current?.email),
        ...pendingMessagesRef.current,
      ]);
      pendingMessagesRef.current = [];
    };

    loadProject()
      .then((data) => {
        if (cancelled) return;
        const tree = data.fileTree ?? {};
        setFileTree(tree);
        setBaselinesFromTree(tree);
        // Put the files in the container up front and start installing
        // dependencies straight away, so Run doesn't have to wait for them.
        if (Object.keys(tree).length > 0) {
          mountTree(tree).then(() => prepareDependencies(tree));
        }
      })
      .catch((err) => !cancelled && setLoadError(getErrorMessage(err, "Could not load this project.")));

    axios
      .get(`/projects/${projectId}/messages`)
      .then((res) => applyHistory(res.data))
      .catch((err) => {
        console.error("Error fetching chat history:", err);
        applyHistory();
      });

    axios
      .get("/users/all")
      .then((res) => !cancelled && setAllUsers(res.data))
      .catch((err) => console.error("Error fetching users:", err));

    return () => {
      cancelled = true;
    };
  }, [loadProject, projectId, setFileTree, setBaselinesFromTree, mountTree, prepareDependencies]);

  // Save anything still waiting on its debounce when leaving the page.
  // Declared before the socket effect so it runs before the disconnect.
  const flushRef = useRef(flushPendingSaves);
  useEffect(() => {
    flushRef.current = flushPendingSaves;
  }, [flushPendingSaves]);
  useEffect(() => () => flushRef.current(), []);

  // Real-time chat, AI replies and file sync over the project's socket room.
  useEffect(() => {
    if (!projectId) return;
    initializeSocket(projectId);

    const applyAiFileTree = (tree, startCommand) => {
      saveTimersRef.current.forEach(clearTimeout);
      saveTimersRef.current.clear();
      setUnsavedFiles(new Set());

      setFileTree(tree);
      setBaselinesFromTree(tree);
      aiStartCommandRef.current = startCommand ?? null;
      persistFileTree(tree);
      mountTree(tree).then(() => prepareDependencies(tree));

      const paths = listFilePaths(tree);
      const available = new Set(paths);
      const entryFile = pickEntryFile(paths);
      setOpenFiles((prev) => {
        const stillOpen = prev.filter((path) => available.has(path));
        return stillOpen.length || !entryFile ? stillOpen : [entryFile];
      });
      setCurrentFile((prev) => (prev && available.has(prev) ? prev : entryFile));
    };

    const applyRemoteFileUpdate = ({ path, content, baseHash }, senderEmail) => {
      const localContent = getFileContent(fileTreeRef.current, path);
      const isNewFile = localContent === undefined;
      // Their edit builds on exactly what we have (or nothing changed, or it
      // came from an older client without a fingerprint): apply it.
      const buildsOnOurVersion =
        baseHash === undefined || baseHash === hashContent(localContent ?? "");

      if (!isNewFile && !buildsOnOurVersion && content !== localContent) {
        // Their copy diverged from ours - hold it back instead of wiping
        // out local work, and let the user choose (see ConflictBanner).
        setConflicts((prev) => ({ ...prev, [path]: { email: senderEmail, content } }));
        return;
      }

      setConflicts((prev) => (path in prev ? omitKey(prev, path) : prev));
      setBaseline(path, content);
      setFileTree(setFileContent(fileTreeRef.current, path, content));
      writeFile(path, content);
    };

    const applyRemoteFileOp = ({ type, from, to, path }) => {
      const tree =
        type === "rename"
          ? movePath(fileTreeRef.current, from, to)
          : removePath(fileTreeRef.current, path);
      if (tree === fileTreeRef.current) return;

      setFileTree(tree);
      applyPathChange(type === "rename" ? from : path, type === "rename" ? to : null);
      if (type === "rename") renamePath(from, to);
      else deletePath(path);
    };

    const handleProjectMessage = (data) => {
      const senderEmail = data.sender?.email;
      const isOwnMessage = senderEmail === userRef.current?.email;
      const payload = parseMessage(data.message);

      // File sync messages keep editors in step; they are not chat messages.
      if (payload.fileUpdate) {
        if (!isOwnMessage) applyRemoteFileUpdate(payload.fileUpdate, senderEmail);
        return;
      }

      // A collaborator renamed or deleted something.
      if (payload.fileOp) {
        if (!isOwnMessage) applyRemoteFileOp(payload.fileOp);
        return;
      }

      if (senderEmail === AI_SENDER_EMAIL) {
        setIsAiThinking(false);
        if (payload.fileTree) applyAiFileTree(payload.fileTree, payload.startCommand);
      } else if (typeof data.message === "string" && data.message.includes(AI_MENTION)) {
        setIsAiThinking(true);
      }

      if (!isOwnMessage) {
        appendMessage(createChatMessage(data.sender, data.message, false, { _id: data.id }));
        // Tell the sender it arrived, and that it was seen if this tab is
        // actually in front of the user.
        reportReceipts([data.id], document.visibilityState === "visible" ? "read" : "delivered");
      }
    };

    // Someone received or read messages: update the ticks on ours.
    const handleMessageStatus = ({ ids, status, email }) => {
      const updated = new Set(ids);
      patchMessages(
        (msg) => msg.id && updated.has(msg.id),
        (msg) => ({
          deliveredTo: [...new Set([...msg.deliveredTo, email])],
          // Reading implies delivery, matching how the server stores it.
          readBy: status === "read" ? [...new Set([...msg.readBy, email])] : msg.readBy,
        })
      );
    };

    const unsubscribe = receiveMessage("project-message", handleProjectMessage);
    const unsubscribePresence = receiveMessage("presence", setPresence);
    const unsubscribeStatus = receiveMessage("message-status", handleMessageStatus);
    return () => {
      unsubscribe();
      unsubscribePresence();
      unsubscribeStatus();
      disconnectSocket();
      setPresence([]);
    };
  }, [
    projectId,
    appendMessage,
    patchMessages,
    reportReceipts,
    applyPathChange,
    renamePath,
    deletePath,
    setFileTree,
    setBaseline,
    setBaselinesFromTree,
    persistFileTree,
    mountTree,
    prepareDependencies,
    writeFile,
  ]);

  const handleSendMessage = (text) => {
    const chatMessage = createChatMessage(user, text, true);
    appendMessage(chatMessage);

    // The server replies with the stored message's id, which turns the
    // "sending" clock into a sent tick.
    sendMessage("project-message", { message: text, sender: user }, (reply) => {
      if (!reply?.id) return;
      patchMessages((msg) => msg.key === chatMessage.key, () => ({ id: reply.id }));
    });
    if (text.includes(AI_MENTION)) setIsAiThinking(true);
  };

  const handleEditorChange = (content) => {
    if (!currentFile) return;
    const path = currentFile;

    setFileTree(setFileContent(fileTreeRef.current, path, content));
    setUnsavedFiles((prev) => (prev.has(path) ? prev : new Set(prev).add(path)));

    // One debounce timer per file, so switching files never cancels the
    // pending save of the file you just left.
    clearTimeout(saveTimersRef.current.get(path));
    saveTimersRef.current.set(
      path,
      setTimeout(() => saveFile(path), SAVE_DELAY_MS)
    );
  };

  /** Renames a file or folder; returns an error message, or null on success. */
  const handleRenamePath = (from, to) => {
    if (!to) return "Enter a name";
    if (to.endsWith("/")) return "Name can't end with /";
    if (from === to) return null;
    if (pathExists(fileTreeRef.current, to)) return "A file or folder with that name already exists";

    const tree = movePath(fileTreeRef.current, from, to);
    if (tree === fileTreeRef.current) return "Could not rename that item";

    setFileTree(tree);
    applyPathChange(from, to);
    persistFileTree(tree);
    renamePath(from, to);
    sendMessage("project-message", {
      message: JSON.stringify({ fileOp: { type: "rename", from, to } }),
      sender: userRef.current,
    });
    return null;
  };

  /** Deletes a file or folder, after the confirmation dialog. */
  const handleDeletePath = (path) => {
    const tree = removePath(fileTreeRef.current, path);
    if (tree === fileTreeRef.current) return;

    setFileTree(tree);
    applyPathChange(path, null);
    persistFileTree(tree);
    deletePath(path);
    sendMessage("project-message", {
      message: JSON.stringify({ fileOp: { type: "delete", path } }),
      sender: userRef.current,
    });
  };

  /** Takes the collaborator's held-back version, discarding your edits to it. */
  const acceptConflict = (path) => {
    const conflict = conflicts[path];
    if (!conflict) return;

    // Drop the pending save so your old text isn't broadcast afterwards.
    clearTimeout(saveTimersRef.current.get(path));
    saveTimersRef.current.delete(path);

    setBaseline(path, conflict.content);
    setFileTree(setFileContent(fileTreeRef.current, path, conflict.content));
    writeFile(path, conflict.content);
    markSaved(path);
    setConflicts((prev) => omitKey(prev, path));
  };

  /**
   * Keeps your version: their content becomes the agreed baseline, so your
   * next save is accepted by everyone instead of conflicting again.
   */
  const keepMine = (path) => {
    const conflict = conflicts[path];
    if (conflict) setBaseline(path, conflict.content);
    dismissConflict(path);
    saveFile(path);
  };

  const handleCloseFile = (path) => {
    const index = openFiles.indexOf(path);
    const remaining = openFiles.filter((file) => file !== path);
    setOpenFiles(remaining);
    if (path === currentFile) {
      setCurrentFile(remaining[Math.min(index, remaining.length - 1)] ?? null);
    }
  };

  /** Creates an empty file; returns an error message or null on success. */
  const handleCreateFile = (name) => {
    if (!name) return "Enter a file name";
    if (name.endsWith("/")) return "File name can't end with /";
    if (pathExists(fileTreeRef.current, name)) return "A file or folder with that name already exists";

    const tree = setFileContent(fileTreeRef.current, name, "");
    if (tree === fileTreeRef.current) return "That path conflicts with an existing file";

    setFileTree(tree);
    persistFileTree(tree);
    writeFile(name, "");
    broadcastFileUpdate(name, "");
    openFile(name);
    return null;
  };

  const handleRun = () => {
    flushPendingSaves();
    setIsOutputOpen(true);
    run(fileTreeRef.current, aiStartCommandRef.current);
  };

  const handleAddCollaborators = async (userIds) => {
    try {
      await axios.put("/projects/add-user", { projectId, users: userIds });
      // add-user returns unpopulated ids; reload to get collaborator emails.
      await loadProject();
    } catch (err) {
      throw new Error(getErrorMessage(err, "Could not add collaborators."));
    }
  };

  // Mark other people's messages as read while this tab is in front of the
  // user, so their ticks turn blue (and catch up after switching back).
  useEffect(() => {
    const markVisibleAsRead = () => {
      if (document.visibilityState !== "visible") return;
      const unread = messages
        .filter((msg) => !msg.isOutgoing && msg.id && !msg.readBy.includes(user?.email))
        .map((msg) => msg.id);
      reportReceipts(unread, "read");
    };

    markVisibleAsRead();
    document.addEventListener("visibilitychange", markVisibleAsRead);
    return () => document.removeEventListener("visibilitychange", markVisibleAsRead);
  }, [messages, user?.email, reportReceipts]);

  // Tell collaborators which file is open so they can see where you work.
  useEffect(() => {
    sendMessage("presence", { file: currentFile });
  }, [currentFile]);

  // Other people's open files, keyed by path, for the explorer markers.
  const viewersByFile = useMemo(() => {
    const byFile = new Map();
    for (const entry of presence) {
      if (!entry.file || entry.email === user?.email) continue;
      byFile.set(entry.file, [...(byFile.get(entry.file) ?? []), entry.email]);
    }
    return byFile;
  }, [presence, user?.email]);

  // Until the full project loads, users may still be plain ids (from Home).
  const members = useMemo(() => (project?.users ?? []).filter((member) => member?.email), [project]);
  const memberIds = useMemo(() => new Set(members.map((member) => member._id)), [members]);
  // Everyone your messages have to reach before they count as delivered/read.
  const recipientEmails = useMemo(
    () => members.map((member) => member.email).filter((email) => email !== user?.email),
    [members, user?.email]
  );
  const hasFiles = Object.keys(fileTree).length > 0;

  if (loadError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center">
        <i className="ri-error-warning-line text-4xl text-slate-400"></i>
        <p className="text-slate-600">{loadError}</p>
        <button onClick={() => navigate("/")} className="font-medium text-indigo-600 hover:underline">
          Back to projects
        </button>
      </div>
    );
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <section className="relative flex h-full w-[380px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-200 p-2 px-3 shadow-sm">
          <div className="flex min-w-0 items-center gap-1">
            <button
              onClick={() => navigate("/")}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title="Back to projects"
            >
              <i className="ri-arrow-left-line"></i>
            </button>
            <h1 className="truncate font-semibold text-slate-800">{project?.name || "Project"}</h1>
          </div>
          <button
            onClick={() => setIsSidePanelOpen(true)}
            className="flex items-center gap-1.5 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            title="Collaborators"
          >
            <i className="ri-group-fill"></i>
            {members.length > 0 && <span className="text-xs font-medium">{members.length}</span>}
          </button>
        </header>

        <ChatPanel
          messages={messages}
          recipientEmails={recipientEmails}
          onSend={handleSendMessage}
          onOpenFile={(path) => pathExists(fileTreeRef.current, path) && openFile(path)}
          isAiThinking={isAiThinking}
        />

        <CollaboratorsPanel
          isOpen={isSidePanelOpen}
          users={members}
          presence={presence}
          onClose={() => setIsSidePanelOpen(false)}
          onAddClick={() => setIsModalOpen(true)}
        />
      </section>

      <section className="flex h-full min-w-0 flex-grow">
        <FileExplorer
          fileTree={fileTree}
          currentFile={currentFile}
          unsavedFiles={unsavedFiles}
          viewersByFile={viewersByFile}
          onOpenFile={openFile}
          onCreateFile={handleCreateFile}
          onRenamePath={handleRenamePath}
          onDeletePath={setPathToDelete}
        />

        <div className="flex min-w-0 flex-grow flex-col">
          <CodeEditor
            openFiles={openFiles}
            currentFile={currentFile}
            content={currentFile ? getFileContent(fileTree, currentFile) ?? "" : ""}
            unsavedFiles={unsavedFiles}
            hasFiles={hasFiles}
            conflict={currentFile ? conflicts[currentFile] : undefined}
            onSelectFile={setCurrentFile}
            onCloseFile={handleCloseFile}
            onChange={handleEditorChange}
            onAcceptConflict={acceptConflict}
            onDismissConflict={keepMine}
            toolbar={
              <RunControls
                status={runStatus}
                isPreparing={isPreparing}
                disabled={!hasFiles}
                onRun={handleRun}
                onStop={stop}
              />
            }
          />
          <RunOutput
            lines={runOutput}
            isOpen={isOutputOpen}
            onToggle={() => setIsOutputOpen((open) => !open)}
            onClear={clearOutput}
          />
        </div>

        {previewUrl && (
          <PreviewPane url={previewUrl} onUrlChange={setPreviewUrl} onClose={() => setPreviewUrl(null)} />
        )}
      </section>

      <ConfirmDialog
        isOpen={Boolean(pathToDelete)}
        title={`Delete ${pathToDelete?.split("/").pop()}?`}
        message={
          pathToDelete && isDirectory(fileTree, pathToDelete)
            ? "This folder and everything in it will be deleted for all collaborators."
            : "This file will be deleted for all collaborators."
        }
        onConfirm={() => {
          handleDeletePath(pathToDelete);
          setPathToDelete(null);
        }}
        onCancel={() => setPathToDelete(null)}
      />

      <AddCollaboratorModal
        isOpen={isModalOpen}
        users={allUsers}
        memberIds={memberIds}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleAddCollaborators}
      />
    </main>
  );
};

export default Project;
