const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: "sk-NpFrIZZLBytIVVdn5XdUH2aZCn8m9DooJqyO1V8MtE4L5TFU",
    baseURL: "https://api.cometapi.com/v1",
});

async function main() {
    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: "Hello!" }],
            model: "gemini-2.5-flash-lite",
        });

        console.log(completion.choices[0]);
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
