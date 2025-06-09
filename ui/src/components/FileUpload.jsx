import React, { useState } from 'react';

const FileUpload = ({ onFileUpload, uploadedFile, onRemoveFile }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "text/plain" || file.type === "application/json")) {
      await onFileUpload(file);
    } else {
      alert("请上传.txt或.json文件");
    }
  };

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "text/plain" || file.type === "application/json")) {
      await onFileUpload(file);
    } else {
      alert("请上传.txt或.json文件");
    }
  };

  return (
    <div 
      className={`file-upload-area ${dragActive ? "drag-active" : ""}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        accept=".txt,.json"
        onChange={handleChange}
        className="file-input"
        style={{ display: 'none' }}
      />
      <label className="upload-label" htmlFor="file-upload">
        <div>
          {uploadedFile ? (
            <div className="uploaded-file">
              <span>📄 {uploadedFile.name}</span>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  onRemoveFile();
                }}
                className="remove-file-btn" 
                title="删除文件"
              >
                ×
              </button>
            </div>
          ) : (
            <div>拖拽文件到此处或点击上传</div>
          )}
        </div>
      </label>
    </div>
  );
};

export default FileUpload;