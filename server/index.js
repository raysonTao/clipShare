#!/usr/bin/env node

/**
 * clipShare - 局域网剪贴板共享服务器
 */

const express = require('express');
const http = require('http');
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
const server = http.createServer(app);
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
  console.log(`\n本机访问: http://localhost:${PORT}`);
  console.log(`局域网访问: http://${localIP}:${PORT}`);
  console.log('\n在其他设备的浏览器中输入局域网地址即可使用');
  console.log('按 Ctrl+C 停止服务\n');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
