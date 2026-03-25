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
const { exec } = require('child_process');
const qrcode = require('qrcode-terminal');
const readline = require('readline');

// ============ CONFIGURATION ============
const config = {
    // Bot Settings
    botName: 'HJ-HACKER',
    ownerNumber: '923266571331',
    ownerName: 'HJ-HACKER',
    version: '1.0.0',
    
    // API Settings
    apiUrl: 'https://whatsapp-auth-api-production.up.railway.app',
    
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

// Create readline interface for pairing code input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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
┃  • .ss <link>                  
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
┃  • .welcome <on/off>           
┃  • .goodbye <on/off>           
┃  • .antilink <on/off>          
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *🔒 OWNER COMMANDS*            
┃  • .mode <public/private>      
┃  • .autoread <on/off>          
┃  • .autotyping <on/off>        
┃  • .autoreact <on/off>         
┃  • .anticall <on/off>          
┃  • .setpp (reply to image)     
┃  • .settings                   
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *📥 DOWNLOADER*                
┃  • .play <song name>           
┃  • .song <song name>           
┃  • .instagram <link>           
┃  • .facebook <link>            
┃  • .tiktok <link>              
┃  • .ytmp4 <link>               
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *🖼️ ANIME COMMANDS*            
┃  • .kiss                       
┃  • .hug                        
┃  • .slap                       
┃  • .pat                        
┃  • .cry                        
┃  • .wink                       
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
        const msg = await sock.sendMessage(message.key.remoteJid, { text: '🏓 Pinging...' });
        const end = Date.now();
        await sock.sendMessage(message.key.remoteJid, { text: `🏓 Pong! ${end - start}ms` });
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
            'Why did the scarecrow win an award? He was outstanding in his field!',
            'Why don\'t eggs tell jokes? They\'d crack each other up!',
            'What do you call a fake noodle? An impasta!'
        ];
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        await sock.sendMessage(message.key.remoteJid, { text: randomJoke });
    },
    
    '.tagall': async (sock, message, args, sender) => {
        if (!message.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ This command can only be used in groups!' });
            return;
        }
        const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
        const participants = groupMetadata.participants;
        let tagText = args.join(' ') || 'Attention everyone!';
        let mentions = [];
        for (let participant of participants) {
            mentions.push(participant.id);
        }
        await sock.sendMessage(message.key.remoteJid, { text: tagText, mentions });
    },
    
    '.hidetag': async (sock, message, args, sender) => {
        if (!message.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ This command can only be used in groups!' });
            return;
        }
        const text = args.join(' ') || 'Hidden tag message';
        const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
        const participants = groupMetadata.participants;
        let mentions = [];
        for (let participant of participants) {
            mentions.push(participant.id);
        }
        await sock.sendMessage(message.key.remoteJid, { text, mentions });
    },
    
    '.groupinfo': async (sock, message, args, sender) => {
        if (!message.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ This command can only be used in groups!' });
            return;
        }
        const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
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
        await sock.sendMessage(message.key.remoteJid, { text: info });
    },
    
    '.play': async (sock, message, args, sender) => {
        if (!args[0]) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Please provide a song name!' });
            return;
        }
        const query = args.join(' ');
        await sock.sendMessage(message.key.remoteJid, { text: `🎵 Searching for: ${query}...` });
        
        const video = await searchYouTube(query);
        if (!video) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ No results found!' });
            return;
        }
        
        const audio = await downloadYouTube(video.url, 'audio');
        if (!audio) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Failed to download audio!' });
            return;
        }
        
        await sock.sendMessage(message.key.remoteJid, {
            audio: { stream: audio.stream },
            mimetype: 'audio/mpeg',
            fileName: `${audio.title}.mp3`,
            caption: `🎵 *${audio.title}*\n📥 Downloaded by ${config.botName}`
        });
    },
    
    '.song': async (sock, message, args, sender) => {
        await commands['.play'](sock, message, args, sender);
    },
    
    '.kiss': async (sock, message, args, sender) => {
        await sock.sendMessage(message.key.remoteJid, { text: '💋 *Sending kisses!* 💋' });
    },
    
    '.hug': async (sock, message, args, sender) => {
        await sock.sendMessage(message.key.remoteJid, { text: '🤗 *Sending virtual hugs!* 🤗' });
    },
    
    '.slap': async (sock, message, args, sender) => {
        await sock.sendMessage(message.key.remoteJid, { text: '👋 *SLAP!* 👋' });
    },
    
    '.settings': async (sock, message, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Only owner can use this command!' });
            return;
        }
        const settings = `
╭━━━━━━━━━━━━━━━━━━━━╮
┃ *BOT SETTINGS*         
╰━━━━━━━━━━━━━━━━━━━━╯

🤖 *Mode:* ${config.mode}
📖 *Auto Read:* ${config.autoRead ? 'ON' : 'OFF'}
⌨️ *Auto Typing:* ${config.autoTyping ? 'ON' : 'OFF'}
❤️ *Auto React:* ${config.autoReact ? 'ON' : 'OFF'}
📞 *Anti Call:* ${config.antiCall ? 'ON' : 'OFF'}
🔗 *Anti Link:* ${config.antiLink ? 'ON' : 'OFF'}
👋 *Welcome:* ${config.welcomeMessage ? 'ON' : 'OFF'}
👋 *Goodbye:* ${config.goodbyeMessage ? 'ON' : 'OFF'}
        `;
        await sock.sendMessage(message.key.remoteJid, { text: settings });
    },
    
    '.mode': async (sock, message, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Only owner can use this command!' });
            return;
        }
        if (!args[0] || (args[0] !== 'public' && args[0] !== 'private')) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Please use: .mode public or .mode private' });
            return;
        }
        config.mode = args[0];
        await sock.sendMessage(message.key.remoteJid, { text: `✅ Mode changed to: ${config.mode}` });
    },
    
    '.autoread': async (sock, message, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Only owner can use this command!' });
            return;
        }
        if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Please use: .autoread on or .autoread off' });
            return;
        }
        config.autoRead = args[0] === 'on';
        await sock.sendMessage(message.key.remoteJid, { text: `✅ Auto Read: ${config.autoRead ? 'ON' : 'OFF'}` });
    },
    
    '.anticall': async (sock, message, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Only owner can use this command!' });
            return;
        }
        if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
            await sock.sendMessage(message.key.remoteJid, { text: '❌ Please use: .anticall on or .anticall off' });
            return;
        }
        config.antiCall = args[0] === 'on';
        await sock.sendMessage(message.key.remoteJid, { text: `✅ Anti Call: ${config.antiCall ? 'ON' : 'OFF'}` });
    }
};

// ============ PAIRING CODE HANDLER ============
async function requestPairingCode(sock, phoneNumber) {
    try {
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(chalk.green(`\n✅ Pairing code generated successfully!`));
        console.log(chalk.yellow(`📱 Phone Number: ${phoneNumber}`));
        console.log(chalk.cyan(`🔑 Pairing Code: ${code}`));
        console.log(chalk.white(`📝 Enter this code in WhatsApp Linked Devices section\n`));
        return code;
    } catch (error) {
        console.error(chalk.red(`❌ Failed to generate pairing code:`, error.message));
        return null;
    }
}

// ============ CONNECT TO WHATSAPP ============
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false, // Disable QR code
        auth: state,
        browser: Browsers.macOS('Desktop'),
        version: [2, 3000, 1015901307]
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    // Handle pairing code request
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log(chalk.yellow('🔄 Reconnecting...'));
                connectToWhatsApp();
            } else {
                console.log(chalk.red('❌ Logged out, please restart bot'));
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`\n✅ Bot is online!`));
            console.log(chalk.cyan(`🤖 Bot Name: ${config.botName}`));
            console.log(chalk.cyan(`👤 Owner: ${config.ownerName}`));
            console.log(chalk.cyan(`📱 Number: ${sock.user.id.split(':')[0]}\n`));
        }
    });
    
    // Ask for pairing code
    console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.yellow('📱 WHATSAPP PAIRING SETUP'));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    
    rl.question(chalk.green('Enter your WhatsApp number (with country code, e.g., 923266571331): '), async (number) => {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        
        if (!cleanNumber) {
            console.log(chalk.red('❌ Invalid number!'));
            process.exit(1);
        }
        
        console.log(chalk.yellow(`\n⏳ Requesting pairing code for ${cleanNumber}...`));
        
        // Wait for socket to be ready
        await delay(3000);
        
        try {
            const code = await sock.requestPairingCode(cleanNumber);
            console.log(chalk.green(`\n✅ Pairing code generated successfully!`));
            console.log(chalk.cyan(`\n🔑 YOUR PAIRING CODE: ${code}`));
            console.log(chalk.white(`\n📝 Steps to pair:`));
            console.log(chalk.white(`   1. Open WhatsApp on your phone`));
            console.log(chalk.white(`   2. Go to Settings → Linked Devices`));
            console.log(chalk.white(`   3. Tap on "Link a Device"`));
            console.log(chalk.white(`   4. Enter this code: ${code}`));
            console.log(chalk.blue(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));
        } catch (error) {
            console.log(chalk.red(`❌ Failed to get pairing code:`, error.message));
            console.log(chalk.yellow(`\n🔄 Retrying in 5 seconds...`));
            await delay(5000);
            process.exit(1);
        }
    });
    
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const message of messages) {
            await handleMessage(sock, message);
        }
    });
    
    return sock;
}

// ============ MESSAGE HANDLER ============
async function handleMessage(sock, message) {
    try {
        if (!message.message) return;
        
        const sender = message.key.remoteJid;
        const text = message.message.conversation || 
                     message.message.extendedTextMessage?.text || 
                     message.message.imageMessage?.caption || '';
        
        if (!text) return;
        
        // Check if command
        const cmd = text.split(' ')[0].toLowerCase();
        const args = text.slice(cmd.length).trim().split(' ');
        
        // Anti-call handling
        if (config.antiCall && message.message.call) {
            await sock.sendMessage(sender, { text: '📞 Anti-call is active! Please text only.' });
            return;
        }
        
        // Auto read
        if (config.autoRead && message.key.remoteJid) {
            await sock.readMessages([message.key]);
        }
        
        // Auto typing
        if (config.autoTyping) {
            await sock.sendPresenceUpdate('composing', sender);
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
        console.error('Error handling message:', error);
    }
}

// ============ START BOT ============
connectToWhatsApp().catch(console.error);
