import React, { useState } from 'react';
import './FileUpload.css';

const FileUpload = ({ onFileUpload, uploadedFiles, onRemoveFile }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadLink, setDownloadLink] = useState(null);

  const handleFileChange = async (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('文件上传失败');
      }

      const data = await response.json();
      onFileUpload(file, data.content, fileType);

      // 如果两个文件都已上传，自动处理文档
      if (uploadedFiles.config && uploadedFiles.target) {
        await processDocuments();
      }
    } catch (error) {
      console.error('上传文件时出错:', error);
      alert('文件上传失败: ' + error.message);
    }
  };

  const processDocuments = async () => {
    if (!uploadedFiles.config || !uploadedFiles.target) return;

    setIsProcessing(true);
    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '请处理文档',
          configContent: uploadedFiles.config.content,
          targetContent: uploadedFiles.target.content,
          configFileName: uploadedFiles.config.name,
          targetFileName: uploadedFiles.target.name,
          saveResponse: true
        }),
      });

      if (!response.ok) {
        throw new Error('文档处理失败');
      }

      const data = await response.text();
      // 从响应中提取下载链接
      const downloadMatch = data.match(/下载链接: (\/api\/download\/[^\n]+)/);
      if (downloadMatch) {
        setDownloadLink(`http://localhost:3000${downloadMatch[1]}`);
      }
    } catch (error) {
      console.error('处理文档时出错:', error);
      alert('文档处理失败: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="file-upload-container">
      <button 
        className="file-upload-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '收起文件上传' : '展开文件上传'}
        <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </button>
      
      {isExpanded && (
        <div className="file-upload-content">
          <div className="file-upload-section">
            <h3>配置文件</h3>
            {uploadedFiles.config ? (
              <div className="file-info">
                <span>{uploadedFiles.config.name}</span>
                <button onClick={() => onRemoveFile('config')}>移除</button>
              </div>
            ) : (
              <input
                type="file"
                accept=".txt,.json,.doc,.docx"
                onChange={(e) => handleFileChange(e, 'config')}
              />
            )}
          </div>

          <div className="file-upload-section">
            <h3>目标文档</h3>
            {uploadedFiles.target ? (
              <div className="file-info">
                <span>{uploadedFiles.target.name}</span>
                <button onClick={() => onRemoveFile('target')}>移除</button>
              </div>
            ) : (
              <input
                type="file"
                accept=".txt,.json,.doc,.docx"
                onChange={(e) => handleFileChange(e, 'target')}
              />
            )}
          </div>

          {isProcessing && (
            <div className="processing-status">
              正在处理文档...
            </div>
          )}

          {downloadLink && (
            <div className="download-section">
              <a href={downloadLink} target="_blank" rel="noopener noreferrer">
                下载处理后的文档
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;