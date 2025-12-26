#!/usr/bin/env node

/**
 * clipShare - 局域网剪贴板共享服务器
 */

const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const MessageStore = require('./messageStore');

// 解析命令行参数
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const PORT = portIndex !== -1 && args[portIndex + 1]
  ? parseInt(args[portIndex + 1])
  : parseInt(process.env.PORT) || 3000;

const app = express();

// 检查 SSL 证书是否存在
const certPath = path.join(__dirname, '../certs/localhost+6.pem');
const keyPath = path.join(__dirname, '../certs/localhost+6-key.pem');
const hasSSL = fs.existsSync(certPath) && fs.existsSync(keyPath);

// 根据证书存在与否创建服务器
let server;
let protocol;
if (hasSSL) {
  const options = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath)
  };
  server = https.createServer(options, app);
  protocol = 'https';
  console.log('✅ 使用 HTTPS 加密连接');
} else {
  server = http.createServer(app);
  protocol = 'http';
  console.log('⚠️  使用 HTTP 连接（剪贴板功能可能受限）');
  console.log('提示: 运行 "mkcert localhost" 生成证书以启用 HTTPS');
}

const wss = new WebSocket.Server({ server });
const messageStore = new MessageStore();

// 存储房间的连接: { roomId: Set<WebSocket> }
const roomConnections = new Map();

// ���态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 获取本机局域网IP地址
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部和非IPv4地址
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// WebSocket连接处理
wss.on('connection', (ws) => {
  console.log('新客户端连接');

  let currentRoomId = null;

  // 发送连接成功消息
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to clipShare server'
  }));

  // 处理客户端消息
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'join':
          // 加入房间
          const roomId = message.roomId;

          // 如果已在其他房间，先退出
          if (currentRoomId && roomConnections.has(currentRoomId)) {
            roomConnections.get(currentRoomId).delete(ws);
          }

          // 加入新房间
          if (!roomConnections.has(roomId)) {
            roomConnections.set(roomId, new Set());
          }
          roomConnections.get(roomId).add(ws);
          currentRoomId = roomId;

          console.log(`客户端加入房间: ${roomId}`);

          // 发送加入成功消息
          ws.send(JSON.stringify({
            type: 'joined',
            roomId: roomId,
            message: `Joined room ${roomId}`
          }));

          // 同步历史消息
          const messages = messageStore.getMessages(roomId);
          ws.send(JSON.stringify({
            type: 'sync',
            messages: messages
          }));
          break;

        case 'text':
        case 'image':
          // 保存消息
          if (!currentRoomId) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Please join a room first'
            }));
            return;
          }

          const savedMessage = messageStore.addMessage(currentRoomId, {
            type: message.type,
            content: message.content
          });

          // 广播消息到房间内所有客户端
          if (roomConnections.has(currentRoomId)) {
            const broadcast = JSON.stringify({
              type: 'new_message',
              message: savedMessage
            });

            roomConnections.get(currentRoomId).forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcast);
              }
            });
          }

          console.log(`房间 ${currentRoomId} 收到${message.type === 'text' ? '文本' : '图片'}消息`);
          break;

        case 'file':
          // 保存文件消息
          if (!currentRoomId) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Please join a room first'
            }));
            return;
          }

          const savedFileMessage = messageStore.addMessage(currentRoomId, {
            type: 'file',
            filename: message.filename,
            filesize: message.filesize,
            filetype: message.filetype,
            content: message.content
          });

          // 广播文件消息到房间内所有客户端
          if (roomConnections.has(currentRoomId)) {
            const fileBroadcast = JSON.stringify({
              type: 'new_message',
              message: savedFileMessage
            });

            roomConnections.get(currentRoomId).forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(fileBroadcast);
              }
            });
          }

          console.log(`房间 ${currentRoomId} 收到文件消息: ${message.filename}`);
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type'
          }));
      }
    } catch (error) {
      console.error('处理消息错误:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  // 客户端断开连接
  ws.on('close', () => {
    console.log('客户端断开连接');

    // 从房间中移除
    if (currentRoomId && roomConnections.has(currentRoomId)) {
      roomConnections.get(currentRoomId).delete(ws);

      // 如果房间空了，可以选择清理
      if (roomConnections.get(currentRoomId).size === 0) {
        roomConnections.delete(currentRoomId);
        console.log(`房间 ${currentRoomId} 已清空`);
      }
    }
  });

  // 错误处理
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });
});

// 启动服务器
server.listen(PORT, () => {
  const localIP = getLocalIPAddress();
  console.log('\n=================================');
  console.log('  clipShare 服务已启动!');
  console.log('=================================');
  console.log(`\n本机访问: ${protocol}://localhost:${PORT}`);
  console.log(`局域网访问: ${protocol}://${localIP}:${PORT}`);
  console.log('\n在其他设备的浏览器中输入局域网地址即可使用');
  if (hasSSL) {
    console.log('\n🔒 HTTPS 已启用，剪贴板功能完全可用');
  } else {
    console.log('\n⚠️  HTTP 模式：剪贴板功能可能受限');
  }
  console.log('按 Ctrl+C 停止服务\n');
});

// 优雅关闭函数
function gracefulShutdown(signal) {
  console.log(`\n收到 ${signal} 信号，正在关闭服务器...`);

  // 关闭所有 WebSocket 连接
  wss.clients.forEach((client) => {
    client.close();
  });

  // 关闭 WebSocket 服务器
  wss.close(() => {
    console.log('WebSocket 服务器已关闭');
  });

  // 关闭 HTTP 服务器
  server.close(() => {
    console.log('HTTP 服务器已关闭');
    process.exit(0);
  });

  // 设置超时强制退出（5秒后）
  setTimeout(() => {
    console.log('超时强制退出...');
    process.exit(0);
  }, 5000);
}

// 监听关闭信号
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
