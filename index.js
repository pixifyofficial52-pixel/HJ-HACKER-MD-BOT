const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const P = require('pino');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const moment = require('moment-timezone');
const fs = require('fs');

// Fix crypto
global.crypto = crypto;

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.json());
app.use(express.static('public'));

// ============ BOT CONFIG ============
const config = {
    botName: 'HJ-HACKER',
    ownerNumber: '923266571331',
    ownerName: 'HJ-HACKER',
    version: '1.0.0',
    channelLink: 'https://whatsapp.com/channel/0029VbAaNJ6C1FuB0mIAx93M',
    mode: 'public',
    autoRead: false,
    antiCall: true,
    cooldown: 3000
};

// ============ COMMANDS ============
const commands = {
    // General Commands
    '.help': async (sock, msg, args, sender) => {
        const menu = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃    *${config.botName} BOT MENU*        
┃    *Version:* ${config.version}         
┃    *Owner:* ${config.ownerName}        
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *🛡️ GENERAL COMMANDS*          
┃  • .help - Show this menu
┃  • .ping - Check bot status
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
┃  • .anticall <on/off>
┃  • .settings - Show settings
┃  • .broadcast <msg> - Broadcast
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  *🖼️ ANIME/STICKER*            
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

*© Powered by ${config.botName}*`;
        await sock.sendMessage(msg.key.remoteJid, { text: menu });
    },
    
    '.menu': async (sock, msg, args, sender) => {
        await commands['.help'](sock, msg, args, sender);
    },
    
    '.ping': async (sock, msg, args, sender) => {
        const start = Date.now();
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
            'What do you call a fake noodle? An impasta!',
            'Why did the bicycle fall over? Because it was two-tired!',
            'What do you call a bear with no teeth? A gummy bear!'
        ];
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        await sock.sendMessage(msg.key.remoteJid, { text: randomJoke });
    },
    
    '.time': async (sock, msg, args, sender) => {
        const time = moment().tz('Asia/Karachi').format('hh:mm:ss A');
        await sock.sendMessage(msg.key.remoteJid, { text: `🕐 Time: ${time}` });
    },
    
    '.date': async (sock, msg, args, sender) => {
        const date = moment().tz('Asia/Karachi').format('DD/MM/YYYY');
        await sock.sendMessage(msg.key.remoteJid, { text: `📅 Date: ${date}` });
    },
    
    '.tagall': async (sock, msg, args, sender) => {
        if (!msg.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Group command only!' });
            return;
        }
        try {
            const metadata = await sock.groupMetadata(msg.key.remoteJid);
            const mentions = metadata.participants.map(p => p.id);
            const text = args.join(' ') || '📢 Attention everyone!';
            await sock.sendMessage(msg.key.remoteJid, { text, mentions });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to tag all' });
        }
    },
    
    '.hidetag': async (sock, msg, args, sender) => {
        if (!msg.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Group command only!' });
            return;
        }
        try {
            const text = args.join(' ') || 'Hidden tag message';
            const metadata = await sock.groupMetadata(msg.key.remoteJid);
            const mentions = metadata.participants.map(p => p.id);
            await sock.sendMessage(msg.key.remoteJid, { text, mentions });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed' });
        }
    },
    
    '.groupinfo': async (sock, msg, args, sender) => {
        if (!msg.key.remoteJid.includes('g.us')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Group command only!' });
            return;
        }
        try {
            const metadata = await sock.groupMetadata(msg.key.remoteJid);
            const info = `📛 *Name:* ${metadata.subject}\n🆔 *ID:* ${metadata.id}\n👥 *Members:* ${metadata.participants.length}\n👑 *Owner:* ${metadata.owner || 'Unknown'}`;
            await sock.sendMessage(msg.key.remoteJid, { text: info });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed' });
        }
    },
    
    '.settings': async (sock, msg, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner only!' });
            return;
        }
        const settings = `╭━━━━━━━━━━━━━━━━━━━━╮
┃ *BOT SETTINGS*         
╰━━━━━━━━━━━━━━━━━━━━╯

🤖 Mode: ${config.mode}
📖 Auto Read: ${config.autoRead ? 'ON' : 'OFF'}
📞 Anti Call: ${config.antiCall ? 'ON' : 'OFF'}
⏱️ Cooldown: ${config.cooldown/1000}s`;
        await sock.sendMessage(msg.key.remoteJid, { text: settings });
    },
    
    '.mode': async (sock, msg, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner only!' });
            return;
        }
        if (!args[0] || (args[0] !== 'public' && args[0] !== 'private')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Use: .mode public or .mode private' });
            return;
        }
        config.mode = args[0];
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ Mode: ${config.mode}` });
    },
    
    '.autoread': async (sock, msg, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner only!' });
            return;
        }
        if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Use: .autoread on or .autoread off' });
            return;
        }
        config.autoRead = args[0] === 'on';
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ Auto Read: ${config.autoRead ? 'ON' : 'OFF'}` });
    },
    
    '.anticall': async (sock, msg, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner only!' });
            return;
        }
        if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Use: .anticall on or .anticall off' });
            return;
        }
        config.antiCall = args[0] === 'on';
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ Anti Call: ${config.antiCall ? 'ON' : 'OFF'}` });
    },
    
    '.broadcast': async (sock, msg, args, sender) => {
        if (!isOwner(sender)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Owner only!' });
            return;
        }
        if (!args[0]) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Message required!' });
            return;
        }
        const broadcastMsg = args.join(' ');
        await sock.sendMessage(msg.key.remoteJid, { text: `📢 Broadcast: ${broadcastMsg}` });
    },
    
    '.kiss': async (sock, msg, args, sender) => {
        await sock.sendMessage(msg.key.remoteJid, { text: '💋 *Sending you a kiss!* 💋' });
    },
    
    '.hug': async (sock, msg, args, sender) => {
        await sock.sendMessage(msg.key.remoteJid, { text: '🤗 *Sending you a warm hug!* 🤗' });
    },
    
    '.slap': async (sock, msg, args, sender) => {
        await sock.sendMessage(msg.key.remoteJid, { text: '👋 *SLAP!* 👋' });
    },
    
    '.pat': async (sock, msg, args, sender) => {
        await sock.sendMessage(msg.key.remoteJid, { text: '🫱 *Pat pat!* 🫱' });
    },
    
    '.cry': async (sock, msg, args, sender) => {
        await sock.sendMessage(msg.key.remoteJid, { text: '😭 *Don\'t cry!* 😭' });
    },
    
    '.wink': async (sock, msg, args, sender) => {
        await sock.sendMessage(msg.key.remoteJid, { text: '😉 *Wink wink!* 😉' });
    }
};

// ============ HELPER FUNCTIONS ============
function isOwner(number) {
    const clean = number.replace(/[^0-9]/g, '');
    return clean === config.ownerNumber;
}

function formatTime() {
    return moment().tz('Asia/Karachi').format('HH:mm:ss');
}

// Cooldown map
const cooldown = new Map();

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
        
        // Anti-call
        if (config.antiCall && message.message.call) {
            await sock.sendMessage(sender, { text: '📞 Anti-call active! Please text only.' });
            return;
        }
        
        // Auto read
        if (config.autoRead && !sender.includes('g.us')) {
            await sock.readMessages([message.key]);
        }
        
        // Cooldown
        if (cooldown.has(sender)) {
            if (Date.now() - cooldown.get(sender) < config.cooldown) return;
        }
        
        // Private mode
        if (config.mode === 'private' && !isOwner(sender)) {
            await sock.sendMessage(sender, { text: '❌ Private mode. Only owner can use.' });
            return;
        }
        
        // Execute command
        if (commands[cmd]) {
            cooldown.set(sender, Date.now());
            await commands[cmd](sock, message, args, sender);
        }
        
    } catch (error) {
        console.error('Message error:', error.message);
    }
}

// ============ WEB ENDPOINTS ============
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        bot: config.botName,
        connected: sock ? true : false,
        time: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/pair', async (req, res) => {
    const number = req.query.number;
    if (!number) {
        return res.json({ error: 'Number required' });
    }
    
    let cleanNumber = number.replace(/[^0-9]/g, '');
    
    try {
        if (!sock) {
            return res.json({ error: 'Bot connecting, please wait...' });
        }
        
        const code = await sock.requestPairingCode(cleanNumber);
        console.log(`✅ Pairing code for ${cleanNumber}: ${code}`);
        res.json({ code: code });
        
    } catch (error) {
        console.error('Pairing error:', error.message);
        res.json({ error: error.message });
    }
});

// ============ BOT CONNECTION ============
let sock = null;
let reconnectCount = 0;

async function connect() {
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
        
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                console.log('\n✅ ================================');
                console.log(`✅ ${config.botName} Bot Online!`);
                console.log(`✅ Number: ${sock.user.id.split(':')[0]}`);
                console.log(`✅ Mode: ${config.mode}`);
                console.log('✅ ================================\n');
                reconnectCount = 0;
            }
            
            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                if (code !== DisconnectReason.loggedOut) {
                    console.log('⚠️ Disconnected, reconnecting...');
                    setTimeout(connect, 5000);
                } else {
                    console.log('❌ Logged out. Use web interface to pair again.');
                }
            }
        });
        
        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                await handleMessage(sock, msg);
            }
        });
        
    } catch (error) {
        console.log('❌ Connection error:', error.message);
        setTimeout(connect, 10000);
    }
}

// ============ START SERVER & BOT ============
app.listen(PORT, () => {
    console.log(`\n🌐 Web Interface: http://localhost:${PORT}`);
    console.log(`🔗 Pairing URL: http://localhost:${PORT}/pair?number=923266571331`);
    console.log(`📊 Health Check: http://localhost:${PORT}/health\n`);
});

console.log('🚀 Starting HJ-HACKER Bot...\n');
connect();
