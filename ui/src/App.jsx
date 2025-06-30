/*
 * @Author: wei-destiny 1286780926@qq.com
 * @Date: 2025-06-02 19:32:45
 * @LastEditors: wei-destiny 1286780926@qq.com
 * @LastEditTime: 2025-06-13 22:08:11
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
  const [uploadedFiles, setUploadedFiles] = useState({ config: null, target: null });
  const [fileContents, setFileContents] = useState({ config: '', target: '' });
  const [collapsedThinks, setCollapsedThinks] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const messagesEndRef = useRef(null);

  // 加载聊天历史
  useEffect(() => {
    const savedSessionId = localStorage.getItem('chatSessionId');
    if (savedSessionId) {
      setSessionId(savedSessionId);
      fetchChatHistory(savedSessionId);
    }
  }, []);

  const fetchChatHistory = async (sid) => {
    try {
      const response = await fetch(`http://localhost:3000/chat/history/${sid}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.history);
      }
    } catch (error) {
      console.error('获取聊天历史失败:', error);
    }
  };

  const handleFileUpload = (file, content, fileType) => {
    try {
      setUploadedFiles(prev => ({ ...prev, [fileType]: file }));
      setFileContents(prev => ({ ...prev, [fileType]: content }));
      
      // 添加系统消息
      const systemMessage = {
        role: 'assistant',
        content: `${fileType === 'config' ? '配置文件' : '目标文档'} "${file.name}" 已上传成功。`,
      };
      setMessages(prevMessages => [...prevMessages, systemMessage]);
    } catch (error) {
      console.error('文件上传处理失败:', error);
      // 重置该文件类型的状态
      setUploadedFiles(prev => ({ ...prev, [fileType]: null }));
      setFileContents(prev => ({ ...prev, [fileType]: '' }));
      
      // 添加错误消息
      const errorMessage = {
        role: 'assistant',
        content: `文件 "${file.name}" 上传失败，请重试。`,
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    }
  };

  const handleRemoveFile = (fileType) => {
    setUploadedFiles(prev => ({ ...prev, [fileType]: null }));
    setFileContents(prev => ({ ...prev, [fileType]: '' }));
    
    // 添加系统消息
    const systemMessage = {
      role: 'assistant',
      content: `${fileType === 'config' ? '配置文件' : '目标文档'} 已移除。`,
    };
    setMessages(prevMessages => [...prevMessages, systemMessage]);
  };

  const handleSendMessage = async (content) => {
    if (!content.trim()) return;

    // 检查是否已上传两个文件
    if (!uploadedFiles.config || !uploadedFiles.target) {
      const errorMessage = {
        role: 'assistant',
        content: '请先上传配置文件和目标文档。',
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      return;
    }

    // 添加用户消息
    const userMessage = { role: 'user', content };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    // 设置加载状态
    setLoading(true);
    setDownloadUrl(null); // 重置下载链接

    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          configContent: fileContents.config,
          targetContent: fileContents.target,
          configFileName: uploadedFiles.config.name,
          targetFileName: uploadedFiles.target.name,
          saveResponse: true,
          sessionId: sessionId
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`服务器错误: ${errorData}`);
      }

      // 获取或更新会话ID
      const newSessionId = response.headers.get('X-Session-ID');
      if (newSessionId && newSessionId !== sessionId) {
        setSessionId(newSessionId);
        localStorage.setItem('chatSessionId', newSessionId);
      }

      const reader = response.body.getReader();
      let accumulatedContent = '';
      let downloadLink = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        accumulatedContent += text;
        
        // 检查是否包含下载链接
        const downloadMatch = text.match(/下载链接: (\/api\/download\/[^\n]+)/);
        if (downloadMatch) {
          downloadLink = `http://localhost:3000${downloadMatch[1]}`;
          setDownloadUrl(downloadLink);
        }
        
        // 更新消息显示
        const assistantMessage = {
          role: 'assistant',
          content: accumulatedContent,
        };
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            newMessages[newMessages.length - 1] = assistantMessage;
          } else {
            newMessages.push(assistantMessage);
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `错误: ${error.message}`,
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  const handleClearConversation = async () => {
    if (sessionId) {
      try {
        await fetch(`http://localhost:3000/chat/clear/${sessionId}`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('清除聊天历史失败:', error);
      }
    }
    setMessages([]);
    setIsThinking(false);
    setPendingThink('');
    setUploadedFiles({ config: null, target: null });
    setFileContents({ config: '', target: '' });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="app">
      <div className="chat-container">
        <div className="header">
          <h1>DeepSeek Chat</h1>
          <div className="header-buttons">
            {downloadUrl && (
              <button 
                className="download-button"
                onClick={handleDownload}
                title="下载修改后的文档"
              >
                下载文档
              </button>
            )}
            <ClearButton onClear={handleClearConversation} />
          </div>
        </div>
        
        <ChatMessages
          messages={messages}
          loading={loading} 
          isThinking={isThinking}
          pendingThink={pendingThink}
          messagesEndRef={messagesEndRef}
        />
        
        <div className="input-area">
          <FileUpload 
            onFileUpload={handleFileUpload}
            uploadedFiles={uploadedFiles}
            onRemoveFile={handleRemoveFile}
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