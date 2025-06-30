/*
 * @Author: wei-destiny 1286780926@qq.com
 * @Date: 2025-06-02 19:32:45
 * @LastEditors: wei-destiny 1286780926@qq.com
 * @LastEditTime: 2025-06-13 23:20:17
 * @FilePath: \deepseek-web\server\server.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const express = require("express");
const cors = require("cors");
const { Ollama } = require("ollama");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 会话存储
const sessions = new Map();

// 生成会话ID
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

// 获取或创建会话
function getOrCreateSession(sessionId) {
  if (!sessionId || !sessions.has(sessionId)) {
    sessionId = generateSessionId();
    sessions.set(sessionId, {
      chatHistory: [],
      lastActive: Date.now()
    });
  }
  return sessionId;
}

// 清理过期会话（24小时）
function cleanupSessions() {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActive > oneDay) {
      sessions.delete(sessionId);
    }
  }
}

// 每小时清理一次过期会话
setInterval(cleanupSessions, 60 * 60 * 1000);

// 文件哈希值映射表
const fileHashMap = new Map();

// 计算文件哈希值
function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// 获取文件扩展名
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

// 生成唯一文件名
function generateUniqueFilename(originalname, hash) {
  const ext = getFileExtension(originalname);
  return `${hash}${ext}`;
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // 上传文件将保存在uploads目录
  },
  filename: function (req, file, cb) {
    // 生成临时文件名
    const tempFilename = Date.now() + '-' + file.originalname;
    cb(null, tempFilename);
  }
});

// 文件类型过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.txt', '.json', '.doc', '.docx'];
  const ext = getFileExtension(file.originalname);
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型。仅支持 txt、json、doc、docx 文件。'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制文件大小为10MB
  }
});

// 确保uploads目录存在
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 初始化文件哈希值映射
async function initializeFileHashMap() {
  const files = fs.readdirSync('uploads');
  for (const file of files) {
    const filePath = path.join('uploads', file);
    try {
      const hash = await calculateFileHash(filePath);
      fileHashMap.set(hash, file);
    } catch (error) {
      console.error(`计算文件哈希值失败: ${file}`, error);
    }
  }
}

// 启动时初始化文件哈希值映射
initializeFileHashMap().catch(console.error);

const ollama = new Ollama();

// 读取文件内容
function readFileContent(filePath) {
  try {
    // 使用 utf8 编码读取文件，并移除 BOM
    const content = fs.readFileSync(filePath, 'utf8');
    return content.replace(/^\uFEFF/, '');
  } catch (error) {
    console.error('读取文件失败:', error);
    return null;
  }
}

// 保存AI回复到文件
function saveResponseToFile(content, fileName) {
  try {
    const filePath = path.join('uploads', fileName);
    fs.writeFileSync(filePath, content);
    return {
      filePath,
      fileName
    };
  } catch (error) {
    console.error('保存文件失败:', error);
    return null;
  }
}

// 处理文档修改
async function processDocument(configContent, targetContent) {
  try {
    // 清理输入内容中的 BOM
    configContent = configContent.replace(/^\uFEFF/, '');
    targetContent = targetContent.replace(/^\uFEFF/, '');
    
    // 构建系统提示
    const systemPrompt = `你是一个专业的文档处理助手。你的任务是理解配置文件的内容，并根据配置要求修改目标文档。
请直接返回修改后的文档内容，保持原有格式。
不要添加任何额外的解释或说明，只返回修改后的文档内容。`;

    // 构建用户提示
    const userPrompt = `配置文件内容：\n\n${configContent}\n\n目标文档内容：\n\n${targetContent}\n\n请根据配置文件的要求修改目标文档。`;
    
    // 使用 ollama.generate API，添加更多参数控制
    const response = await ollama.generate({
      model: "deepseek-r1:7b",
      prompt: userPrompt,
      system: systemPrompt,
      stream: false,
      think: true, // 启用思考功能
      keep_alive: "5m", // 保持模型加载5分钟
      options: {
        temperature: 0.7, // 控制创造性
        top_p: 0.9, // 控制输出的多样性
        top_k: 40, // 控制词汇选择范围
        num_ctx: 4096, // 上下文窗口大小
        repeat_penalty: 1.1, // 重复惩罚
        stop: ["\n\n", "。", "！", "？"] // 停止标记
      }
    });

    // 返回处理后的内容
    return response.response;
  } catch (error) {
    console.error('处理文档失败:', error);
    throw error;
  }
}

app.post("/chat", async (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    const { message, configContent, targetContent, configFileName, targetFileName, saveResponse, sessionId } = req.body;
    
    // 确保消息存在
    if (!message || typeof message !== "string") {
        console.error("Received an empty or invalid message");
        return res.status(400).send("Invalid message");
    }

    try {
        // 获取或创建会话
        const currentSessionId = getOrCreateSession(sessionId);
        const session = sessions.get(currentSessionId);
        session.lastActive = Date.now();

        // 处理文档修改
        let modifiedFileInfo = null;
        if (configContent && targetContent) {
            const modifiedContent = await processDocument(configContent, targetContent);
            if (modifiedContent) {
                const outputFileName = `modified_${targetFileName}`;
                modifiedFileInfo = saveResponseToFile(modifiedContent, outputFileName);
                if (modifiedFileInfo) {
                    res.write(`文档已修改并保存为: ${outputFileName}\n\n`);
                    // 添加下载链接信息
                    res.write(`下载链接: /api/download/${outputFileName}\n\n`);
                }
            }
        }

        // 准备消息
        let fullMessage = message;
        if (configContent && targetContent) {
            fullMessage = `配置文件 "${configFileName}" 和目标文档 "${targetFileName}" 的内容：\n\n配置文件：\n${configContent}\n\n目标文档：\n${targetContent}\n\n基于以上文件内容，请回答：${message}`;
        }

        // 添加用户消息到历史记录
        session.chatHistory.push({ role: "user", content: fullMessage });

        let botReply;
        if (configContent && targetContent) {
            // 文档处理场景 - 使用 ollama.generate()
            const response = await ollama.generate({
                model: "deepseek-r1:7b",
                prompt: fullMessage,
                system: "你是一个专业的文档处理助手。请根据用户的问题提供准确的回答。",
                stream: false,
                think: true,
                keep_alive: "5m",
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    top_k: 40,
                    num_ctx: 4096,
                    repeat_penalty: 1.1,
                    stop: ["\n\n", "。", "！", "？"]
                }
            });
            botReply = response.response;
        } else {
            // 普通对话场景 - 使用 ollama.chat()
            const messages = [
                {
                    role: "system",
                    content: "你是一个专业的文档处理助手。请根据用户的问题提供准确的回答。"
                },
                ...session.chatHistory
            ];
            
            const response = await ollama.chat({
                model: "deepseek-r1:7b",
                messages: messages,
                stream: false,
                think: true,
                keep_alive: "5m",
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    top_k: 40,
                    num_ctx: 4096,
                    repeat_penalty: 1.1,
                    stop: ["\n\n", "。", "！", "？"]
                }
            });
            botReply = response.message.content;
        }
        
        // 添加助手回复到历史记录
        session.chatHistory.push({ role: "assistant", content: botReply });
        
        // 发送回复
        res.write(botReply);
        res.end();

    } catch (error) {
        console.error("Error in chat endpoint:", error);
        res.status(500).send("Internal server error");
    }
});

// 添加获取聊天历史的接口
app.get("/chat/history/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({ error: "会话不存在" });
    }
    
    res.json({ history: session.chatHistory });
});

// 添加清除聊天历史的接口
app.post("/chat/clear/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({ error: "会话不存在" });
    }
    
    session.chatHistory = [];
    res.json({ message: "聊天历史已清除" });
});

// 处理文件上传
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    
    // 计算上传文件的哈希值
    const hash = await calculateFileHash(req.file.path);
    
    // 检查是否已存在相同哈希值的文件
    if (fileHashMap.has(hash)) {
      // 如果存在，删除新上传的文件
      fs.unlinkSync(req.file.path);
      // 返回已存在的文件信息
      const existingFilename = fileHashMap.get(hash);
      const fileContent = readFileContent(path.join('uploads', existingFilename));
      
      return res.json({
        message: 'File already exists',
        filename: req.body.fileName,
        storedFilename: existingFilename,
        content: fileContent
      });
    }
    
    // 如果不存在，保存新的哈希值映射
    fileHashMap.set(hash, req.file.filename);
    
    const fileContent = readFileContent(req.file.path);
    if (!fileContent) {
      return res.status(500).send('Error reading file content');
    }

    res.json({
      message: 'File uploaded successfully',
      filename: req.body.fileName,
      storedFilename: req.file.filename,
      content: fileContent
    });
  } catch (error) {
    // 如果发生错误，确保清理临时文件
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up temporary file:', unlinkError);
      }
    }
    res.status(500).send('Error uploading file: ' + error.message);
  }
});

// 下载文件
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join('uploads', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('文件不存在');
  }

  // 设置响应头
  res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
  res.setHeader('Content-Type', 'application/octet-stream');

  // 创建文件流并发送
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  // 处理错误
  fileStream.on('error', (error) => {
    console.error('文件下载错误:', error);
    if (!res.headersSent) {
      res.status(500).send('文件下载失败');
    }
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
