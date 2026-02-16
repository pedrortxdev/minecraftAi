const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: "sk-1a366e7eea3441c3a8527c05d9990575",
    baseURL: "https://api.deepseek.com",
});

async function main() {
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "Hello!" }
            ],
            model: "deepseek-chat",
        });

        console.log(completion.choices[0].message.content);
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
