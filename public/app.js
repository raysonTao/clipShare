/**
 * clipShare 前端 WebSocket 客户端
 */

class ClipShareClient {
    constructor() {
        this.ws = null;
        this.currentRoomId = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        // 连接控制
        this.roomIdInput = document.getElementById('roomId');
        this.connectBtn = document.getElementById('connectBtn');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.roomInfo = document.getElementById('roomInfo');

        // 消息
        this.messagesList = document.getElementById('messagesList');
        this.clearBtn = document.getElementById('clearBtn');

        // 输入
        this.textInput = document.getElementById('textInput');
        this.sendTextBtn = document.getElementById('sendTextBtn');
        this.imageInput = document.getElementById('imageInput');

        // 模态框
        this.imageModal = document.getElementById('imageModal');
        this.modalImage = document.getElementById('modalImage');
    }

    bindEvents() {
        // 连接按钮
        this.connectBtn.addEventListener('click', () => this.toggleConnection());

        // 发送文本
        this.sendTextBtn.addEventListener('click', () => this.sendText());
        this.textInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.sendText();
            }
        });

        // 图片选择
        this.imageInput.addEventListener('change', (e) => this.handleImageSelect(e));

        // 全局粘贴事件
        document.addEventListener('paste', (e) => this.handlePaste(e));

        // 清空按钮
        this.clearBtn.addEventListener('click', () => this.clearMessages());

        // 模态框关闭
        const closeModal = document.querySelector('.modal-close');
        closeModal.addEventListener('click', () => this.closeModal());
        this.imageModal.addEventListener('click', (e) => {
            if (e.target === this.imageModal) {
                this.closeModal();
            }
        });

        // 房间号输入框回车
        this.roomIdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.toggleConnection();
            }
        });
    }

    toggleConnection() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            this.connect();
        }
    }

    connect() {
        const roomId = this.roomIdInput.value.trim();
        if (!roomId) {
            alert('请输入房间号');
            return;
        }

        if (roomId.length < 3) {
            alert('房间号至少3个字符');
            return;
        }

        this.updateStatus('connecting', '连接中...');
        this.connectBtn.disabled = true;

        // WebSocket 连接
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket 已连接');
                this.isConnected = true;
                this.reconnectAttempts = 0;

                // 加入房间
                this.joinRoom(roomId);
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket 错误:', error);
                this.updateStatus('error', '连接错误');
            };

            this.ws.onclose = () => {
                console.log('WebSocket 已断开');
                this.isConnected = false;
                this.updateStatus('disconnected', '未连接');
                this.connectBtn.textContent = '连接';
                this.connectBtn.disabled = false;
                this.roomInfo.textContent = '';

                // 自动重连
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => this.connect(), 3000);
                }
            };
        } catch (error) {
            console.error('连接失败:', error);
            this.updateStatus('error', '连接失败');
            this.connectBtn.disabled = false;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.currentRoomId = null;
        this.updateStatus('disconnected', '未连接');
        this.connectBtn.textContent = '连接';
        this.roomInfo.textContent = '';
    }

    joinRoom(roomId) {
        this.currentRoomId = roomId;
        this.send({
            type: 'join',
            roomId: roomId
        });
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error('WebSocket 未连接');
        }
    }

    handleMessage(message) {
        console.log('收到消息:', message);

        switch (message.type) {
            case 'connected':
                console.log(message.message);
                break;

            case 'joined':
                this.updateStatus('connected', '已连接');
                this.connectBtn.textContent = '断开';
                this.connectBtn.disabled = false;
                this.roomInfo.textContent = `房间: ${message.roomId}`;
                this.roomIdInput.disabled = true;
                break;

            case 'sync':
                // 同步历史消息
                this.clearMessages();
                message.messages.forEach(msg => this.addMessage(msg));
                break;

            case 'new_message':
                // 新消息
                this.addMessage(message.message);
                break;

            case 'error':
                alert('错误: ' + message.message);
                break;
        }
    }

    addMessage(message) {
        // 移除空状态
        const emptyState = this.messagesList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const card = document.createElement('div');
        card.className = 'message-card';
        card.dataset.messageId = message.id;

        const time = new Date(message.timestamp).toLocaleTimeString('zh-CN');

        if (message.type === 'text') {
            card.innerHTML = `
                <div class="message-header">
                    <span class="message-type">文本</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(message.content)}</div>
                </div>
                <div class="message-actions">
                    <button class="btn-copy" onclick="client.copyText(this, '${this.escapeHtml(message.content).replace(/'/g, "\\'")}')">
                        复制
                    </button>
                </div>
            `;
        } else if (message.type === 'image') {
            card.innerHTML = `
                <div class="message-header">
                    <span class="message-type">图片</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">
                    <img src="${message.content}" class="message-image" onclick="client.showImageModal('${message.content}')">
                </div>
                <div class="message-actions">
                    <button class="btn-copy" onclick="client.copyImage(this, '${message.content}')">
                        复制
                    </button>
                    <button class="btn-copy" onclick="client.downloadImage('${message.content}')">
                        下载
                    </button>
                </div>
            `;
        }

        this.messagesList.appendChild(card);
        this.messagesList.scrollTop = this.messagesList.scrollHeight;
    }

    sendText() {
        const text = this.textInput.value.trim();
        if (!text) {
            alert('请输入文本内容');
            return;
        }

        if (!this.isConnected) {
            alert('请先连接到房间');
            return;
        }

        this.send({
            type: 'text',
            content: text
        });

        this.textInput.value = '';
    }

    handleImageSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        this.sendImage(file);
        event.target.value = '';
    }

    handlePaste(event) {
        // 如果正在输入框中，不处理
        if (event.target.tagName === 'TEXTAREA' || event.target.tagName === 'INPUT') {
            return;
        }

        const items = event.clipboardData.items;

        for (let item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                this.sendImage(file);
                event.preventDefault();
                return;
            } else if (item.type === 'text/plain') {
                item.getAsString(text => {
                    if (text && this.isConnected) {
                        this.send({
                            type: 'text',
                            content: text
                        });
                    }
                });
                event.preventDefault();
                return;
            }
        }
    }

    sendImage(file) {
        if (!this.isConnected) {
            alert('请先连接到房间');
            return;
        }

        // 检查文件大小 (限制10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('图片大小不能超过10MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.send({
                type: 'image',
                content: e.target.result
            });
        };
        reader.readAsDataURL(file);
    }

    copyText(button, text) {
        // 解码 HTML 实体
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        const decodedText = textarea.value;

        navigator.clipboard.writeText(decodedText).then(() => {
            button.textContent = '已复制';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = '复制';
                button.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败');
        });
    }

    async copyImage(button, dataUrl) {
        try {
            // 将 base64 转换为 blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);

            button.textContent = '已复制';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = '复制';
                button.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('复制图片失败:', err);
            alert('复制图片失败，请尝试下载');
        }
    }

    downloadImage(dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `clipshare-image-${Date.now()}.png`;
        link.click();
    }

    showImageModal(dataUrl) {
        this.modalImage.src = dataUrl;
        this.imageModal.style.display = 'block';
    }

    closeModal() {
        this.imageModal.style.display = 'none';
    }

    clearMessages() {
        this.messagesList.innerHTML = `
            <div class="empty-state">
                <p>暂无共享内容</p>
                <p class="hint">在下方输入文本或粘贴图片 (Ctrl+V)</p>
            </div>
        `;
    }

    updateStatus(state, text) {
        this.statusText.textContent = text;
        this.statusDot.className = 'status-dot ' + state;

        if (state === 'connected') {
            this.statusDot.classList.add('connected');
        } else if (state === 'disconnected' || state === 'error') {
            this.statusDot.classList.add('disconnected');
            this.roomIdInput.disabled = false;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化客户端
const client = new ClipShareClient();

// 页面加载完成提示
console.log('clipShare 已就绪');
