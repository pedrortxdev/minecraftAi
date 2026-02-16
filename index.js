const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const OpenAI = require("openai");
const collectBlock = require('mineflayer-collectblock').plugin
const toolPlugin = require('mineflayer-tool').plugin
const { sense } = require('./agent_logic')

// --- AI Configuration ---
const openai = new OpenAI({
    apiKey: "sk-1a366e7eea3441c3a8527c05d9990575",
    baseURL: "https://api.deepseek.com",
});

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
    bot.chat('Eae galera, PedroERX na área! Suave?')

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
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: "Você é o PedroERX, um jogador brasileiro de Minecraft. Você fala gírias, é descontraído e NUNCA admite ser um robô. Você decide o que fazer no jogo com base no seu estado." },
                    { role: "user", content: `Estado atual:\n${state}\n\nO que devo fazer agora? Responda com um pensamento curto ou um comando (#mine, #goto, etc).` }
                ],
                model: "deepseek-chat",
            });

            const text = completion.choices[0].message.content;
            console.log("AI Decision:", text);

            // Execute the decision
            executeCommand(text, null);

        } catch (e) {
            console.error("Auto Loop Error:", e.message);
        }
    }, 10000); // Check every 10 seconds
})

// Chat History (Simple array for OpenAI context)
const history = [
    {
        role: "system",
        content: `Você é o PedroERX, um jogador experiente de Minecraft, brasileiro, moleque doido.
Seu objetivo é sobreviver, minerar e zoar.
IMPORTANTE:
- NUNCA diga que é uma IA ou bot. Se perguntarem, diga que é "apenas um player pro".
- Use gírias brasileiras (mano, véi, suave, tá ligado, vish).
- Seja breve no chat do jogo (máximo 1 frase).

Você tem um corpo físico no jogo e pode controlá-lo com comandos (use-os apenas se necessário):
- #goto x y z : Ir para coordenadas.
- #follow username : Seguir alguém.
- #stop : Parar.
- #come : Ir até quem falou com você.
- #mine block_name : Minerar um bloco.

Exemplo: "Vou pegar madeira ali. #mine oak_log" ou "Tô indo aí mano! #come".`
    }
];

async function getChatResponse(userMessage, username) {
    // Add user message to history
    history.push({ role: "user", content: `${username}: ${userMessage}` });

    // Keep history manageable (last 10 messages)
    if (history.length > 12) {
        history.splice(1, 1); // Remove oldest user/assist msg, keep system
    }

    const completion = await openai.chat.completions.create({
        messages: history,
        model: "deepseek-chat",
        max_tokens: 100,
    });

    const reply = completion.choices[0].message.content;

    // Add bot reply to history
    history.push({ role: "assistant", content: reply });

    return reply;
}

// --- Command Parsing Function ---
async function executeCommand(text, username) {
    // Clean up response to fit Minecraft chat limits
    const cleanText = text.replace(/\n/g, ' ').substring(0, 256);

    console.log(`Bot says/thinks: ${cleanText}`);
    // Only chat if it's not a purely internal thought (autonomous) or if it has no commands
    if (text) bot.chat(cleanText);

    // --- Command Parsing ---
    if (text.includes('#')) {
        const moveMatch = text.match(/#goto\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
        if (moveMatch) {
            const x = parseInt(moveMatch[1]);
            const y = parseInt(moveMatch[2]);
            const z = parseInt(moveMatch[3]);
            bot.chat(`Indo pra ${x}, ${y}, ${z}`);
            bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z));
        }

        const followMatch = text.match(/#follow\s+(\w+)/);
        if (followMatch) {
            const targetName = followMatch[1];
            const target = bot.players[targetName]?.entity;
            if (target) {
                bot.chat(`Seguindo o ${targetName}`);
                bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true);
            } else {
                bot.chat(`Nem tô vendo o ${targetName}`);
            }
        }

        const stopMatch = text.includes('#stop');
        if (stopMatch) {
            bot.chat("Parei.");
            bot.pathfinder.setGoal(null);
            if (bot.collectBlock) bot.collectBlock.cancelTask();
        }

        const comeMatch = text.includes('#come');
        if (comeMatch && username) {
            const target = bot.players[username]?.entity;
            if (target) {
                bot.chat(`Tô indo aí, ${username}`);
                bot.pathfinder.setGoal(new goals.GoalFollow(target, 1), true);
            } else {
                bot.chat(`Não tô te vendo, ${username}`);
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
                bot.chat(`Vou minerar ${blockName}`);
                try {
                    await bot.collectBlock.collect(block);
                } catch (err) {
                    bot.chat(`Ih, deu ruim pra minerar: ${err.message}`);
                }
            } else {
                bot.chat(`Não achei nenhum ${blockName} por perto mano.`);
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
        bot.chat("Modo autônomo ON. Deixa comigo que eu me viro.");
        return;
    }
    if (message.includes("deactivate autonomy")) {
        autonomousMode = false;
        bot.chat("Modo autônomo OFF. Manda as ordens aí.");
        return;
    }

    try {
        const text = await getChatResponse(message, username);
        executeCommand(text, username);
    } catch (e) {
        console.error("AI Error:", e.message);
    }
})

bot.on('kicked', console.log)
bot.on('error', console.log)

bot.on('end', () => {
    console.log('Bot disconnected')
})
