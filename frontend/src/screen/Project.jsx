import React, { useContext, useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import axios from "../config/axios";
import { initializeSocket, receiveMessage, sendMessage } from "../config/socket";
import { UserContext } from "../context/UserContext";
import Markdown from 'markdown-to-jsx';
import hljs from 'highlight.js';
import { getWebContainer } from "../config/webContainer";

// Essential Highlight.js imports
import 'highlight.js/styles/github-dark.css';
import 'highlight.js/lib/languages/javascript';
import 'highlight.js/lib/languages/python';
import 'highlight.js/lib/languages/typescript';
import 'highlight.js/lib/languages/rust';
import 'highlight.js/lib/languages/go';
import 'highlight.js/lib/languages/kotlin';
import 'highlight.js/lib/languages/swift';

export const Project = () => {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(new Set());
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const { user } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const location = useLocation();
  const [project, setProject] = useState(location.state?.project);
  const messageBoxRef = React.useRef(null);
  const [fileTree, setFileTree] = useState({});
  const [currentFile, setCurrentFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);
  const [fileContents, setFileContents] = useState({});
  const [webContainer, setWebContainer] = useState(null);
  const [iframeUrl, setIframeUrl] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState({});
  const [runProcess, setRunProcess] = useState(null);
  // For tracking debounced saves
  const saveTimeoutRef = React.useRef(null);

  const writeAiMessage = (message) => {
    try {
      const messageObject = JSON.parse(message);
      return (
        <div className="text-sm overflow-auto bg-gray-900 text-white p-3 rounded-lg shadow-md">
          {renderMarkdownWithHighlight(messageObject.text)}
        </div>
      );
    } catch (error) {
      console.error("Error parsing AI message:", error);
      return <div>Invalid message format</div>;
    }
  };

  const renderMarkdownWithHighlight = (content) => {
    return (
      <Markdown
        options={{
          overrides: {
            code: {
              component: ({ children, className, ...props }) => {
                const language = className
                  ? className.replace('language-', '').trim()
                  : 'plaintext';

                const codeRef = React.useRef(null);

                React.useEffect(() => {
                  if (codeRef.current) {
                    hljs.highlightElement(codeRef.current);
                  }
                }, [children, language]);

                return (
                  <div className="relative my-2">
                    <pre
                      className={`hljs language-${language} rounded-lg overflow-hidden shadow-md bg-gray-900 text-gray-100 p-4 pt-8`}
                    >
                      <div
                        className="absolute top-2 right-2 bg-gray-800 text-gray-400 px-2 py-1 rounded text-xs uppercase tracking-wider"
                      >
                        {language}
                      </div>
                      <code
                        ref={codeRef}
                        className={`language-${language} hljs text-sm`}
                      >
                        {children}
                      </code>
                    </pre>
                  </div>
                );
              }
            }
          }
        }}
      >
        {content}
      </Markdown>
    );
  };

  const renderFileTree = useCallback((tree, parentPath = '') => {
    if (!tree) return null;

    return Object.entries(tree).map(([name, content]) => {
      // Check if it's a directory
      if (content.directory) {
        return (
          <div key={name}>
            <p className="font-bold pl-2">{name}/</p>
            {renderFileTree(content.directory, `${parentPath}${name}/`)}
          </div>
        );
      }
      // Check if it's a file
      else if (content.file) {
        return (
          <button
            key={`${parentPath}${name}`}
            onClick={() => {
              const fullPath = `${parentPath}${name}`;
              setCurrentFile(fullPath);
              setOpenFiles(prevFiles => [...new Set([...prevFiles, fullPath])]);

              // Store file contents if not already stored
              if (!fileContents[fullPath]) {
                setFileContents(prev => ({
                  ...prev,
                  [fullPath]: content.file.contents || 'No content available'
                }));
              }
            }}
            className={`tree-element cursor-pointer p-2 px-4 flex items-center gap-2 bg-slate-200 w-full hover:bg-slate-300 ${hasUnsavedChanges[`${parentPath}${name}`] ? 'border-l-4 border-yellow-500' : ''
              }`}
          >
            <p className="font-semibold text-lg">{name}</p>
            {hasUnsavedChanges[`${parentPath}${name}`] && (
              <span className="text-xs bg-yellow-500 text-white px-1 rounded ml-auto">•</span>
            )}
          </button>
        );
      }
      return null;
    });
  }, [fileContents, hasUnsavedChanges]);

  const renderFileContents = (contents) => {
    return (
      <textarea
        value={contents}
        onChange={handleFileContentChange}
        className="w-full h-full p-2 bg-[#1E1E1E] text-white outline-none font-mono resize-none"
        style={{
          lineHeight: "1.5",
          tabSize: 2
        }}
      />
    );
  };

  // Handle file content changes with debounced save
  const handleFileContentChange = (e) => {
    if (!currentFile) return;
    
    const newContent = e.target.value;
    
    // Update the file contents in state immediately
    setFileContents(prev => ({
      ...prev,
      [currentFile]: newContent
    }));
    
    // Mark file as having unsaved changes
    setHasUnsavedChanges(prev => ({
      ...prev,
      [currentFile]: true
    }));
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      saveFileContent(currentFile, newContent);
    }, 1000);
  };

  function saveFileTree(fileTree){
    if (!project?._id) {
      console.error("No project selected");
      return;
    }

    axios
      .put("/projects/update-file-tree", {
        projectId: project._id,
        fileTree: fileTree,
      })
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.error("Error saving file tree:", err);
      });
  }

  // Save file content to WebContainer and broadcast to other users
  const saveFileContent = async (filePath, content) => {
    console.log(`Saving file ${filePath}...`);
    
    try {
      if (!webContainer) {
        console.error("WebContainer not available for saving");
        return;
      }
      
      // Directly write to the WebContainer filesystem
      await webContainer.fs.writeFile(filePath, content);
      console.log(`File ${filePath} saved successfully to WebContainer`);
      
      // Also update the file in our fileTree representation
      const updateFileInTree = (tree, path) => {
        const pathParts = path.split('/');
        const fileName = pathParts.pop();
        let currentNode = tree;
        
        // Navigate to the correct directory
        for (let i = 0; i < pathParts.length; i++) {
          const part = pathParts[i];
          if (part && currentNode[part] && currentNode[part].directory) {
            currentNode = currentNode[part].directory;
          } else {
            return false; // Path doesn't exist
          }
        }
        
        // Update the file content
        if (currentNode[fileName] && currentNode[fileName].file) {
          currentNode[fileName].file.contents = content;
          return true;
        }
        
        return false;
      };
      
      // Try to update the file in our file tree
      const fileTreeCopy = JSON.parse(JSON.stringify(fileTree));
      if (updateFileInTree(fileTreeCopy, filePath)) {
        setFileTree(fileTreeCopy);
        // Save updated file tree to database
        saveFileTree(fileTreeCopy);
      }
      
      // Remove unsaved changes indicator
      setHasUnsavedChanges(prev => {
        const newState = { ...prev };
        delete newState[filePath];
        return newState;
      });
      
      // Broadcast change to other collaborators
      sendMessage("project-message", {
        message: JSON.stringify({
          fileUpdate: {
            path: filePath,
            content: content
          }
        }),
        sender: user
      });
    } catch (err) {
      console.error(`Error saving file ${filePath}:`, err);
    }
  };

  const handleUserSelect = (userId) => {
    const newSelectedUserId = new Set(selectedUserId);
    if (newSelectedUserId.has(userId)) {
      newSelectedUserId.delete(userId);
    } else {
      newSelectedUserId.add(userId);
    }
    setSelectedUserId(newSelectedUserId);
  };

  const handleConfirm = () => {
    if (!project?._id) {
      console.error("No project selected");
      return;
    }

    axios
      .put("/projects/add-user", {
        projectId: project._id,
        users: Array.from(selectedUserId),
      })
      .then((res) => {
        console.log(res.data);
        setIsModalOpen(false);
      })
      .catch((err) => {
        console.error("Error adding users:", err);
      });
  };

  const scrollToBottom = useCallback(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: user,
      message: message,
      isOutgoing: true
    };

    setMessages(prevMessages => [...prevMessages, newMessage]);

    sendMessage("project-message", {
      message,
      sender: user
    });

    setMessage("");
  };

  // Save all unsaved changes
  const saveAllUnsavedChanges = async () => {
    console.log("Saving all unsaved changes...");
    const promises = [];
    
    for (const filePath of Object.keys(hasUnsavedChanges)) {
      if (hasUnsavedChanges[filePath] && fileContents[filePath]) {
        console.log(`Saving ${filePath} before running...`);
        promises.push(webContainer.fs.writeFile(filePath, fileContents[filePath]));
      }
    }
    
    if (promises.length > 0) {
      try {
        await Promise.all(promises);
        console.log("All files saved successfully");
        setHasUnsavedChanges({});
        
        // After saving all changes, also update the fileTree and save to database
        saveFileTree(fileTree);
      } catch (err) {
        console.error("Error saving files:", err);
      }
    }
  };

  useEffect(() => {
    if (!project?._id) {
      console.error("No project selected");
      return;
    }

    initializeSocket(project._id);

    const setupWebContainer = async () => {
      if (!webContainer) {
        try {
          const container = await getWebContainer();
          setWebContainer(container);
          console.log("Web Container started successfully");
        } catch (err) {
          console.error("Failed to initialize WebContainer:", err);
        }
      }
    };
    
    setupWebContainer();

    const handleProjectMessage = (data) => {
      try {
        const message = typeof data.message === 'object' ?
          data.message :
          // If it's a string, try to parse it as JSON, but handle the case where it's just plain text
          (() => {
            try {
              return JSON.parse(data.message);
            } catch (parseError) {
              // If parsing fails, it's a plain text message, not JSON
              return { text: data.message };
            }
          })();
        console.log("Received message:", message);

        if (message.fileTree) {
          console.log("File Tree:", message.fileTree);
          setFileTree(message.fileTree);
          
          // Save the file tree to database when we receive it
          saveFileTree(message.fileTree);

          webContainer?.mount(message.fileTree).then(() => {
            console.log("File tree mounted to WebContainer");
          }).catch(err => {
            console.error("Error mounting file tree:", err);
          });

          // Preload file contents when file tree is received
          const extractFileContents = (tree, basePath = '') => {
            Object.entries(tree).forEach(([name, content]) => {
              if (content.directory) {
                extractFileContents(content.directory, `${basePath}${name}/`);
              } else if (content.file) {
                const fullPath = `${basePath}${name}`;
                setFileContents(prev => ({
                  ...prev,
                  [fullPath]: content.file.contents || 'No content available'
                }));
              }
            });
          };

          extractFileContents(message.fileTree);
        }

        // Handle file updates from collaborators
        if (message.fileUpdate && data.sender.email !== user.email) {
          const { path, content } = message.fileUpdate;
          console.log(`Received file update for ${path} from ${data.sender.email}`);

          // Update local file contents
          setFileContents(prev => ({
            ...prev,
            [path]: content
          }));

          // Update the WebContainer if available
          if (webContainer) {
            webContainer.fs.writeFile(path, content)
              .then(() => {
                console.log(`Updated file ${path} from collaborator`);
                
                // Update fileTree with the new content
                const fileTreeCopy = JSON.parse(JSON.stringify(fileTree));
                const updateFileInTree = (tree, filePath) => {
                  const pathParts = filePath.split('/');
                  const fileName = pathParts.pop();
                  let currentNode = tree;
                  
                  for (let i = 0; i < pathParts.length; i++) {
                    const part = pathParts[i];
                    if (part && currentNode[part] && currentNode[part].directory) {
                      currentNode = currentNode[part].directory;
                    } else {
                      return false;
                    }
                  }
                  
                  if (currentNode[fileName] && currentNode[fileName].file) {
                    currentNode[fileName].file.contents = content;
                    return true;
                  }
                  
                  return false;
                };
                
                if (updateFileInTree(fileTreeCopy, path)) {
                  setFileTree(fileTreeCopy);
                  // Save updated file tree to database
                  saveFileTree(fileTreeCopy);
                }
              })
              .catch(err => console.error(`Error updating file ${path}:`, err));
          }
        }

        if (data.sender.email !== user.email) {
          const newMessage = {
            id: Date.now().toString(),
            sender: data.sender,
            message: data.message,
            isOutgoing: false
          };

          setMessages(prevMessages => [...prevMessages, newMessage]);
          console.log("Message added to chat:", newMessage);
        }
      } catch (error) {
        console.error("Error processing project message:", error);
        if (data.sender && data.sender.email !== user.email) {
          const newMessage = {
            id: Date.now().toString(),
            sender: data.sender,
            message: data.message, // Keep the original message even if it's not JSON
            isOutgoing: false
          };

          setMessages(prevMessages => [...prevMessages, newMessage]);
        }
      }
    };

    receiveMessage("project-message", handleProjectMessage);

    const fetchProjectDetails = async () => {
      try {
        const res = await axios.get(`/projects/all-project/${project._id}`);
        setProject(res.data);
        setFileTree(res.data.fileTree);
      } catch (error) {
        console.error("Error fetching project details:", error);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await axios.get("/users/all");
        setUsers(res.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchProjectDetails();
    fetchUsers();

    return () => {
      // Clean up timeout on unmount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [project?._id, user.email]);

  return (
    <main className="h-screen w-screen flex overflow-hidden">
      <section className="left relative flex flex-col h-full min-w-96 bg-teal-200">
        <header className="flex justify-end p-2 px-4 w-full bg-slate-200">
          <button
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className="p-2"
          >
            <i className="ri-group-fill"></i>
          </button>
        </header>

        <div className="conversation-area flex-grow flex flex-col h-full overflow-hidden">
          <div
            ref={messageBoxRef}
            className="message-box flex-grow flex flex-col gap-2 p-1 h-full"
            style={{
              maxHeight: "calc(100vh - 100px)",
              overflowY: "auto",
              scrollBehavior: "smooth",
              scrollbarWidth: "none", /* Firefox */
              msOverflowStyle: "none", /* IE and Edge */
              WebkitOverflowScrolling: "touch"
            }}>
            <style>
              {`
                .message-box::-webkit-scrollbar {
                  display: none; /* Safari and Chrome */
                }
              `}
            </style>

            {/* Map through messages state to render each message */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message max-w-80 flex flex-col p-2 bg-slate-100 w-fit rounded-md ${msg.isOutgoing ? "ml-auto" : ""
                  }`}
              >
                <small className="opacity-65 text-sm">{msg.sender.email}</small>
                {msg.sender.email === "SOEN" ? (
                  writeAiMessage(msg.message)
                ) : (
                  <p className="text-sm">{typeof msg.message === 'object' ?
                    JSON.stringify(msg.message) :
                    msg.message}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="input-field w-full flex bg-amber-200 mt-auto">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              type="text"
              placeholder="Enter Message"
              className="p-2 px-5 border-none flex-grow outline-none"
            />
            <button onClick={handleSendMessage} className="px-7 bg-slate-900 text-white">
              <i className="ri-send-plane-fill"></i>
            </button>
          </div>
        </div>

        <div
          className={`side-panel flex flex-col gap-2 w-full h-full bg-amber-300 absolute z-10 transition-all ${isSidePanelOpen ? "translate-x-0" : "-translate-x-full"
            } top-0`}
        >
          <header className="flex justify-between items-center p-2 px-3 bg-teal-200">
            <button
              onClick={() => setIsModalOpen(!isModalOpen)}
              className="flex gap-2"
            >
              <i className="ri-add-fill mr-1"></i>
              <p>Add Collaborator</p>
            </button>

            <button
              onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
              className="p-2"
            >
              <i className="ri-close-fill"></i>
            </button>
          </header>

          <div className="users flex flex-col gap-2 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            <style>
              {`
                .users::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>
            {project?.users?.map((user) => (
              <div
                key={user._id}
                className="user cursor-pointer p-2 hover:bg-amber-100 flex gap-2 items-center"
              >
                {" "}
                <div className="aspect-square p-5 rounded-full w-fit h-fit flex items-center justify-center text-white bg-slate-700">
                  <i className="ri-user-fill absolute"></i>
                </div>
                <h1 className="font-semibold text-lg">{user?.email}</h1>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="right bg-red-50 flex-grow h-full flex">
        <div className="explorer h-full max-w-64 min-w-52 bg-slate-300 overflow-y-auto">
          <div className="file-tree w-full">
            {renderFileTree(fileTree)}
          </div>
        </div>

        {currentFile && (
          <div className="code-editor flex flex-col flex-grow h-full">
            <div className="top flex justify-between w-full">
              <div className="files flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                <style>
                  {`
                    .files::-webkit-scrollbar {
                      display: none;
                    }
                  `}
                </style>
                {openFiles.map((fileName) => (
                  <div
                    key={fileName}
                    onClick={() => setCurrentFile(fileName)}
                    className={`tab p-2 px-4 min-w-fit flex items-center gap-2 bg-slate-200 cursor-pointer ${currentFile === fileName ? "bg-slate-300" : ""
                      } ${hasUnsavedChanges[fileName] ? "border-t-2 border-yellow-500" : ""}`}
                  >
                    <p className="font-semibold text-lg">{fileName.split('/').pop()}</p>
                    {hasUnsavedChanges[fileName] && (
                      <span className="text-xs bg-yellow-500 text-white px-1 rounded">•</span>
                    )}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFiles(openFiles.filter((file) => file !== fileName));
                        if (fileName === currentFile) {
                          setCurrentFile(openFiles.find(f => f !== fileName) || null);
                        }
                      }}
                      className="cursor-pointer hover:bg-slate-400 rounded-full p-1"
                    >
                      <i className="ri-close-fill"></i>
                    </span>
                  </div>
                ))}
              </div>

              <div className="actions flex gap-2">
                <button
                  onClick={async () => {
                    // Force save any currently unsaved changes
                    await saveAllUnsavedChanges();
                    
                    // Also save any current file that might be in process of editing
                    if (currentFile && saveTimeoutRef.current) {
                      clearTimeout(saveTimeoutRef.current);
                      saveTimeoutRef.current = null;
                      await saveFileContent(currentFile, fileContents[currentFile]);
                    }
                    
                    // Save the current file tree to database before running
                    saveFileTree(fileTree);
                    
                    // Make sure we have the latest version mounted
                    try {
                      console.log("Running project...");
                      
                      // Kill previous process if it exists
                      if (runProcess) {
                        runProcess.kill();
                      }

                      await webContainer.mount(fileTree);
                      
                      // Install dependencies
                      console.log("Installing dependencies...");
                      const installProcess = await webContainer.spawn('npm', ['install']);
                      installProcess.output.pipeTo(new WritableStream({
                        write(chunk) {
                          console.log('npm install output:', chunk);
                        }
                      }));
                      
                      // Wait for install to complete
                      const installExitCode = await installProcess.exit;
                      console.log(`Install completed with code ${installExitCode}`);
                      
                      // Run the project
                      console.log("Starting project...");
                      let tempRunProcess = await webContainer.spawn('npm', ['start']);
                      tempRunProcess.output.pipeTo(new WritableStream({
                        write(chunk) {
                          console.log('npm start output:', chunk);
                        }
                      }));
                      
                      setRunProcess(tempRunProcess);
                      
                      webContainer.on('server-ready', (port, url) => {
                        console.log('Server is ready at:', url);
                        console.log('Port:', port);
                        setIframeUrl(url);
                      });
                    } catch (err) {
                      console.error("Error running project:", err);
                    }
                  }}
                  className="p-2 px-4 bg-slate-600 text-white hover:bg-slate-700 transition-colors rounded font-medium flex items-center gap-1"
                >
                  <i className="ri-play-fill"></i> Run
                </button>
              </div>
            </div>

            <div className="bottom h-full">
              {currentFile && renderFileContents(fileContents[currentFile] || '')}
            </div>
          </div>
        )}

        {iframeUrl && webContainer &&
          <div className="flex min-w-100 flex-col h-full">
            <div className="address-bar">
              <input
                onChange={(e) => setIframeUrl(e.target.value)}
                type="text" value={iframeUrl}
                className="w-full p-2 px-4 bg-slate-200" />
            </div>
            <iframe
              src={iframeUrl}
              className="w-full h-full"
              title="Web Container Output"
            ></iframe>
          </div>
        }
      </section>

      {/* Modal for adding collaborators */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity ${isModalOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
        onClick={() => setIsModalOpen(false)}
      >
        <div
          className="bg-white rounded-lg w-full max-h-150 overflow-auto max-w-md mx-4 flex flex-col transition-all duration-300 ease-in-out"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            className="flex justify-between items-center p-4 border-b shrink-0">
            <h2 className="text-xl font-semibold">Select User</h2>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <i className="ri-close-fill text-xl"></i>
            </button>
          </div>

          {/* Users List - Scrollable Container */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex flex-col gap-3">
                {users &&
                  users.map((user) => (
                    <div
                      key={user._id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedUserId.has(user._id)
                        ? "bg-blue-50 border border-blue-200"
                        : ""
                        }`}
                      onClick={() => handleUserSelect(user._id)}
                    >
                      <div className="aspect-square w-12 h-12 rounded-full flex items-center justify-center text-white bg-slate-700">
                        <i className="ri-user-fill text-xl"></i>
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-semibold">{user.email}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Modal Footer - Fixed at bottom */}
          <div className="border-t p-4 flex justify-end gap-2 shrink-0 bg-white">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Project;