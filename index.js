const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { GoogleGenerativeAI } = require("@google/generative-ai");
const collectBlock = require('mineflayer-collectblock').plugin
const toolPlugin = require('mineflayer-tool').plugin
const { sense } = require('./agent_logic')

// --- AI Configuration ---
const genAI = new GoogleGenerativeAI("AIzaSyAQsaKY12g9teuuWgsNBVt-wxSWyrIZnWY");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

const bot = mineflayer.createBot({
    host: '26.30.210.81',
    port: 25565,
    username: 'PedroERX',
    version: false,
    auth: 'offline'
})

bot.loadPlugin(pathfinder)
bot.loadPlugin(collectBlock)
bot.loadPlugin(toolPlugin)

let autonomousMode = false;

bot.on('spawn', () => {
    console.log('Joined the server as ' + bot.username)
    bot.chat('Hello world! I am PedroERX, an AI-powered bot.')

    const defaultMove = new Movements(bot)
    bot.pathfinder.setMovements(defaultMove)

    // Start Autonomous Loop
    setInterval(async () => {
        if (!autonomousMode) return;
        if (bot.pathfinder.isMoving()) return; // Don't interrupt movement

        // Simple check to see if we are doing something
        const state = await sense(bot);
        console.log("Current State:", state);

        // Ask AI what to do
        try {
            const session = await getChatSession();
            // Send a system-like message to prompt action
            const result = await session.sendMessage(`
Current Status:
${state}

What should I do? Reply with a command or just a thought.
            `);
            const response = await result.response;
            const text = response.text();
            console.log("AI Decision:", text);

            // Execute the decision
            executeCommand(text, null);

        } catch (e) {
            console.error("Auto Loop Error:", e.message);
        }
    }, 10000); // Check every 10 seconds
})

// Persistent chat session
let chatSession = null;

async function getChatSession() {
    if (!chatSession) {
        chatSession = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{
                        text: `You are a Minecraft bot named PedroERX. You are helpful, friendly, and brief.
You have a physical body in the game. You can control it using these commands in your response:
- #goto x y z : Move to coordinates.
- #follow username : Follow a player.
- #stop : Stop moving/following.
- #come : Go to the player you are talking to.
- #mine block_name : Find and mine a block (e.g., #mine oak_log, #mine iron_ore).

Example: "I need wood. #mine oak_log" or "Coming! #come".
Do not use commands if you just want to talk.
` }],
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I am PedroERX. I can talk, move, and mine blocks using commands." }],
                },
            ],
            generationConfig: {
                maxOutputTokens: 100,
            },
        });
    }
    return chatSession;
}

// --- Command Parsing Function ---
async function executeCommand(text, username) {
    // Clean up response to fit Minecraft chat limits
    const cleanText = text.replace(/\n/g, ' ').substring(0, 256);

    console.log(`Bot says/thinks: ${cleanText}`);
    // Only chat if it's not a purely internal thought (autonomous) or if it has no commands
    // A simple heuristic: if it has a #command, maybe don't say the command part in chat?
    // For now, let's just say everything to be transparent.
    if (text) bot.chat(cleanText);

    // --- Command Parsing ---
    if (text.includes('#')) {
        const moveMatch = text.match(/#goto\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
        if (moveMatch) {
            const x = parseInt(moveMatch[1]);
            const y = parseInt(moveMatch[2]);
            const z = parseInt(moveMatch[3]);
            bot.chat(`Moving to ${x}, ${y}, ${z}`);
            bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z));
        }

        const followMatch = text.match(/#follow\s+(\w+)/);
        if (followMatch) {
            const targetName = followMatch[1];
            const target = bot.players[targetName]?.entity;
            if (target) {
                bot.chat(`Following ${targetName}`);
                bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true);
            } else {
                bot.chat(`I can't see ${targetName}`);
            }
        }

        const stopMatch = text.includes('#stop');
        if (stopMatch) {
            bot.chat("Stopping.");
            bot.pathfinder.setGoal(null);
            if (bot.collectBlock) bot.collectBlock.cancelTask();
        }

        const comeMatch = text.includes('#come');
        if (comeMatch && username) {
            const target = bot.players[username]?.entity;
            if (target) {
                bot.chat(`Coming to you, ${username}`);
                bot.pathfinder.setGoal(new goals.GoalFollow(target, 1), true);
            } else {
                bot.chat(`I can't see you, ${username}`);
            }
        }

        const mineMatch = text.match(/#mine\s+(\w+)/);
        if (mineMatch) {
            const blockName = mineMatch[1];
            const block = bot.findBlock({
                matching: b => b.name === blockName,
                maxDistance: 32
            });

            if (block) {
                bot.chat(`Mining ${blockName}`);
                try {
                    await bot.collectBlock.collect(block);
                } catch (err) {
                    bot.chat(`Failed to mine: ${err.message}`);
                }
            } else {
                bot.chat(`I can't find any ${blockName} nearby.`);
            }
        }
    }
}

bot.on('chat', async (username, message) => {
    if (username === bot.username) return
    console.log(`${username}: ${message}`)

    // Toggle Autonomy
    if (message.includes("activate autonomy")) {
        autonomousMode = true;
        bot.chat("Autonomous mode ENABLED. I will now think for myself.");
        return;
    }
    if (message.includes("deactivate autonomy")) {
        autonomousMode = false;
        bot.chat("Autonomous mode DISABLED. Waiting for commands.");
        return;
    }

    try {
        const session = await getChatSession();

        let text = "";
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const result = await session.sendMessage(`${username} says: ${message}`);
                const response = await result.response;
                text = response.text();
                break; // Success, exit loop
            } catch (err) {
                attempts++;
                if (err.message.includes('503') && attempts < maxAttempts) {
                    console.log(`API 503 (Attempt ${attempts}/${maxAttempts}). Retrying in 2s...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw err; // Re-throw other errors or if max attempts reached
                }
            }
        }

        executeCommand(text, username);

    } catch (e) {
        console.error("AI Error:", e.message);
        if (e.message.includes('503')) {
            bot.chat("My brain is overloaded (Servers busy). Try again in a moment.");
        }
    }
})

bot.on('kicked', console.log)
bot.on('error', console.log)

bot.on('end', () => {
    console.log('Bot disconnected')
})
