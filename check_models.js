const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyAQsaKY12g9teuuWgsNBVt-wxSWyrIZnWY");

async function listModels() {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Dummy model just to get the client
    // For listing models, we don't need a specific model instance usually, but the SDK structure might require it or we use the client.
    // Actually, looking at the docs, there isn't a direct listModels on the client instance in some versions.
    // Let's try a standard model first like "gemini-1.5-flash" which is very common.
}

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash works:", result.response.text());
    } catch (e) {
        console.log("gemini-1.5-flash failed:", e.message);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }); // Try experimental
        const result = await model.generateContent("Hello");
        console.log("gemini-2.0-flash-exp works:", result.response.text());
    } catch (e) {
        console.log("gemini-2.0-flash-exp failed:", e.message);
    }
}

run();
