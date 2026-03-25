/* 
╔═══════════════════════════════════════════════╗
║     WHATSAPP BOT BY HJ-HACKER                 ║
║     PAIRING CODE BASED AUTHENTICATION        ║
╚═══════════════════════════════════════════════╝
*/

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestVersion, makeInMemoryStore, jidDecode, downloadContentFromMessage, generateWAMessageFromContent, proto, Browsers } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment-timezone');
const chalk = require('chalk');
const gradient = require('gradient-string');
const express = require('express');  // Added for health check
const { exec } = require('child_process');
const qrcode = require('qrcode-terminal');
const readline = require('readline');

// ============ EXPRESS SERVER FOR HEALTH CHECK ============
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        bot: 'HJ-HACKER WhatsApp Bot',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'HJ-HACKER WhatsApp Bot is running',
        status: 'active',
        version: '1.0.0'
    });
});

// Start express server
app.listen(PORT, () => {
    console.log(chalk.blue(`✅ Health check server running on port ${PORT}`));
});

// ============ CONFIGURATION ============
const config = {
    // Bot Settings
    botName: 'HJ-HACKER',
    ownerNumber: process.env.OWNER_NUMBER || '923266571331',
    ownerName: 'HJ-HACKER',
    version: '1.0.0',
    
    // API Settings
    apiUrl: process.env.API_URL || 'https://whatsapp-auth-api-production.up.railway.app',
    
    // Channel Link
    channelLink: 'https://whatsapp.com/channel/0029VbAaNJ6C1FuB0mIAx93M',
    
    // Bot Mode
    mode: 'public', // public or private
    
    // Auto Features
    autoRead: false,
    autoTyping: false,
    autoReact: false,
    antiCall: true,
    antiDelete: false,
    
    // Group Settings
    welcomeMessage: true,
    goodbyeMessage: true,
    antiLink: false,
    antiBadWord: false,
    
    // Cooldown
    cooldown: 5000 // 5 seconds
};

// Colors for console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Print Banner
console.log(gradient.rainbow(`
╔═══════════════════════════════════════════════╗
║     WHATSAPP BOT BY HJ-HACKER                 ║
║     VERSION: ${config.version}                         ║
║     OWNER: ${config.ownerName}                  ║
║     PAIRING CODE BASED                         ║
╚═══════════════════════════════════════════════╝
`));

// Create readline interface for pairing code input (for local)
let rl;
if (!process.env.RAILWAY_ENVIRONMENT) {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

// ============ BOT STATE ============
const sessions = new Map();
const groupSettings = new Map();
const userWarnings = new Map();
const cooldown = new Map();

// ============ HELPER FUNCTIONS ============
function formatTime() {
    return moment().tz('Asia/Karachi').format('HH:mm:ss');
}

function formatDate() {
    return moment().tz('Asia/Karachi').format('DD/MM/YYYY');
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isOwner(number) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    return cleanNumber === config.ownerNumber;
}

function isAdmin(jid, user, groupMetadata) {
    const participants = groupMetadata.participants;
    const participant = participants.find(p => p.id === user);
    return participant?.admin === 'admin' || participant?.admin === 'superadmin';
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

async function getBotStatus() {
    try {
        const response = await axios.get(`${config.apiUrl}/health`);
        return response.data;
    } catch (error) {
        return null;
    }
}

// ============ DOWNLOAD FUNCTIONS ============
async function searchYouTube(query) {
    try {
        const yts = require('yt-search');
        const result = await yts(query);
        return result.videos[0];
    } catch (error) {
        return null;
    }
}

async function downloadYouTube(url, type = 'audio') {
    try {
        const ytdl = require('ytdl-core');
        const info = await ytdl.getInfo(url);
        if (type === 'audio') {
            const audioStream = ytdl(url, { quality: 'highestaudio' });
            return { stream: audioStream, title: info.videoDetails.title };
        } else {
            const videoStream = ytdl(url, { quality: 'highestvideo' });
            return { stream: videoStream, title: info.videoDetails.title };
        }
    } catch (error) {
        return null;
    }
}

// ============ COMMANDS ============
const commands = {
    '.help': async (sock, message, args, sender) => {
        const menu = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃    *${config.botName} BOT MENU*        
┃    *Version:* ${config.version}         
┃    *Owner:* ${config.ownerName}        
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *🛡️ GENERAL COMMANDS*          
┃  • .help or .menu              
┃  • .ping                       
┃  • .owner                      
┃  • .joke                       
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *👮‍♂️ GROUP COMMANDS*            
┃  • .ban @user                  
┃  • .promote @user              
┃  • .demote @user               
┃  • .kick @user                 
┃  • .tagall                     
┃  • .hidetag <message>          
┃  • .groupinfo                  
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *🔒 OWNER COMMANDS*            
┃  • .mode <public/private>      
┃  • .autoread <on/off>          
┃  • .anticall <on/off>          
┃  • .settings                   
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *📥 DOWNLOADER*                
┃  • .play <song name>           
┃  • .song <song name>           
┃  • .instagram <link>           
┃  • .tiktok <link>              
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *📢 JOIN OUR CHANNEL*          
┃  ${config.channelLink}           
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

*© Powered by ${config.botName}*
        `;
        await sock.sendMessage(message.key.remoteJid, { text: menu });
    },
    
    '.menu': async (sock, message, args, sender) => {
        await commands['.help'](sock, message, args, sender);
    },
    
    '.ping': async (sock, message, args, sender) => {
        const start = Date.now();
        await sock.sendMessage(message.key.remoteJid, { text: '🏓 Pong!' });
        const end = Date.now();
        // Just send response
    },
    
    '.owner': async (sock, message, args, sender) => {
        const vcard = 'BEGIN:VCARD\n' +
                      'VERSION:3.0\n' +
                      `FN:${config.ownerName}\n` +
                      `TEL;type=CELL;type=VOICE;waid=${config.ownerNumber}:${config.ownerNumber}\n` +
                      'END:VCARD';
        await sock.sendMessage(message.key.remoteJid, {
            contacts: { displayName: config.ownerName, contacts: [{ vcard }] }
        });
    },
    
    '.joke': async (sock, message, args, sender) => {
        const jokes = [
            'Why don\'t scientists trust atoms? Because they make up everything!',
            'Why did the scarecrow win an award? He was outstanding in his field!'
        ];
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        await sock.sendMessage(message.key.remoteJid, { text: randomJoke });
    },
    
    '.tagall': async (sock, message, args, sender) => {
        if (!message.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Group command only!' });
            return;
        }
        const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
        const participants = groupMetadata.participants;
        let mentions = participants.map(p => p.id);
        let text = args.join(' ') || 'Attention everyone!';
        await sock.sendMessage(message.key.remoteJid, { text, mentions });
    },
    
    '.groupinfo': async (sock, message, args, sender) => {
        if (!message.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Group command only!' });
            return;
        }
        const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
        const info = `
📛 *Name:* ${groupMetadata.subject}
👥 *Members:* ${groupMetadata.participants.length}
👑 *Owner:* ${groupMetadata.owner || 'Unknown'}
        `;
        await sock.sendMessage(message.key.remoteJid, { text: info });
    },
    
    '.play': async (sock, message, args, sender) => {
        if (!args[0]) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Song name required!' });
            return;
        }
        await sock.sendMessage(message.key.remoteJid, { text: `🎵 Searching...` });
    },
    
    '.settings': async (sock, message, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Owner only!' });
            return;
        }
        const settings = `
🤖 Mode: ${config.mode}
📖 Auto Read: ${config.autoRead ? 'ON' : 'OFF'}
📞 Anti Call: ${config.antiCall ? 'ON' : 'OFF'}
        `;
        await sock.sendMessage(message.key.remoteJid, { text: settings });
    }
};

// ============ CONNECT TO WHATSAPP ============
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.macOS('Desktop'),
        version: [2, 3000, 1015901307]
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log(chalk.yellow('🔄 Reconnecting...'));
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`\n✅ Bot is online!`));
            console.log(chalk.cyan(`🤖 Bot Name: ${config.botName}`));
            console.log(chalk.cyan(`👤 Owner: ${config.ownerName}\n`));
        }
    });
    
    // Handle pairing for Railway (using env variable)
    const pairingNumber = process.env.PAIRING_NUMBER;
    if (pairingNumber) {
        console.log(chalk.yellow(`\n⏳ Requesting pairing code for ${pairingNumber}...`));
        await delay(5000);
        try {
            const code = await sock.requestPairingCode(pairingNumber);
            console.log(chalk.green(`\n✅ PAIRING CODE: ${code}`));
            console.log(chalk.white(`\nEnter this code in WhatsApp Linked Devices\n`));
        } catch (error) {
            console.log(chalk.red(`❌ Pairing failed:`, error.message));
        }
    } else if (rl) {
        // Local mode: ask for number
        rl.question(chalk.green('Enter WhatsApp number: '), async (number) => {
            const cleanNumber = number.replace(/[^0-9]/g, '');
            await delay(3000);
            try {
                const code = await sock.requestPairingCode(cleanNumber);
                console.log(chalk.green(`\n✅ PAIRING CODE: ${code}\n`));
            } catch (error) {
                console.log(chalk.red(`❌ Failed:`, error.message));
            }
        });
    }
    
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const message of messages) {
            if (!message.message) continue;
            const text = message.message.conversation || 
                        message.message.extendedTextMessage?.text || '';
            if (!text) continue;
            
            const cmd = text.split(' ')[0].toLowerCase();
            const args = text.slice(cmd.length).trim().split(' ');
            const sender = message.key.remoteJid;
            
            if (commands[cmd]) {
                await commands[cmd](sock, message, args, sender);
            }
        }
    });
    
    return sock;
}

// ============ START BOT ============
console.log(chalk.blue('🚀 Starting WhatsApp Bot...\n'));
connectToWhatsApp().catch(console.error);
