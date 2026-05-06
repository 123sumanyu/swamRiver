require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Load survey data for RAG
let surveySummary = "";
try {
    const dataPath = path.join(__dirname, 'survey_data.js');
    if (fs.existsSync(dataPath)) {
        // Simple extraction of key stats for context
        const dataContent = fs.readFileSync(dataPath, 'utf8');
        // We'll just provide a high-level summary to the AI
        surveySummary = `
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
    }
} catch (e) {
    console.error("Error loading survey data for context:", e);
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'SwanRiver_Dashboard_v5_clean.html'));
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Gemini API key not configured on server" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

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

        res.json({ reply: responseText });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "AI communication error", details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

