const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- AI Configuration --
// We re-use the key. Ideally, we should export the model from index.js or pass it in.
// For simplicity, let's pass the 'model' instance to the think function.

async function sense(bot) {
    const health = Math.round(bot.health);
    const food = Math.round(bot.food);
    const time = bot.time.timeOfDay;

    // Inventory summary (Detailed)
    const inventory = bot.inventory.items().map(item => `${item.name} x${item.count}`).join(', ') || "Empty";

    // Equipment
    const mainHand = bot.heldItem ? bot.heldItem.name : "Empty";

    // Nearby blocks (simplified)
    const blocks = bot.findBlocks({
        matching: (block) => ['oak_log', 'birch_log', 'spruce_log', 'stone', 'iron_ore', 'coal_ore', 'diamond_ore', 'crafting_table', 'furnace'].includes(block.name),
        maxDistance: 32,
        count: 50
    });

    // Group blocks by name for summary
    const blockCounts = {};
    blocks.forEach(pos => {
        const block = bot.blockAt(pos);
        if (block) {
            blockCounts[block.name] = (blockCounts[block.name] || 0) + 1;
        }
    });
    const nearby = Object.entries(blockCounts).map(([name, count]) => `${name} (${count})`).join(', ') || "None";

    // Nearby Entities
    const entities = Object.values(bot.entities)
        .filter(e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 15)
        .map(e => `${e.name} (dist: ${Math.round(e.position.distanceTo(bot.entity.position))})`)
        .join(', ') || "None";

    return `
Time: ${time}
Health: ${health}/20
Food: ${food}/20
Held Item: ${mainHand}
Inventory: ${inventory}
Nearby Blocks: ${nearby}
Nearby Entities: ${entities}
    `.trim();
}

async function act(bot, model, goalText) {
    // This function could be used to execute the goal if we wanted to separate logic further.
    // For now, index.js handles the execution to keep access to 'bot' easy.
}

module.exports = { sense };
