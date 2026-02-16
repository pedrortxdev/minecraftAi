const apiKey = "AIzaSyAQsaKY12g9teuuWgsNBVt-wxSWyrIZnWY";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Available models:");
        if (data.models) {
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("No models found in response:", data);
        }
    } catch (error) {
        console.error("Error listing models:", error.message);
    }
}

listModels();
