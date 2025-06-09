/*
 * @Author: wei-destiny 1286780926@qq.com
 * @Date: 2025-06-02 19:32:45
 * @LastEditors: wei-destiny 1286780926@qq.com
 * @LastEditTime: 2025-06-09 17:59:51
 * @FilePath: \deepseek-web\ui\src\App.jsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { ChatMessages, MessageInput, ClearButton, FileUpload } from './components';

function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingThink, setPendingThink] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [collapsedThinks, setCollapsedThinks] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploadedFile(file);

    try {
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Add system message about successful upload
      const systemMessage = {
        role: 'assistant',
        content: `File uploaded successfully: ${file.name}`,
      };
      setMessages(prevMessages => [...prevMessages, systemMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: Failed to upload file ${file.name}`,
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      setUploadedFile(null);
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

  const handleSendMessage = async (content) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage = { role: 'user', content };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    // Set loading state
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      let accumulatedThink = '';
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Convert the array buffer to text
        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (!line) continue;
          
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'think') {
              setIsThinking(true);
              accumulatedThink += data.content;
              setPendingThink(accumulatedThink);
            } else if (data.type === 'content') {
              setIsThinking(false);
              setPendingThink('');
              accumulatedContent += data.content;
            }
          } catch (e) {
            console.error('Error parsing JSON:', e);
          }
        }
      }

      if (accumulatedThink && accumulatedContent) {
        const assistantMessage = {
          role: 'assistant',
          content: `<think>${accumulatedThink}</think>${accumulatedContent}`,
        };
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
      } else if (accumulatedContent) {
        const assistantMessage = {
          role: 'assistant',
          content: accumulatedContent,
        };
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Error: Failed to send message.',
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setLoading(false);
      setIsThinking(false);
      setPendingThink('');
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
  const handleClearConversation = () => {
    setMessages([]);
    setIsThinking(false);
    setPendingThink('');
    setUploadedFile(null);
  };
  return (
    <div className="app">
      <div className="chat-container">
        <div className="header">
          <h1>DeepSeek Chat</h1>
          <ClearButton onClear={handleClearConversation} />
        </div>
        
        <ChatMessages
          messages={messages}
          loading={loading} 
          isThinking={isThinking}
          pendingThink={pendingThink}
        />
        
        <div className="input-area">
          <FileUpload 
            onFileUpload={handleFileUpload}
            uploadedFile={uploadedFile}
            onRemoveFile={() => setUploadedFile(null)}
          />
          <MessageInput 
            onSendMessage={handleSendMessage} 
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}

export default App;