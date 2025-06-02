<!--
 * @Author: wei-destiny 1286780926@qq.com
 * @Date: 2025-06-02 19:32:45
 * @LastEditors: wei-destiny 1286780926@qq.com
 * @LastEditTime: 2025-06-02 20:11:14
 * @FilePath: \deepseek-web\README.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
DeepSeek Web
==============

DeepSeek Web is a **browser-based interactive chat interface** that leverages **DeepSeek R1** via the **Ollama** framework. This project consists of a **React frontend (UI)** and a **Node.js backend (server)** to facilitate real-time interactions with DeepSeek models, simulating a chat experience similar to **Gemini** and **ChatGPT**, including memory retention and bot typing effects.

Features
--------

*   **Frontend (UI) - React:**
    
    *   Chat interface with a human-readable format for DeepSeek R1 responses.
        
    *   Supports **inline code, multi-line code blocks, headings, text styles**, and more.
        
    *   Streams responses in real time for a **smooth chat experience**.
        
    *   Fetches responses from the backend using **fetch API**.
    
*   **Backend (Server) - Node.js:**
    
    *   Exposes an API endpoint for processing messages via **Ollama.chat**.
        
    *   Streams bot responses for **real-time typing effects**.
        
    *   Implements **chat memory** to maintain conversation context.
        
    *   Supports **custom DeepSeek models** (default: deepseek-r1:7b).
        

Folder Structure
----------------

```
root/  
│-- server/ # Node.js backend (API server)  
│-- ui/ # React frontend (chat interface) 
```


Prerequisites
-------------

Before setting up DeepSeek Web, ensure you meet the following requirements:

*   **DeepSeek Model**: Must be installed manually (refer to **DeepSeek on Hugging Face**).
    
*   **Ollama**: Required to serve the model locally. Install from [**Ollama's official site**](https://ollama.com/).
    
*   **Hardware Requirements:** (Minimum for deepseek-r1:7b)
    
    *   **CPU:** 8-core ( AMD Ryzen 7 5800X3D recommended for smooth performance)
        
    *   **RAM:** 8GB+ (Higher RAM improves performance)
        
    *   **Storage:** SSD recommended for fast model loading
        
    *   **GPU:** Recommended for faster inference (supports CUDA & ROCm acceleration)
        

## Model Selection

| Model Name                    | Number of Parameters | VRAM Requirements | Recommended Graphics Card (Minimum) |
| ----------------------------- | -------------------- | ----------------- | ----------------------------------- |
| DeepSeek-R1-Distill-Qwen-1.5B | 1.5B                 | 4-6 GB            | GTX 1660 Ti, RTX 2060               |
| DeepSeek-R1-Distill-Qwen-7B   | 7B                   | 12-16 GB          | RTX 3060, RTX 3080                  |
| DeepSeek-R1-Distill-Llama-8B  | 8B                   | 16-20 GB          | RTX 3080 Ti, RTX 3090               |
| DeepSeek-R1-Distill-Qwen-14B  | 14B                  | 24-32 GB          | RTX 3090, RTX 4090                  |
| DeepSeek-R1-Distill-Qwen-32B  | 32B                  | 48-64 GB          | A100, H100                          |
| DeepSeek-R1-Distill-Llama-70B | 70B                  | 80-128 GB         | A100, H100, MI250X                  |

### 

Installation & Setup
--------------------

### 1️⃣ Install Ollama

`curl -fsSL https://ollama.com/install.sh | sh`

or if you are using windows 11, download from https://ollama.com/

### 2️⃣ Download & Setup DeepSeek Model

`ollama pull deepseek-r1:7b`

(Or use deepseek-r1:1.5b for lower resource usage)

again if you're windows 11 user, you can simply runs `ollama run deepseek-r1:7b` on drive C:\ with admin permission. This will download the model r1:7b (around 4-5gb - only downloading once on setup) and then it will "serve" the ollama locally

### 3️⃣ Clone the Repository

```
git clone https://github.com/wei2019-destiny/deepseek-web.git
cd deepseek-web
```

### 4️⃣ Install & Run Backend (Node.js API Server)

```
cd server
pnpm i
npm i -g nodemon
nodemon server.js
```

_Server will run on_ _**http://localhost:3000/**_

### 5️⃣ Install & Run Frontend (React UI)

```
cd ../ui
pnpm i
pnpm run dev
```

_UI will run on_ _**http://localhost:5173/**_ _(or the Vite default port)_

Usage
-----

1.  Open the **React UI** in your browser.
2.  Type a message and send it.
3.  The response will stream in **real-time**.
4.  The chat maintains **conversation memory** for better context understanding.
5.  This is tested on AMD Ryzen 7 5800X3D with 8GB ram and RTX3060 (CUDA) with very smooth experience
    

Customizing Model
-----------------

By default, DeepSeek Web uses deepseek-r1:7b. To change the model, update **server.js**:

```
const stream = await ollama.chat({
    model: "deepseek-r1:7b",  // Change model here
    messages: [{ role: "user", content: message }],
    stream: true
});
```

Supported models:

*   deepseek-r1:7b (recommended)
*   deepseek-r1:1.5b (lower resource usage, but reduced performance)
*   You can use higher model but it might need way higher resource than 7B
    

Contributing
------------

I welcome contributions! If you find a bug or have an idea for improvement, feel free to **open an issue** or submit a **pull request**.

License
-------

This project is **open-source** and available under the **MIT License**.

**Enjoy real-time AI interactions with DeepSeek Web! --- destiny**