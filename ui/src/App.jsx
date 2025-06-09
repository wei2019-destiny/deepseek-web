import React, { useState, useEffect, useRef } from 'react';

const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML; 
};

const parseMessageText = (text) => {
  // Replace ``` with <pre> or </pre>
  let formattedText = text.split(/```/).map((part, index) => {
    if (index % 2 === 1) {
      return `<pre>${escapeHtml(part)}</pre>`;
    }
    return escapeHtml(part);
  }).join('');

  // Replace `text` with <code>escaped text</code>
  formattedText = formattedText.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);

  // Replace #### with <h4>
  formattedText = formattedText.replace(/#### (.*?)(\n|$)/g, "<h4>$1</h4>");
  
  // Replace ### with <h3>
  formattedText = formattedText.replace(/### (.*?)(\n|$)/g, "<h3>$1</h3>");
  
  // Replace ## with <h2>
  formattedText = formattedText.replace(/## (.*?)(\n|$)/g, "<h2>$1</h2>");
  
  // Replace **text** with <strong>text</strong>
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  return formattedText;
};

import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingThink, setPendingThink] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [collapsedThinks, setCollapsedThinks] = useState({});
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === "text/plain" || file.type === "application/json")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedFile({
          name: file.name,
          content: e.target.result
        });
      };
      reader.readAsText(file);
    } else {
      alert("请上传txt文件");
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
    setUploadStatus('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('请选择文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploadStatus('上传中...');
      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadStatus('文件上传成功：' + data.filename);
        setSelectedFile(null);
      } else {
        setUploadStatus('上传失败：' + await response.text());
      }
    } catch (error) {
      setUploadStatus('上传错误：' + error.message);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages((prevMessages) => {
      const newMessages = [...prevMessages, { content: input, role: "user" }];
      return newMessages;
    });

    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: input,
          fileContent: uploadedFile ? uploadedFile.content : null,
          fileName: uploadedFile ? uploadedFile.name : null
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botMessage = "";
      let currentThink = "";
      let isInThinkBlock = false;

      setMessages((prevMessages) => [...prevMessages, { content: "", role: "assistant" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const newContent = decoder.decode(value, { stream: true });
        
        // 检查思考块的开始和结束
        if (newContent.includes("<think>")) {
          isInThinkBlock = true;
          setIsThinking(true);
        }
        
        if (isInThinkBlock) {
          currentThink += newContent;
          if (newContent.includes("</think>")) {
            isInThinkBlock = false;
            setIsThinking(false);
            botMessage += currentThink;
            setPendingThink("");
          } else {
            setPendingThink(currentThink);
            continue;
          }
        } else {
          botMessage += newContent;
        }

        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1] = {
            content: botMessage,
            role: "assistant",
          };
          return updatedMessages;
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleThink = (messageId) => {
    setCollapsedThinks(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const extractThinkContent = (content) => {
    const thinkMatch = content.match(/<think>(.*?)<\/think>/s);
    if (!thinkMatch) return { think: null, rest: content };
    
    const think = thinkMatch[1].trim();
    const rest = content.replace(thinkMatch[0], '').trim();
    return { think, rest };
  };

  useEffect(() => {
    console.log("🚀 ~ useEffect ~ messages:", messages)
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>DeepSeek AI Assistant</h2>
        <p className="subtitle">Powered by Ollama + Deepseek R1</p>
      </div>
      
      <div className="messages-container">

            {messages.map((message, index) => (
              <div key={index} className={`message-wrapper ${message.role}`}>
                <div className="avatar">
                  {message.role === "user" ? "👤" : "🤖"}
                </div>
                <div className="message-bubble">
                  {message.role === "assistant" && (
                    <>
                      {(() => {
                        const { think, rest } = extractThinkContent(message.content);
                        return think ? (
                          <>
                            <button 
                              className={`toggle-think ${!collapsedThinks[index] ? 'expanded' : ''}`}
                              onClick={() => toggleThink(index)}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                              </svg>
                              思考过程
                            </button>
                            <div className={`message-think ${collapsedThinks[index] ? 'collapsed' : ''}`}>
                              {think}
                            </div>
                          </>
                        ) : null;
                      })()}
                      <div
                        className="message-content"
                        dangerouslySetInnerHTML={{ 
                          __html: parseMessageText(
                            extractThinkContent(message.content).rest
                          ) 
                        }}
                      />
                    </>
                  )}
                  {message.role === "user" && (
                    <div
                      className="message-content"
                      dangerouslySetInnerHTML={{ __html: parseMessageText(message.content) }}
                    />
                  )}
                </div>
              </div>
            ))}
        {(loading || isThinking) && (
          <div className="message-wrapper bot">
            <div className="avatar">🤖</div>
            <div className="message-bubble">
              {isThinking && pendingThink ? (
                <div className="thinking-content">
                  <div className="thinking-indicator">思考中...</div>
                  <div className="thinking-text">{pendingThink}</div>
                </div>
              ) : (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <div className="file-upload-container">
          <label htmlFor="file-upload" className="file-input-label">
            <span>📎 上传文件</span>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".txt,.json"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="file-input"
          />
          {uploadedFile && (
            <div className="uploaded-file">
              <span>📄 {uploadedFile.name}</span>
              <button onClick={removeFile} className="remove-file-btn" title="删除文件">×</button>
            </div>
          )}
        </div>
        <input
          type="text"
          className="message-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="输入消息..."
        />
        <button 
          onClick={sendMessage} 
          className="send-button"
          disabled={loading || !input.trim()}
        >
          发送
        </button>
      </div>
    </div>
  );
}

export default App;