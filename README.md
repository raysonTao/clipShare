# clipShare

一个简单易用的局域网剪贴板共享工具，支持多设备间实时共享文本和图片。

## 功能特性

- 🚀 跨设备共享：局域网内所有设备都可以访问
- 📝 文本共享：复制粘贴文本内容
- 🖼️ 图片共享：支持图片上传和粘贴
- 🔒 房间隔离：通过UUID创建独立的共享空间
- 💾 智能管理：自动限制每个房间最多5条消息或50MB
- 🌐 零客户端：其他设备只需浏览器即可使用
- ⚡ 实时同步：WebSocket实时推送消息

## 快速开始

### 方式一：直接运行（需要Node.js环境）

1. 安装依赖：
```bash
cd server
npm install
```

2. 启动服务：
```bash
cd ..
npm start
# 或指定端口
npm start -- --port 8080
```

3. 访问服务：
   - 本机：打开浏览器访问 `http://localhost:3000`
   - 其他设备：访问显示的局域网地址（如 `http://192.168.1.100:3000`）

### 方式二：使用打包的可执行文件（推荐）

#### 打包步骤

1. 安装 pkg 工具：
```bash
npm install -g pkg
```

2. 安装项目依赖：
```bash
cd server
npm install
cd ..
```

3. 打包：
```bash
# Windows 版本
npm run build:win

# Linux 版本
npm run build:linux

# 打包所有平台
npm run build:all
```

4. 可执行文件位于 `dist/` 目录

#### 使用打包文件

**Windows:**
```cmd
clipShare-win.exe
# 或指定端口
clipShare-win.exe --port 8080
```

**Linux:**
```bash
chmod +x clipShare-linux
./clipShare-linux
# 或指定端口
./clipShare-linux --port 8080
```

## 使用说明

### 1. 启动服务

在一台电脑（Windows或Linux）上启动 clipShare 服务，程序会显示：

```
=================================
  clipShare 服务已启动!
=================================

本机访问: http://localhost:3000
局域网访问: http://192.168.1.100:3000

在其他设备的浏览器中输入局域网地址即可使用
按 Ctrl+C 停止服务
```

### 2. 访问服务

在所有需要共享的设备上：
- 打开浏览器
- 输入局域网地址（如 `http://192.168.1.100:3000`）
- 无需安装任何软件

### 3. 创建/加入房间

- 在页面顶部输入一个房间号（3-16位字符）
- 点击"连接"按钮
- 所有输入相同房间号的设备将共享剪贴板内容

### 4. 共享内容

**发送文本：**
- 在底部输入框输入文本
- 点击"发送文本"或按 Ctrl+Enter

**发送图片：**
- 点击"选择图片"按钮上传
- 或直接在页面上按 Ctrl+V 粘贴图片

**复制内容：**
- 点击消息卡片上的"复制"按钮
- 文本和图片都会复制到系统剪贴板

## 配置选项

### 端口配置

通过命令行参数：
```bash
node server/index.js --port 8080
# 或可执行文件
./clipShare-linux --port 8080
```

通过环境变量：
```bash
PORT=8080 node server/index.js
```

默认端口：3000

### 存储限制

在 `server/messageStore.js` 中可以修改：
```javascript
this.MAX_MESSAGES = 5;              // 每个房间最多消息数
this.MAX_SIZE = 50 * 1024 * 1024;   // 每个房间最大总大小（字节）
```

## 项目结构

```
clipShare/
├── server/                 # 后端服务
│   ├── index.js           # 主服务器文件
│   ├── messageStore.js    # 消息存储管理
│   └── package.json       # 服务端依赖
├── public/                # 前端文件
│   ├── index.html         # 主页面
│   ├── style.css          # 样式文件
│   └── app.js             # WebSocket客户端
├── dist/                  # 打包输出目录
├── package.json           # 根配置
└── README.md              # 说明文档
```

## 技术栈

- **后端**: Node.js + Express + ws (WebSocket)
- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **打包**: pkg

## 注意事项

1. **网络要求**：所有设备必须在同一局域网内
2. **防火墙**：确保防火墙允许指定端口的访问
3. **图片大小**：单张图片建议不超过10MB
4. **浏览器兼容**：建议使用现代浏览器（Chrome、Firefox、Edge、Safari）
5. **安全性**：本工具适用于局域网环境，不建议暴露到公网

## 常见问题

**Q: 其他设备无法访问？**
- 检查是否在同一局域网
- 检查防火墙设置
- 确认使用正确的局域网IP地址

**Q: 图片无法复制？**
- 某些浏览器可能不支持图片复制到剪贴板
- 可以使用"下载"按钮保存图片

**Q: 消息丢失？**
- 消息只存储在内存中，重启服务会清空
- 每个房间最多保存5条消息或50MB

**Q: 如何修改端口？**
- 使用 `--port` 参数：`./clipShare --port 8080`
- 或设置环境变量：`PORT=8080`

## 开发

### 本地开发

```bash
# 安装依赖
cd server && npm install && cd ..

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 代码结构

- **server/index.js**: WebSocket服务器和HTTP服务器
- **server/messageStore.js**: 内存消息存储，带自动清理功能
- **public/app.js**: 前端WebSocket客户端，处理连接、消息发送/接收
- **public/style.css**: 响应式UI设计

## License

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
