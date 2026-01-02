/**
 * Claude Nudge - Single run script for GitHub Actions
 */
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

async function nudge() {
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ ANTHROPIC_API_KEY not found in .env');
        process.exit(1);
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    console.log('🚀 Sending nudge to Claude...');

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 50,
            messages: [{ role: 'user', content: 'hi' }]
        });

        const reply = response.content[0]?.text || '';
        console.log(`✅ Nudge sent! Claude replied: "${reply}"`);
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

nudge();
