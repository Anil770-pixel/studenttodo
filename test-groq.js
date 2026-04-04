import 'dotenv/config';

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

if (!GROQ_API_KEY) {
    console.error("❌ Error: GROQ_API_KEY is not defined in your environment.");
    process.exit(1);
}

async function testGroq() {
    try {
        console.log("Testing Groq API...");
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: "Hello" }],
                model: "llama-3.3-70b-versatile"
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Groq API Error: ${response.status} ${errorText}`);
        } else {
            const data = await response.json();
            console.log("Groq API Success:", data.choices[0].message.content);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

testGroq();

