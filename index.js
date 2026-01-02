/**
 * Claude API Nudge Scheduler
 * 
 * Sends "hi" to Claude API every X hours to keep the session active.
 * 
 * Setup:
 *   1. Add your API key to .env file
 *   2. npm install
 *   3. npm start
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { exec } = require('child_process');
const readline = require('readline');

// Config
const config = {
    intervalHours: 5,
    intervalMinutes: 0,
    message: 'hi',
    model: 'claude-sonnet-4-20250514',
    sound: true,
    autoStart: true
};

// Validate API key
if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║  ⚠️  API KEY REQUIRED                                     ║
║                                                          ║
║  Edit .env file and add your key:                        ║
║  ANTHROPIC_API_KEY=sk-ant-api03-xxxxx                    ║
║                                                          ║
║  Get key at: https://console.anthropic.com/              ║
╚══════════════════════════════════════════════════════════╝
`);
    process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// State
let running = false;
let nextTime = null;
let timer = null;
let count = 0;

const log = (msg, color = '') => {
    const t = new Date().toLocaleTimeString();
    console.log(`\x1b[36m[${t}]\x1b[0m ${color}${msg}\x1b[0m`);
};

const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 3600).toString().padStart(2, '0')}:${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};

async function sendNudge() {
    log('🚀 Sending nudge...', '\x1b[32m');
    try {
        const res = await anthropic.messages.create({
            model: config.model,
            max_tokens: 50,
            messages: [{ role: 'user', content: config.message }]
        });
        count++;
        const reply = res.content[0]?.text?.substring(0, 80) || '';
        log(`✅ Nudge #${count} sent! Claude: "${reply}..."`, '\x1b[32m');
        if (config.sound) exec('powershell -Command "[console]::beep(800,150)"');
        return true;
    } catch (e) {
        log(`❌ Error: ${e.message}`, '\x1b[31m');
        return false;
    }
}

function start() {
    const ms = (config.intervalHours * 3600 + config.intervalMinutes * 60) * 1000;
    if (ms < 60000) { log('⚠️ Min 1 minute interval', '\x1b[33m'); return; }

    nextTime = Date.now() + ms;
    running = true;
    log(`⏱️ Next nudge in ${fmt(ms)} at ${new Date(nextTime).toLocaleTimeString()}`, '\x1b[32m');

    if (timer) clearTimeout(timer);

    const display = setInterval(() => {
        if (!running) { clearInterval(display); return; }
        const r = nextTime - Date.now();
        if (r > 0) process.stdout.write(`\r⏰ ${fmt(r)}   `);
    }, 1000);

    timer = setTimeout(async () => {
        clearInterval(display);
        console.log('');
        await sendNudge();
        log('🔄 Scheduling next...', '\x1b[34m');
        start();
    }, ms);
}

function stop() {
    if (timer) clearTimeout(timer);
    running = false;
    log('⏹️ Stopped', '\x1b[33m');
}

console.log(`
\x1b[35m╔═══════════════════════════════════════════════════════╗
║  ⏰ CLAUDE NUDGE SCHEDULER                              ║
║  Sends "${config.message}" to Claude every ${config.intervalHours}h ${config.intervalMinutes}m                     ║
╚═══════════════════════════════════════════════════════╝\x1b[0m

Commands: start | stop | test | set interval H M | exit
`);

// Auto-start
if (config.autoStart) {
    log('Testing API...', '\x1b[34m');
    sendNudge().then(ok => { if (ok) start(); });
}

// CLI
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = () => rl.question('\n> ', async (i) => {
    const [cmd, ...args] = i.trim().split(' ');
    switch (cmd) {
        case 'start': if (!running) start(); break;
        case 'stop': stop(); break;
        case 'test': await sendNudge(); break;
        case 'set':
            if (args[0] === 'interval') {
                config.intervalHours = parseInt(args[1]) || 0;
                config.intervalMinutes = parseInt(args[2]) || 0;
                log(`Set to ${config.intervalHours}h ${config.intervalMinutes}m`, '\x1b[32m');
            }
            break;
        case 'exit': case 'quit': process.exit(0);
        default: if (cmd) log('Commands: start | stop | test | set interval H M | exit');
    }
    prompt();
});
prompt();

process.on('SIGINT', () => { stop(); process.exit(0); });
