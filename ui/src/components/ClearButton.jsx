import React from 'react';

const ClearButton = ({ onClear }) => {
  const handleClick = () => {
    if (window.confirm('确定要清空所有对话吗？')) {
      onClear();
    }
  };

  return (
    <button 
      className="clear-conversation-button" 
      onClick={handleClick}
      title="清空对话"
    >
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
      清空对话
    </button>
  );
};

export default ClearButton;