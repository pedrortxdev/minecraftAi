const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- AI Configuration --
// We re-use the key. Ideally, we should export the model from index.js or pass it in.
// For simplicity, let's pass the 'model' instance to the think function.

async function sense(bot) {
    const health = Math.round(bot.health);
    const food = Math.round(bot.food);
    const time = bot.time.timeOfDay;

    // Inventory summary
    const inventory = bot.inventory.items().map(item => `${item.name} x${item.count}`).join(', ') || "Empty";

    // Nearby blocks (simplified)
    const blocks = bot.findBlocks({
        matching: (block) => ['oak_log', 'stone', 'iron_ore', 'coal_ore', 'dirt'].includes(block.name),
        maxDistance: 10,
        count: 5
    });

    const nearby = blocks.length > 0 ? "Resources nearby" : "No obvious resources nearby";

    // Nearby Entities
    const entities = Object.values(bot.entities)
        .filter(e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 10)
        .map(e => e.name)
        .join(', ') || "None";

    return `
Time: ${time}
Health: ${health}/20
Food: ${food}/20
Inventory: ${inventory}
Nearby Entities: ${entities}
Environment: ${nearby}
    `.trim();
}

async function act(bot, model, goalText) {
    // This function could be used to execute the goal if we wanted to separate logic further.
    // For now, index.js handles the execution to keep access to 'bot' easy.
}

module.exports = { sense };
