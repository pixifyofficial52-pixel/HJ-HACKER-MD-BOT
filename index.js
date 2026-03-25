/* 
╔═══════════════════════════════════════════════╗
║     WHATSAPP BOT BY HJ-HACKER                 ║
║     STABLE VERSION WITH AUTO-RECONNECT       ║
╚═══════════════════════════════════════════════╝
*/

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const axios = require('axios');
const moment = require('moment-timezone');
const chalk = require('chalk');
const express = require('express');

// ============ EXPRESS SERVER FOR HEALTH CHECK ============
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        bot: 'HJ-HACKER',
        uptime: process.uptime(),
        time: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.status(200).json({ status: 'Bot is running', bot: 'HJ-HACKER' });
});

app.listen(PORT, () => {
    console.log(chalk.blue(`✅ Health check: http://localhost:${PORT}`));
});

// ============ CONFIGURATION ============
const config = {
    botName: 'HJ-HACKER',
    ownerNumber: process.env.OWNER_NUMBER || '923266571331',
    ownerName: 'HJ-HACKER',
    version: '1.0.0',
    apiUrl: process.env.API_URL || 'https://whatsapp-auth-api-production.up.railway.app',
    channelLink: 'https://whatsapp.com/channel/0029VbAaNJ6C1FuB0mIAx93M',
    mode: 'public',
    autoRead: false,
    antiCall: true,
    cooldown: 3000
};

// Colors
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

console.log(chalk.blue(`
╔═══════════════════════════════════════════════╗
║     WHATSAPP BOT BY HJ-HACKER                 ║
║     STABLE VERSION                            ║
╚═══════════════════════════════════════════════╝
`));

// ============ BOT STATE ============
let sock = null;
let isConnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 50;
const cooldown = new Map();

// ============ HELPER FUNCTIONS ============
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isOwner(number) {
    const clean = number.replace(/[^0-9]/g, '');
    return clean === config.ownerNumber;
}

function formatTime() {
    return moment().tz('Asia/Karachi').format('HH:mm:ss');
}

// ============ COMMANDS ============
const commands = {
    '.help': async (sock, msg, args, sender) => {
        const menu = `╭━━━━━━━━━━━━━━━━━━━━╮
┃ *${config.botName} BOT*    
┃ *Owner:* ${config.ownerName}
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━╮
┃ *📌 COMMANDS*        
┃ .help - Show menu
┃ .ping - Check bot
┃ .owner - Owner info
┃ .joke - Random joke
┃ .tagall - Tag all
┃ .groupinfo - Group info
┃ .settings - Bot settings
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━╮
┃ *📢 CHANNEL*         
┃ ${config.channelLink}
╰━━━━━━━━━━━━━━━━━━━━╯

*© ${config.botName}*`;
        await sock.sendMessage(msg.key.remoteJid, { text: menu });
    },
    
    '.menu': async (sock, msg, args, sender) => {
        await commands['.help'](sock, msg, args, sender);
    },
    
    '.ping': async (sock, msg, args, sender) => {
        await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pong!' });
    },
    
    '.owner': async (sock, msg, args, sender) => {
        const vcard = 'BEGIN:VCARD\nVERSION:3.0\n' +
                      `FN:${config.ownerName}\n` +
                      `TEL;waid=${config.ownerNumber}:${config.ownerNumber}\n` +
                      'END:VCARD';
        await sock.sendMessage(msg.key.remoteJid, {
            contacts: { displayName: config.ownerName, contacts: [{ vcard }] }
        });
    },
    
    '.joke': async (sock, msg, args, sender) => {
        const jokes = [
            'Why don\'t scientists trust atoms? Because they make up everything!',
            'Why did the scarecrow win an award? He was outstanding in his field!',
            'What do you call a fake noodle? An impasta!'
        ];
        await sock.sendMessage(msg.key.remoteJid, { text: jokes[Math.floor(Math.random() * jokes.length)] });
    },
    
    '.tagall': async (sock, msg, args, sender) => {
        if (!msg.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Group only!' });
            return;
        }
        const metadata = await sock.groupMetadata(msg.key.remoteJid);
        const mentions = metadata.participants.map(p => p.id);
        const text = args.join(' ') || 'Attention everyone!';
        await sock.sendMessage(msg.key.remoteJid, { text, mentions });
    },
    
    '.groupinfo': async (sock, msg, args, sender) => {
        if (!msg.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Group only!' });
            return;
        }
        const metadata = await sock.groupMetadata(msg.key.remoteJid);
        const info = `📛 *Name:* ${metadata.subject}\n👥 *Members:* ${metadata.participants.length}\n👑 *Owner:* ${metadata.owner || 'Unknown'}`;
        await sock.sendMessage(msg.key.remoteJid, { text: info });
    },
    
    '.settings': async (sock, msg, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner only!' });
            return;
        }
        const settings = `🤖 *Bot Settings*\n━━━━━━━━━━\nMode: ${config.mode}\nAuto Read: ${config.autoRead ? 'ON' : 'OFF'}\nAnti Call: ${config.antiCall ? 'ON' : 'OFF'}`;
        await sock.sendMessage(msg.key.remoteJid, { text: settings });
    }
};

// ============ MESSAGE HANDLER ============
async function handleMessage(sock, message) {
    try {
        if (!message.message) return;
        
        const sender = message.key.remoteJid;
        const text = message.message.conversation || 
                     message.message.extendedTextMessage?.text || '';
        
        if (!text) return;
        
        const cmd = text.split(' ')[0].toLowerCase();
        const args = text.slice(cmd.length).trim().split(' ');
        
        // Cooldown
        if (cooldown.has(sender)) {
            if (Date.now() - cooldown.get(sender) < config.cooldown) return;
        }
        
        // Private mode
        if (config.mode === 'private' && !isOwner(sender)) {
            await sock.sendMessage(sender, { text: '❌ Private mode' });
            return;
        }
        
        // Execute command
        if (commands[cmd]) {
            cooldown.set(sender, Date.now());
            await commands[cmd](sock, message, args, sender);
        }
        
        // Auto read
        if (config.autoRead && !sender.includes('g.us')) {
            await sock.readMessages([message.key]);
        }
        
    } catch (error) {
        console.error('Message error:', error.message);
    }
}

// ============ PAIRING FUNCTION ============
async function getPairingCode(sock, number) {
    try {
        const code = await sock.requestPairingCode(number);
        console.log(chalk.green(`\n✅ PAIRING CODE: ${code}`));
        console.log(chalk.yellow(`📱 Enter this code in WhatsApp > Settings > Linked Devices\n`));
        return code;
    } catch (error) {
        console.log(chalk.red(`❌ Pairing failed: ${error.message}`));
        return null;
    }
}

// ============ CONNECT WITH AUTO-RECONNECT ============
async function connectToWhatsApp() {
    if (isConnecting) {
        console.log(chalk.yellow('Already connecting...'));
        return;
    }
    
    isConnecting = true;
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        
        sock = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.macOS('Desktop'),
            version: [2, 3000, 1015901307],
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 30000,
            keepAliveIntervalMs: 10000
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                if (shouldReconnect) {
                    reconnectAttempts++;
                    console.log(chalk.yellow(`⚠️ Disconnected (${reconnectAttempts}/${maxReconnectAttempts})`));
                    
                    if (reconnectAttempts <= maxReconnectAttempts) {
                        const waitTime = Math.min(5000 * reconnectAttempts, 60000);
                        console.log(chalk.yellow(`⏳ Reconnecting in ${waitTime/1000}s...`));
                        await delay(waitTime);
                        isConnecting = false;
                        connectToWhatsApp();
                    } else {
                        console.log(chalk.red('❌ Max reconnects reached. Restarting...'));
                        process.exit(1);
                    }
                } else {
                    console.log(chalk.red('❌ Logged out. Please restart with new pairing.'));
                }
            } 
            else if (connection === 'open') {
                reconnectAttempts = 0;
                console.log(chalk.green(`\n✅ Bot Online!`));
                console.log(chalk.cyan(`🤖 ${config.botName}`));
                console.log(chalk.cyan(`📱 ${sock.user.id.split(':')[0]}\n`));
            }
        });
        
        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                await handleMessage(sock, msg);
            }
        });
        
        // Handle pairing
        const pairingNumber = process.env.PAIRING_NUMBER;
        if (pairingNumber && !sock.authState.creds.registered) {
            console.log(chalk.yellow(`\n📱 Requesting pairing for ${pairingNumber}...`));
            await delay(3000);
            await getPairingCode(sock, pairingNumber);
        }
        
        isConnecting = false;
        
    } catch (error) {
        console.log(chalk.red(`❌ Connection error: ${error.message}`));
        isConnecting = false;
        
        setTimeout(() => {
            connectToWhatsApp();
        }, 10000);
    }
}

// ============ START BOT ============
console.log(chalk.blue('🚀 Starting WhatsApp Bot...\n'));
connectToWhatsApp();

// Keep alive
setInterval(() => {
    if (sock?.user) {
        console.log(chalk.dim(`[${formatTime()}] Bot running...`));
    }
}, 60000);

// Handle process exit
process.on('uncaughtException', (error) => {
    console.log(chalk.red(`Uncaught: ${error.message}`));
});

process.on('unhandledRejection', (error) => {
    console.log(chalk.red(`Unhandled: ${error.message}`));
});
