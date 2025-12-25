#!/usr/bin/env node

/**
 * 为打包的可执行文件添加图标
 * Windows: 使用 rcedit
 * Linux: 不需要处理（可选）
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const iconPath = path.join(__dirname, 'public', 'icon.png');

console.log('开始为可执行文件添加图标...');

// 检查图标文件是否存在
if (!fs.existsSync(iconPath)) {
    console.warn('警告: 未找到图标文件:', iconPath);
    process.exit(0);
}

// Windows 可执行文件
const winExe = path.join(distDir, 'clipShare-win.exe');
if (fs.existsSync(winExe)) {
    console.log('处理 Windows 可执行文件...');

    try {
        // 需要先将 PNG 转换为 ICO 格式（或直接使用 ICO 文件）
        // 这里我们使用 rcedit-rs (跨平台)
        const rcedit = require('rcedit');

        // 注意：rcedit 需要 .ico 文件，不是 .png
        // 如果只有 PNG，需要先转换或使用在线工具转换
        console.log('注意: rcedit 需要 .ico 格式的图标文件');
        console.log('请将 icon.png 转换为 icon.ico 后使用');
        console.log('或者手动使用: rcedit clipShare-win.exe --set-icon icon.ico');

    } catch (error) {
        console.log('提示: 可以手动为 Windows 可执行文件添加图标');
        console.log('安装 rcedit: npm install -g rcedit');
        console.log('使用命令: rcedit dist/clipShare-win.exe --set-icon public/icon.ico');
    }
} else {
    console.log('未找到 Windows 可执行文件');
}

// Linux 可执行文件（通常不需要内嵌图标）
const linuxExe = path.join(distDir, 'clipShare-linux');
if (fs.existsSync(linuxExe)) {
    console.log('Linux 可执行文件已生成（Linux 不需要内嵌图标）');
}

console.log('图标处理完成！');
console.log('\n提示: 如需为 Windows 添加图标，请:');
console.log('1. 将 icon.png 转换为 icon.ico');
console.log('2. 安装 rcedit: npm install --save-dev rcedit');
console.log('3. 运行: npx rcedit dist/clipShare-win.exe --set-icon public/icon.ico');
