// api/scrape-course.js
// Vercel Serverless Function - Scrapes Swayam URLs and extracts metadata via AI
export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: "No URL provided" });
    }

    try {
        // 1. Fetch raw HTML from the target URL
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Target site returned ${response.status}`);
        const html = await response.text();

        // 2. Simple regex cleanup to extract readable text
        const cleanText = html
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, "")
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .substring(0, 10000); // Token limit safety

        // 3. Ping Groq for extraction
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.VITE_GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-70b-versatile",
                messages: [
                    { 
                        role: "system", 
                        content: "You are a course metadata extractor. extract exactly these fields: { \"courseName\": \"string\", \"totalWeeks\": number, \"startDate\": \"YYYY-MM-DD\" }. If data is missing, guess logically based on context. Return ONLY valid JSON."
                    },
                    { role: "user", content: `Text: "${cleanText}"` }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!groqResponse.ok) throw new Error("Groq analysis failed");
        const data = await groqResponse.json();
        const content = JSON.parse(data.choices[0].message.content);

        // 4. Return clean JSON to frontend
        return res.status(200).json(content);

    } catch (error) {
        console.error("Scraping Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
