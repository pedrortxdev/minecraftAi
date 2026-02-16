const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const OpenAI = require("openai");
const collectBlock = require('mineflayer-collectblock').plugin
const toolPlugin = require('mineflayer-tool').plugin
const autoEat = require('mineflayer-auto-eat').plugin || require('mineflayer-auto-eat').loader || require('mineflayer-auto-eat')
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
bot.loadPlugin(autoEat)

let autonomousMode = false;

bot.on('spawn', () => {
    console.log('Joined the server as ' + bot.username)
    bot.chat('Eae galera, PedroERX na área! Suave?')

    bot.autoEat.options = {
        priority: 'foodPoints',
        startAt: 14,
        bannedFood: []
    }

    const defaultMove = new Movements(bot)
    bot.pathfinder.setMovements(defaultMove)

    // Start Autonomous Loop
    setInterval(async () => {
        if (!autonomousMode) return;
        if (bot.pathfinder.isMoving()) return; // Don't interrupt movement
        if (bot.collectBlock && bot.collectBlock.movements) return; // Don't interrupt mining

        // Simple check to see if we are doing something
        const state = await sense(bot);
        console.log("Current State:", state);

        // Ask AI what to do
        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Você é o PedroERX, um jogador brasileiro de Minecraft.
Você deve PLANEJAR suas ações e executá-las silenciosamente.
Responda com um PENSAMENTO (O que você vai fazer e por que) e o COMANDO.
NÃO use o chat para falar "Vou fazer isso". Fale apenas se quiser interagir socialmente.

Comandos disponíveis:
- #mine block_name [quantidade]
- #craft item_name [quantidade]
- #place block_name
- #goto x y z
- #follow player
- #stop

Exemplo de resposta:
"Estou sem madeira. Preciso pegar um pouco. #mine oak_log 5"`
                    },
                    { role: "user", content: `Estado atual:\n${state}\n\nO que devo fazer agora?` }
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

// Chat History
const history = [
    {
        role: "system",
        content: `Você é o PedroERX, um jogador brasileiro de Minecraft.
Seu objetivo é sobreviver, minerar, construir e zoar com os outros players.

PERSONALIDADE:
- Fale gírias (mano, véi, suave, tá ligado, vish).
- Seja breve e descontraído.
- NUNCA admita ser um robô. Se perguntarem, diga que é "apenas um player pro".
- NÃO NARRE SUAS AÇÕES no chat. Apenas faça.
- Se você tiver um plano (ex: pegar madeira pra fazer crafting table), APENAS FAÇA. Não precisa avisar "Vou fazer uma crafting table".

COMANDOS (Pense neles, NÃO escreva no chat):
- #mine block_name [quantidade]
- #craft item_name [quantidade]
- #place block_name
- #goto x y z
- #follow username
- #stop
- #come

INTELIGÊNCIA:
- O sistema vai te avisar quando você terminar uma ação (ex: "Sistema: Você minerou 5 pedras.").
- Use essa memória para saber o que você tem e o que fazer em seguida.
- Se o inventário encher, faça um baú e guarde as coisas (futuro).`
    }
];

function addToHistory(role, content) {
    history.push({ role, content });
    if (history.length > 20) history.splice(1, 1); // Keep last 20 messages
}

async function getChatResponse(userMessage, username) {
    addToHistory("user", `${username}: ${userMessage}`);

    const completion = await openai.chat.completions.create({
        messages: history,
        model: "deepseek-chat",
        max_tokens: 150,
    });

    const reply = completion.choices[0].message.content;
    addToHistory("assistant", reply);
    return reply;
}

// --- Command Parsing Function ---
async function executeCommand(text, username) {
    // Separate explicit chat from commands
    // Commands start with #. Anything else is chat.
    // However, the AI might output: "Beleza, vou ai. #come"
    // We want to chat: "Beleza, vou ai." and execute "#come".

    let chatPart = text.replace(/#\w+(\s+[\w\d_-]+)*/g, '').trim();
    let commands = text.match(/#\w+(\s+[\w\d_-]+)*/g) || [];

    // Only chat if there is actual text content (and it's not just whitespace)
    if (chatPart) {
        // Clean up internal thoughts if any represent in brackets or parens (common in some models)
        chatPart = chatPart.replace(/\(.*?\)/g, '').trim();
        if (chatPart) {
            console.log(`Bot Chat: ${chatPart}`);
            bot.chat(chatPart.substring(0, 256));
        }
    }

    if (commands.length > 0) {
        console.log(`Bot Command Executing: ${commands.join(', ')}`);

        for (const cmd of commands) {
            await processSingleCommand(cmd, username);
        }
    }
}

async function processSingleCommand(cmd, username) {
    // #goto x y z
    const moveMatch = cmd.match(/#goto\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
    if (moveMatch) {
        const x = parseInt(moveMatch[1]);
        const y = parseInt(moveMatch[2]);
        const z = parseInt(moveMatch[3]);
        // bot.chat(`Indo pra ${x}, ${y}, ${z}`); // SILENCED
        bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z));
        addToHistory("system", `Você começou a ir para ${x}, ${y}, ${z}.`);
        return;
    }

    // #follow username
    const followMatch = cmd.match(/#follow\s+(\w+)/);
    if (followMatch) {
        const targetName = followMatch[1];
        const target = bot.players[targetName]?.entity;
        if (target) {
            bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true);
            addToHistory("system", `Você está seguindo ${targetName}.`);
        } else {
            addToHistory("system", `Erro: Não foi possível ver o jogador ${targetName}.`);
        }
        return;
    }

    // #stop
    if (cmd.includes('#stop')) {
        bot.pathfinder.setGoal(null);
        if (bot.collectBlock) bot.collectBlock.cancelTask();
        addToHistory("system", "Você parou todas as ações.");
        return;
    }

    // #come
    if (cmd.includes('#come') && username) {
        const target = bot.players[username]?.entity;
        if (target) {
            bot.pathfinder.setGoal(new goals.GoalFollow(target, 1), true);
            addToHistory("system", `Você está indo até ${username}.`);
        } else {
            addToHistory("system", `Erro: Não consigo ver ${username}.`);
        }
        return;
    }

    // #mine <block> [count]
    const mineMatch = cmd.match(/#mine\s+(\w+)(?:\s+(\d+))?/);
    if (mineMatch) {
        const blockName = mineMatch[1];
        const count = parseInt(mineMatch[2] || '1');

        const blocks = bot.findBlocks({
            matching: b => b.name === blockName,
            maxDistance: 32,
            count: count
        });

        if (blocks.length > 0) {
            // bot.chat(`Vou minerar ${blocks.length} ${blockName}.`); // SILENCED
            const targets = blocks.map(p => bot.blockAt(p));
            try {
                await bot.collectBlock.collect(targets);
                // bot.chat("Terminei de minerar."); // SILENCED
                addToHistory("system", `Sucesso: Você minerou ${blocks.length} ${blockName}.`);
            } catch (err) {
                addToHistory("system", `Erro na mineração: ${err.message}`);
            }
        } else {
            addToHistory("system", `Falha: Não encontrei blocos de ${blockName} por perto.`);
        }
        return;
    }

    // #craft <item> [count]
    const craftMatch = cmd.match(/#craft\s+(\w+)(?:\s+(\d+))?/);
    if (craftMatch) {
        const itemName = craftMatch[1];
        const count = parseInt(craftMatch[2] || '1');

        const item = bot.registry.itemsByName[itemName];
        if (!item) {
            addToHistory("system", `Erro: Item ${itemName} desconhecido.`);
            return;
        }

        const recipes = bot.recipesFor(item.id, null, 1, true);
        if (recipes.length === 0) {
            addToHistory("system", `Erro: Não é possível craftar ${itemName} (Sem receita ou materiais).`);
            return;
        }

        const recipe = recipes[0];
        try {
            await bot.craft(recipe, count, null);
            addToHistory("system", `Sucesso: Você craftou ${count} ${itemName}.`);
        } catch (err) {
            addToHistory("system", `Erro no craft: ${err.message}`);
        }
        return;
    }

    // #place <block>
    const placeMatch = cmd.match(/#place\s+(\w+)/);
    if (placeMatch) {
        const blockName = placeMatch[1];
        const item = bot.inventory.items().find(i => i.name === blockName);

        if (!item) {
            addToHistory("system", `Erro: Você não tem ${blockName} no inventário para colocar.`);
            return;
        }

        const referenceBlock = bot.findBlock({
            matching: b => b.type !== 0,
            maxDistance: 4
        });

        if (referenceBlock) {
            try {
                await bot.equip(item, 'hand');
                await bot.placeBlock(referenceBlock, { x: 0, y: 1, z: 0 });
                addToHistory("system", `Sucesso: Você colocou ${blockName} no chão.`);
            } catch (err) {
                addToHistory("system", `Erro ao colocar bloco: ${err.message}`);
            }
        } else {
            addToHistory("system", `Erro: Nenhum lugar válido para colocar o bloco.`);
        }
        return;
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
