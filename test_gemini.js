const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI("AIzaSyAQsaKY12g9teuuWgsNBVt-wxSWyrIZnWY");

async function run() {
    // The Gemini 1.5 models are versatile and work with both text-only and multimodal prompts
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = "Write a story about a magic backpack.";

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(text);
}

run();
