import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ChatMessages = ({ messages, loading, isThinking, pendingThink }) => {
  const [collapsedThinks, setCollapsedThinks] = useState({});
  const messagesEndRef = useRef(null);

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

  return (
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
                        <ReactMarkdown>
                          {think}
                        </ReactMarkdown>
                      </div>
                      <div className="message-content">
                        <ReactMarkdown
                          components={{
                            code({ node, inline, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  language={match[1]}
                                  PreTag="div"
                                  style={tomorrow}
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {rest}
                        </ReactMarkdown>
                      </div>
                    </>
                  ) : (
                    <div className="message-content">
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                language={match[1]}
                                PreTag="div"
                                style={tomorrow}
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  );
                })()}
              </>
            )}
            {message.role === "user" && (
              <div className="message-content">
                <ReactMarkdown>
                  {message.content}
                </ReactMarkdown>
              </div>
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
  );
};

export default ChatMessages;