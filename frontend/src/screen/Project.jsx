import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "../config/axios";
import { disconnectSocket, initializeSocket, receiveMessage, sendMessage } from "../config/socket";
import { UserContext } from "../context/UserContext";
import useProjectRunner from "../hooks/useProjectRunner";
import ChatPanel from "../components/project/ChatPanel";
import CollaboratorsPanel from "../components/project/CollaboratorsPanel";
import AddCollaboratorModal from "../components/project/AddCollaboratorModal";
import FileExplorer from "../components/project/FileExplorer";
import CodeEditor from "../components/project/CodeEditor";
import { PreviewPane, RunControls, RunOutput } from "../components/project/RunPanel";
import { getFileContent, listFilePaths, pathExists, pickEntryFile, setFileContent } from "../utils/fileTree";
import { AI_SENDER_EMAIL, getErrorMessage, parseMessage } from "../utils/messages";

const SAVE_DELAY_MS = 1000;
const AI_MENTION = "@ai";

let messageCounter = 0;
const createChatMessage = (sender, message, isOutgoing) => ({
  // Date.now() alone collides when two messages arrive in the same ms.
  id: `${Date.now()}-${messageCounter++}`,
  sender,
  message,
  isOutgoing,
});

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
  const [isOutputOpen, setIsOutputOpen] = useState(false);

  // Socket handlers and debounce timers outlive the render that created
  // them, so they read the latest values from refs instead of stale state.
  const fileTreeRef = useRef({});
  const userRef = useRef(user);
  const saveTimersRef = useRef(new Map());
  const aiStartCommandRef = useRef(null);

  const {
    status: runStatus,
    output: runOutput,
    previewUrl,
    setPreviewUrl,
    clearOutput,
    mountTree,
    writeFile,
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

  const broadcastFileUpdate = useCallback((path, content) => {
    sendMessage("project-message", {
      message: JSON.stringify({ fileUpdate: { path, content } }),
      sender: userRef.current,
    });
  }, []);

  const markSaved = useCallback((path) => {
    setUnsavedFiles((prev) => {
      if (!prev.has(path)) return prev;
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
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

  // Load project details, its saved files and the user list.
  useEffect(() => {
    let cancelled = false;

    loadProject()
      .then((data) => !cancelled && setFileTree(data.fileTree ?? {}))
      .catch((err) => !cancelled && setLoadError(getErrorMessage(err, "Could not load this project.")));

    axios
      .get("/users/all")
      .then((res) => !cancelled && setAllUsers(res.data))
      .catch((err) => console.error("Error fetching users:", err));

    return () => {
      cancelled = true;
    };
  }, [loadProject, setFileTree]);

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
      aiStartCommandRef.current = startCommand ?? null;
      persistFileTree(tree);
      mountTree(tree);

      const paths = listFilePaths(tree);
      const available = new Set(paths);
      const entryFile = pickEntryFile(paths);
      setOpenFiles((prev) => {
        const stillOpen = prev.filter((path) => available.has(path));
        return stillOpen.length || !entryFile ? stillOpen : [entryFile];
      });
      setCurrentFile((prev) => (prev && available.has(prev) ? prev : entryFile));
    };

    const applyRemoteFileUpdate = ({ path, content }) => {
      setFileTree(setFileContent(fileTreeRef.current, path, content));
      writeFile(path, content);
    };

    const handleProjectMessage = (data) => {
      const senderEmail = data.sender?.email;
      const isOwnMessage = senderEmail === userRef.current?.email;
      const payload = parseMessage(data.message);

      // File sync messages keep editors in step; they are not chat messages.
      if (payload.fileUpdate) {
        if (!isOwnMessage) applyRemoteFileUpdate(payload.fileUpdate);
        return;
      }

      if (senderEmail === AI_SENDER_EMAIL) {
        setIsAiThinking(false);
        if (payload.fileTree) applyAiFileTree(payload.fileTree, payload.startCommand);
      } else if (typeof data.message === "string" && data.message.includes(AI_MENTION)) {
        setIsAiThinking(true);
      }

      if (!isOwnMessage) {
        setMessages((prev) => [...prev, createChatMessage(data.sender, data.message, false)]);
      }
    };

    const unsubscribe = receiveMessage("project-message", handleProjectMessage);
    return () => {
      unsubscribe();
      disconnectSocket();
    };
  }, [projectId, setFileTree, persistFileTree, mountTree, writeFile]);

  const handleSendMessage = (text) => {
    setMessages((prev) => [...prev, createChatMessage(user, text, true)]);
    sendMessage("project-message", { message: text, sender: user });
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

  // Until the full project loads, users may still be plain ids (from Home).
  const members = useMemo(() => (project?.users ?? []).filter((member) => member?.email), [project]);
  const memberIds = useMemo(() => new Set(members.map((member) => member._id)), [members]);
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
          onSend={handleSendMessage}
          onOpenFile={(path) => pathExists(fileTreeRef.current, path) && openFile(path)}
          isAiThinking={isAiThinking}
        />

        <CollaboratorsPanel
          isOpen={isSidePanelOpen}
          users={members}
          onClose={() => setIsSidePanelOpen(false)}
          onAddClick={() => setIsModalOpen(true)}
        />
      </section>

      <section className="flex h-full min-w-0 flex-grow">
        <FileExplorer
          fileTree={fileTree}
          currentFile={currentFile}
          unsavedFiles={unsavedFiles}
          onOpenFile={openFile}
          onCreateFile={handleCreateFile}
        />

        <div className="flex min-w-0 flex-grow flex-col">
          <CodeEditor
            openFiles={openFiles}
            currentFile={currentFile}
            content={currentFile ? getFileContent(fileTree, currentFile) ?? "" : ""}
            unsavedFiles={unsavedFiles}
            hasFiles={hasFiles}
            onSelectFile={setCurrentFile}
            onCloseFile={handleCloseFile}
            onChange={handleEditorChange}
            toolbar={
              <RunControls status={runStatus} disabled={!hasFiles} onRun={handleRun} onStop={stop} />
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
