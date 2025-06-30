import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './ChatMessages.css';

const ChatMessages = ({ messages, loading, isThinking, pendingThink, messagesEndRef }) => {
  const [collapsedThinks, setCollapsedThinks] = useState({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingThink]);

  const toggleThink = (index) => {
    setCollapsedThinks(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const extractThinkContent = (content) => {
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>([\s\S]*)/);
    if (thinkMatch) {
      return {
        think: thinkMatch[1].trim(),
        rest: thinkMatch[2].trim()
      };
    }
    return { think: null, rest: content };
  };

  const renderMessage = (message, index) => {
    if (message.role === 'user') {
      return (
        <div key={index} className="message user-message">
          <div className="message-content">{message.content}</div>
        </div>
      );
    } else if (message.role === 'system') {
      return (
        <div key={index} className="message system-message">
          <div className="message-content">{message.content}</div>
        </div>
      );
    } else if (message.role === 'assistant') {
      // 检查消息中是否包含文档修改相关的关键词
      const isDocumentModification = message.content.includes('文档已修改并保存为') || 
                                   message.content.includes('下载链接: /api/download/');
      
      // 检查消息中是否包含下载链接
      const downloadLinkMatch = message.content.match(/下载链接: (\/api\/download\/[^\n]+)/);
      const downloadUrl = downloadLinkMatch ? downloadLinkMatch[1] : null;
      
      // 移除下载链接信息，只显示实际内容
      const content = message.content.replace(/下载链接: \/api\/download\/[^\n]+\n\n/, '');
      
      return (
        <div key={index} className="message assistant-message">
          <div className="message-content">
            {content}
            {isDocumentModification && downloadUrl && (
              <div className="download-section">
                <a href={downloadUrl} className="download-button" target="_blank" rel="noopener noreferrer">
                  下载修改后的文档
                </a>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="messages-container">
      {messages.map((message, index) => renderMessage(message, index))}
      {isThinking && (
        <div className="message assistant-message thinking">
          <div className="message-content">
            <div className="thinking-indicator">
              <span>思考中</span>
              <div className="thinking-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </div>
            </div>
            {pendingThink && (
              <div className="pending-think">
                {pendingThink.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {loading && (
        <div className="message assistant-message">
          <div className="message-content">
            <div className="loading-indicator">
              <span>生成回答中</span>
              <div className="loading-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;