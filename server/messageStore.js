/**
 * 消息存储管理模块
 * 管理房间和消息，限制每个房间最多5条消息或50MB
 */

class MessageStore {
  constructor() {
    // 存储结构: { roomId: { messages: [], totalSize: 0 } }
    this.rooms = new Map();
    this.MAX_MESSAGES = 5;
    this.MAX_SIZE = 100 * 1024 * 1024; // 100MB
  }

  /**
   * 计算消息大小（字节）
   */
  calculateSize(message) {
    const jsonStr = JSON.stringify(message);
    return new Blob([jsonStr]).size;
  }

  /**
   * 添加消息到房间
   */
  addMessage(roomId, message) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { messages: [], totalSize: 0 });
    }

    const room = this.rooms.get(roomId);
    const messageSize = this.calculateSize(message);

    // 添加消息大小信息
    const messageWithSize = {
      ...message,
      size: messageSize,
      id: Date.now() + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now()
    };

    room.messages.push(messageWithSize);
    room.totalSize += messageSize;

    // 检查并清理超出限制的消息
    while (room.messages.length > this.MAX_MESSAGES || room.totalSize > this.MAX_SIZE) {
      const removed = room.messages.shift();
      room.totalSize -= removed.size;
    }

    return messageWithSize;
  }

  /**
   * 获取房间所有消息
   */
  getMessages(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.messages : [];
  }

  /**
   * 获取房间信息
   */
  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { messageCount: 0, totalSize: 0 };
    }
    return {
      messageCount: room.messages.length,
      totalSize: room.totalSize
    };
  }

  /**
   * 清空房间（可选功能）
   */
  clearRoom(roomId) {
    this.rooms.delete(roomId);
  }

  /**
   * 获取所有房间列表
   */
  getAllRooms() {
    return Array.from(this.rooms.keys());
  }
}

module.exports = MessageStore;
