/*
 * @Author: wei-destiny 1286780926@qq.com
 * @Date: 2025-06-02 19:32:45
 * @LastEditors: wei-destiny 1286780926@qq.com
 * @LastEditTime: 2025-06-09 15:47:25
 * @FilePath: \deepseek-web\server\server.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const express = require("express");
const cors = require("cors");
const { Ollama } = require("ollama");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // 上传文件将保存在uploads目录
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname) // 使用原始文件名
  }
});

const upload = multer({ storage: storage });

// 确保uploads目录存在
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const ollama = new Ollama();
const chatHistory = [];

app.post("/chat", async (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    const { message, fileContent, fileName } = req.body;
    
    // Ensure message exists
    if (!message || typeof message !== "string") {
        console.error("Received an empty or invalid message");
        return res.status(400).send("Invalid message");
    }

    // Prepare the message with file content if available
    let fullMessage = message;
    if (fileContent) {
        fullMessage = `文件 "${fileName}" 的内容：\n${fileContent}\n\n基于以上文件内容，请回答：${message}`;
    }

    // Append user message to history
    chatHistory.push({ role: "user", content: fullMessage });

    // Send full history to Deepseek R1
    const stream = await ollama.chat({ model: "deepseek-r1:7b", messages: chatHistory, stream: true });

    let botReply = "";

    for await (const chunk of stream) {
        botReply += chunk.message.content;
        res.write(chunk.message.content);
    }

    chatHistory.push({ role: "assistant", content: botReply });

    res.end();
});

// 处理模型配置文件上传
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    res.json({
      message: 'File uploaded successfully',
      filename: req.file.originalname
    });
  } catch (error) {
    res.status(500).send('Error uploading file: ' + error.message);
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
