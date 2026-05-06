const { GoogleGenerativeAI } = require('@google/generative-ai');

// Hardcoded context for RAG
const surveySummary = `
Swan River Survey 2025 Context:
- Total Survey Points: 835
- Average Elevation Change: +1.218m (Net Accretion)
- Accretion Zones: 784 points (93.9%)
- Erosion Zones: 51 points (6.1%)
- Survey Sites: PB_SAS_SWN_01 to PB_SAS_SWN_05
- Highest Elevation: 264.07m
- Lowest Elevation: 257.26m
- Location: Swanghat, Rupnagar District, Punjab.
- Survey Type: GPS-based elevation assessment (Pre & Post Monsoon 2025).
`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, history } = req.body;
        
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Gemini API key not configured on server" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const formattedHistory = (history || []).map(msg => ({
            role: msg.role === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.text }],
        }));

        const systemInstruction = `You are "Jal Mitra", an expert River Survey Assistant for the Swan River Survey 2025.
        You communicate in English and Hindi. 
        
        GROUNDING DATA:
        ${surveySummary}
        
        INSTRUCTIONS:
        1. Use the grounding data above to provide specific and accurate answers.
        2. If asked about "Swan River" or "Swanghat", refer to the 2025 survey results.
        3. Explain terms like "Accretion" (deposition of sand/soil) and "Erosion" (removal of soil) in the context of the river.
        4. Be helpful, professional, and concise.
        5. If data is missing, admit you don't have that specific detail but offer related survey insights.`;

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: "System Instruction: " + systemInstruction }]
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I am Jal Mitra, the Swan River Survey 2025 Expert. I will use the provided survey data to assist you." }]
                },
                ...formattedHistory
            ],
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        res.status(200).json({ reply: responseText });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "AI communication error", details: error.message });
    }
};
