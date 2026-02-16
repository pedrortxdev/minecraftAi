const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyAQsaKY12g9teuuWgsNBVt-wxSWyrIZnWY");

async function listModels() {
    try {
        // There isn't a direct helper in the high-level client for listModels in some versions,
        // but let's try to infer or use the fetch directly if needed.
        // Actually, for the Node SDK, it might be different.
        // Let's try to just hit the REST API to see what's available if the SDK fails.
        // Or simpler: try 'gemini-pro' which is the most standard.
        console.log("Trying gemini-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Test");
        console.log("gemini-pro works!");
    } catch (error) {
        console.error("gemini-pro failed:", error.message);
    }
}

listModels();
