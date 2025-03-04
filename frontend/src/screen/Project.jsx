import React, { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "../config/axios";
import { initializeSocket, receiveMessage, sendMessage } from "../config/socket";
import { UserContext } from "../context/UserContext";
import Markdown from 'markdown-to-jsx';
import Prism from 'prismjs';

// Essential Prism imports
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';

export const Project = () => {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(new Set());
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const { user } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const location = useLocation();
  const [project, setProject] = useState(location.state.project);
  const messageBoxRef = React.createRef();
  const [fileTree, setFileTree] = useState({
    "app.js": {
      content: `import express from 'express'`
    },
    "package.json": {
      content: `{
        "name": "my-express-app",
      }`
    }
  });


  const writeAiMessage = (message) => {

    const messageObjet = JSON.parse(message);

    return (
      <div
        className="text-sm overflow-auto bg-gray-900 text-white p-3 rounded-lg shadow-md"
      >
        <PrismStyles />
        {renderMarkdownWithPrism(messageObjet.text)}
      </div>
    )

  }

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
    axios
      .put("/projects/add-user", {
        projectId: location.state.project._id,
        users: Array.from(selectedUserId),
      })
      .then((res) => {
        console.log(res.data);
        setIsModalOpen(false);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const scrollToBottom = () => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Auto-scroll when messages change
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    // Add outgoing message to state
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

  useEffect(() => {
    initializeSocket(project._id);

    receiveMessage("project-message", (data) => {
      console.log(data);

      // Only add the message if it's not from the current user
      if (data.sender.email !== user.email) {
        const newMessage = {
          id: Date.now().toString(),
          sender: data.sender,
          message: data.message,
          isOutgoing: false
        };

        setMessages(prevMessages => [...prevMessages, newMessage]);
      }
    });

    axios.get(`/projects/all-project/${project._id}`)
      .then((res) => {
        console.log(res.data);
        setProject(res.data);
      });

    axios.get("/users/all")
      .then((res) => {
        setUsers(res.data);
      })
      .catch((err) => {
        console.log("Error Response:", err.response);
        console.log("Error Data:", err.response?.data);
        console.log("Error Status:", err.response?.status);
      });
  }, []);

  useEffect(() => {
    // Delay to ensure Markdown is rendered
    const timer = setTimeout(() => {
      Prism.highlightAll();
    }, 100);

    return () => clearTimeout(timer);
  }, [messages]);

  const renderMarkdownWithPrism = (content) => {
    return (
      <Markdown
        options={{
          overrides: {
            code: {
              component: ({ children, className, ...props }) => {
                // Determine language, default to javascript if not specified
                const language = className
                  ? className.replace('language-', '').trim()
                  : 'javascript';

                return (
                  <div className="relative my-2">
                    <pre
                      className={`language-${language} rounded-lg overflow-hidden shadow-md bg-gray-900 text-gray-100 p-4 pt-8`}
                    >
                      <div
                        className="absolute top-2 right-2 bg-gray-800 text-gray-400 px-2 py-1 rounded text-xs uppercase tracking-wider"
                      >
                        {language}
                      </div>
                      <code
                        className={`language-${language} text-sm`}
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

  // Custom Prism token styles
  const PrismStyles = () => (
    <style jsx global>{`
      /* Prism Token Styles */
      .token.comment { @apply text-gray-500 italic; }
      .token.keyword { @apply text-pink-400 font-bold; }
      .token.string { @apply text-yellow-300; }
      .token.function { @apply text-green-400; }
      .token.number { @apply text-purple-400; }
      .token.operator { @apply text-blue-300; }
      .token.punctuation { @apply text-gray-300; }
    `}</style>
  );

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
                {msg.sender.email === "SOEN" ?
                  writeAiMessage(msg.message)
                  : (
                    <p className="text-sm">{msg.message}</p>
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
            )
            )}
          </div>
        </div>
      </section>

      <section className="right bg-red-50 flex-grow h-full flex">

        <div className="explorer h-full max-w-64 min-w-52 bg-slate-300">
          <div className="file-tree w-full">
            <div className="tree-element p-2 px-4 flex items-center gap-2 bg-slate-200 w-full">
              <p className="cursor-pointer font-semibold text-lg">app.js</p>
            </div>
          </div>
        </div>


        <div className="code-editor"></div>


      </section>

      {/* Add the modal outside the section */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity ${isModalOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        onClick={() => setIsModalOpen(false)}
      >
        <div
          className="bg-white rounded-lg w-full max-h-150 overflow-auto  max-w-md mx-4 flex flex-col transition-all duration-300 ease-in-out"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex justify-between items-center p-4 border-b shrink-0">
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