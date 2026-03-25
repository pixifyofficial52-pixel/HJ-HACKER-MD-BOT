/* 
╔═══════════════════════════════════════════════╗
║     WHATSAPP BOT BY HJ-HACKER                 ║
║     WITH WEB INTERFACE & PAIRING SYSTEM      ║
╚═══════════════════════════════════════════════╝
*/

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment-timezone');
const chalk = require('chalk');
const express = require('express');

// ============ EXPRESS SERVER ============
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve index page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        bot: 'HJ-HACKER WhatsApp Bot',
        version: '1.0.0',
        uptime: process.uptime(),
        connected: sock ? true : false,
        timestamp: new Date().toISOString()
    });
});

// Pairing endpoint for web interface
app.get('/pair', async (req, res) => {
    const number = req.query.number;
    
    if (!number) {
        return res.status(400).json({ error: 'Number is required' });
    }
    
    // Clean and format number
    let cleanNumber = number.replace(/[^0-9]/g, '');
    if (!cleanNumber.startsWith('92')) {
        cleanNumber = '92' + cleanNumber;
    }
    
    // Validate number length
    if (cleanNumber.length < 10 || cleanNumber.length > 12) {
        return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    try {
        if (!sock) {
            return res.status(503).json({ error: 'Bot is not connected yet. Please wait and try again.' });
        }
        
        // Check if already authenticated
        if (sock.authState.creds.registered) {
            return res.status(400).json({ 
                error: 'Bot is already paired',
                message: 'This bot is already connected to a WhatsApp account'
            });
        }
        
        console.log(chalk.yellow(`📱 Pairing request for: ${cleanNumber}`));
        
        // Request pairing code
        const code = await sock.requestPairingCode(cleanNumber);
        
        console.log(chalk.green(`✅ Pairing code generated for ${cleanNumber}: ${code}`));
        
        res.json({ 
            success: true, 
            code: code,
            number: cleanNumber,
            message: 'Pairing code generated successfully'
        });
        
    } catch (error) {
        console.error(chalk.red(`❌ Pairing error: ${error.message}`));
        res.status(500).json({ 
            error: error.message || 'Failed to generate pairing code',
            suggestion: 'Make sure the number is correct and try again'
        });
    }
});

// Bot info endpoint
app.get('/info', (req, res) => {
    res.json({
        botName: 'HJ-HACKER',
        version: '1.0.0',
        owner: '923266571331',
        channel: 'https://whatsapp.com/channel/0029VbAaNJ6C1FuB0mIAx93M',
        commands: 78,
        status: sock ? (sock.user ? 'connected' : 'connecting') : 'disconnected'
    });
});

// Start express server
app.listen(PORT, () => {
    console.log(chalk.blue(`✅ Web Interface: http://localhost:${PORT}`));
    console.log(chalk.blue(`✅ Health Check: http://localhost:${PORT}/health`));
});

// ============ BOT CONFIGURATION ============
const config = {
    botName: 'HJ-HACKER',
    ownerNumber: process.env.OWNER_NUMBER || '923266571331',
    ownerName: 'HJ-HACKER',
    version: '1.0.0',
    apiUrl: process.env.API_URL || 'https://whatsapp-auth-api-production.up.railway.app',
    channelLink: 'https://whatsapp.com/channel/0029VbAaNJ6C1FuB0mIAx93M',
    mode: 'public',
    autoRead: false,
    autoTyping: false,
    antiCall: true,
    antiDelete: false,
    welcomeMessage: true,
    goodbyeMessage: true,
    cooldown: 3000
};

// Colors for console
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    reset: '\x1b[0m'
};

// Print Banner
console.log(chalk.cyan(`
╔═══════════════════════════════════════════════╗
║     WHATSAPP BOT BY HJ-HACKER                 ║
║     VERSION: ${config.version}                         ║
║     OWNER: ${config.ownerName}                  ║
║     WEB INTERFACE ENABLED                      ║
╚═══════════════════════════════════════════════╝
`));

// ============ BOT STATE ============
let sock = null;
let isConnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 50;
const cooldown = new Map();
const groupSettings = new Map();

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

function formatDate() {
    return moment().tz('Asia/Karachi').format('DD/MM/YYYY');
}

async function getBuffer(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (error) {
        return null;
    }
}

// ============ API FUNCTIONS ============
async function sendWhatsAppMessage(botNumber, receiver, text, otp = null) {
    try {
        let url = `${config.apiUrl}/send?botNumber=${botNumber}&receiver=${receiver}&text=${encodeURIComponent(text)}`;
        if (otp) {
            url += `&otp=${otp}`;
        }
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('API Error:', error.message);
        return null;
    }
}

// ============ COMMANDS ============
const commands = {
    '.help': async (sock, msg, args, sender) => {
        const menu = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃    *${config.botName} BOT MENU*        
┃    *Version:* ${config.version}         
┃    *Owner:* ${config.ownerName}        
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *🛡️ GENERAL COMMANDS*          
┃  • .help or .menu - Show menu
┃  • .ping - Check bot
┃  • .owner - Owner info
┃  • .joke - Random joke
┃  • .time - Current time
┃  • .date - Current date
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *👮‍♂️ GROUP COMMANDS*            
┃  • .tagall - Tag all members
┃  • .hidetag <msg> - Hidden tag
┃  • .groupinfo - Group info
┃  • .welcome <on/off> - Welcome msg
┃  • .goodbye <on/off> - Goodbye msg
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *🔒 OWNER COMMANDS*            
┃  • .mode <public/private>
┃  • .autoread <on/off>
┃  • .autotyping <on/off>
┃  • .anticall <on/off>
┃  • .settings - Show settings
┃  • .broadcast <msg> - Broadcast
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *📥 DOWNLOADER*                
┃  • .play <song> - Play music
┃  • .song <song> - Download song
┃  • .ytmp3 <url> - YouTube audio
┃  • .ytmp4 <url> - YouTube video
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *🖼️ ANIME COMMANDS*            
┃  • .kiss - Send kiss
┃  • .hug - Send hug
┃  • .slap - Send slap
┃  • .pat - Send pat
┃  • .cry - Send cry
┃  • .wink - Send wink
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *📢 JOIN OUR CHANNEL*          
┃  ${config.channelLink}           
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

*© Powered by ${config.botName}*
        `;
        await sock.sendMessage(msg.key.remoteJid, { text: menu });
    },
    
    '.menu': async (sock, msg, args, sender) => {
        await commands['.help'](sock, msg, args, sender);
    },
    
    '.ping': async (sock, msg, args, sender) => {
        const start = Date.now();
        await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pinging...' });
        const end = Date.now();
        await sock.sendMessage(msg.key.remoteJid, { text: `🏓 Pong! ${end - start}ms` });
    },
    
    '.owner': async (sock, msg, args, sender) => {
        const vcard = 'BEGIN:VCARD\n' +
                      'VERSION:3.0\n' +
                      `FN:${config.ownerName}\n` +
                      `TEL;type=CELL;type=VOICE;waid=${config.ownerNumber}:${config.ownerNumber}\n` +
                      'END:VCARD';
        await sock.sendMessage(msg.key.remoteJid, {
            contacts: { displayName: config.ownerName, contacts: [{ vcard }] }
        });
    },
    
    '.joke': async (sock, msg, args, sender) => {
        const jokes = [
            'Why don\'t scientists trust atoms? Because they make up everything!',
            'Why did the scarecrow win an award? He was outstanding in his field!',
            'Why don\'t eggs tell jokes? They\'d crack each other up!',
            'What do you call a fake noodle? An impasta!',
            'Why did the bicycle fall over? Because it was two-tired!'
        ];
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        await sock.sendMessage(msg.key.remoteJid, { text: randomJoke });
    },
    
    '.time': async (sock, msg, args, sender) => {
        const time = formatTime();
        await sock.sendMessage(msg.key.remoteJid, { text: `🕐 Current Time: ${time}` });
    },
    
    '.date': async (sock, msg, args, sender) => {
        const date = formatDate();
        await sock.sendMessage(msg.key.remoteJid, { text: `📅 Current Date: ${date}` });
    },
    
    '.tagall': async (sock, msg, args, sender) => {
        if (!msg.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ This command can only be used in groups!' });
            return;
        }
        
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const participants = groupMetadata.participants;
        let mentions = [];
        
        for (let participant of participants) {
            mentions.push(participant.id);
        }
        
        const text = args.join(' ') || 'Attention everyone!';
        await sock.sendMessage(msg.key.remoteJid, { text, mentions });
    },
    
    '.hidetag': async (sock, msg, args, sender) => {
        if (!msg.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ This command can only be used in groups!' });
            return;
        }
        
        const text = args.join(' ') || 'Hidden tag message';
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const participants = groupMetadata.participants;
        let mentions = [];
        
        for (let participant of participants) {
            mentions.push(participant.id);
        }
        
        await sock.sendMessage(msg.key.remoteJid, { text, mentions });
    },
    
    '.groupinfo': async (sock, msg, args, sender) => {
        if (!msg.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ This command can only be used in groups!' });
            return;
        }
        
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const info = `
╭━━━━━━━━━━━━━━━━━━━━╮
┃ *GROUP INFORMATION*     
╰━━━━━━━━━━━━━━━━━━━━╯

📛 *Name:* ${groupMetadata.subject}
🆔 *ID:* ${groupMetadata.id}
👥 *Members:* ${groupMetadata.participants.length}
👑 *Owner:* ${groupMetadata.owner || 'Unknown'}
📅 *Created:* ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}
        `;
        await sock.sendMessage(msg.key.remoteJid, { text: info });
    },
    
    '.settings': async (sock, msg, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Only owner can use this command!' });
            return;
        }
        
        const settings = `
╭━━━━━━━━━━━━━━━━━━━━╮
┃ *BOT SETTINGS*         
╰━━━━━━━━━━━━━━━━━━━━╯

🤖 *Mode:* ${config.mode}
📖 *Auto Read:* ${config.autoRead ? 'ON' : 'OFF'}
⌨️ *Auto Typing:* ${config.autoTyping ? 'ON' : 'OFF'}
📞 *Anti Call:* ${config.antiCall ? 'ON' : 'OFF'}
🗑️ *Anti Delete:* ${config.antiDelete ? 'ON' : 'OFF'}
👋 *Welcome:* ${config.welcomeMessage ? 'ON' : 'OFF'}
👋 *Goodbye:* ${config.goodbyeMessage ? 'ON' : 'OFF'}
        `;
        await sock.sendMessage(msg.key.remoteJid, { text: settings });
    },
    
    '.mode': async (sock, msg, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Only owner can use this command!' });
            return;
        }
        
        if (!args[0] || (args[0] !== 'public' && args[0] !== 'private')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Please use: .mode public or .mode private' });
            return;
        }
        
        config.mode = args[0];
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ Mode changed to: ${config.mode}` });
    },
    
    '.autoread': async (sock, msg, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Only owner can use this command!' });
            return;
        }
        
        if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Please use: .autoread on or .autoread off' });
            return;
        }
        
        config.autoRead = args[0] === 'on';
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ Auto Read: ${config.autoRead ? 'ON' : 'OFF'}` });
    },
    
    '.anticall': async (sock, msg, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Only owner can use this command!' });
            return;
        }
        
        if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Please use: .anticall on or .anticall off' });
            return;
        }
        
        config.antiCall = args[0] === 'on';
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ Anti Call: ${config.antiCall ? 'ON' : 'OFF'}` });
    },
    
    '.broadcast': async (sock, msg, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Only owner can use this command!' });
            return;
        }
        
        if (!args[0]) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Please provide a message to broadcast!' });
            return;
        }
        
        const broadcastMsg = args.join(' ');
        // This would require storing all chats - for now just a placeholder
        await sock.sendMessage(msg.key.remoteJid, { text: `📢 Broadcast: ${broadcastMsg}` });
    }
};

// ============ MESSAGE HANDLER ============
async function handleMessage(sock, message) {
    try {
        if (!message.message) return;
        
        const sender = message.key.remoteJid;
        const text = message.message.conversation || 
                     message.message.extendedTextMessage?.text || 
                     message.message.imageMessage?.caption || '';
        
        if (!text) return;
        
        const cmd = text.split(' ')[0].toLowerCase();
        const args = text.slice(cmd.length).trim().split(' ');
        
        // Anti-call handling
        if (config.antiCall && message.message.call) {
            await sock.sendMessage(sender, { text: '📞 Anti-call is active! Please text only.' });
            return;
        }
        
        // Auto read
        if (config.autoRead && !sender.includes('g.us')) {
            await sock.readMessages([message.key]);
        }
        
        // Auto typing
        if (config.autoTyping && !sender.includes('g.us')) {
            await sock.sendPresenceUpdate('composing', sender);
            setTimeout(() => {
                sock.sendPresenceUpdate('paused', sender);
            }, 2000);
        }
        
        // Cooldown check
        if (cooldown.has(sender)) {
            const last = cooldown.get(sender);
            if (Date.now() - last < config.cooldown) {
                return;
            }
        }
        
        // Private mode check
        if (config.mode === 'private' && !isOwner(sender)) {
            await sock.sendMessage(sender, { text: '❌ Bot is in private mode. Only owner can use.' });
            return;
        }
        
        // Execute command
        if (commands[cmd]) {
            cooldown.set(sender, Date.now());
            await commands[cmd](sock, message, args, sender);
        }
        
    } catch (error) {
        console.error(chalk.red(`Message error: ${error.message}`));
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
            keepAliveIntervalMs: 10000,
            syncFullHistory: false,
            markOnlineOnConnect: true
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
                        console.log(chalk.red('❌ Max reconnects reached. Please restart.'));
                        process.exit(1);
                    }
                } else {
                    console.log(chalk.red('❌ Logged out. Please use web interface to pair again.'));
                }
            } 
            else if (connection === 'open') {
                reconnectAttempts = 0;
                console.log(chalk.green(`\n✅ Bot Online!`));
                console.log(chalk.cyan(`🤖 Bot Name: ${config.botName}`));
                console.log(chalk.cyan(`📱 Number: ${sock.user.id.split(':')[0]}`));
                console.log(chalk.cyan(`🌐 Web Interface: http://localhost:${PORT}\n`));
            }
        });
        
        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                await handleMessage(sock, msg);
            }
        });
        
        // Auto pair if PAIRING_NUMBER is set in env
        const autoPairNumber = process.env.AUTO_PAIR_NUMBER;
        if (autoPairNumber && !sock.authState.creds.registered) {
            console.log(chalk.yellow(`\n📱 Auto-pairing for: ${autoPairNumber}`));
            await delay(3000);
            try {
                const code = await sock.requestPairingCode(autoPairNumber);
                console.log(chalk.green(`✅ PAIRING CODE: ${code}`));
                console.log(chalk.cyan(`🔗 Enter this code in WhatsApp > Settings > Linked Devices\n`));
            } catch (error) {
                console.log(chalk.red(`❌ Auto-pair failed: ${error.message}`));
            }
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

// Keep alive log every 5 minutes
setInterval(() => {
    if (sock?.user) {
        console.log(chalk.dim(`[${formatTime()}] Bot running | ${sock.user.id.split(':')[0]}`));
    } else {
        console.log(chalk.dim(`[${formatTime()}] Bot connecting...`));
    }
}, 300000);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Shutting down...'));
    if (sock) {
        await sock.logout();
    }
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.log(chalk.red(`Uncaught Exception: ${error.message}`));
});

process.on('unhandledRejection', (error) => {
    console.log(chalk.red(`Unhandled Rejection: ${error.message}`));
});
