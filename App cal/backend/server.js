const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// Security Middleware
app.use((req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.APP_API_KEY) {
        return res.status(403).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
});



app.get('/api/results/:userId', async (req, res) => {
    try {
        const row = await prisma.user_results.findUnique({
            where: { userid: req.params.userId }
        });
        if (!row) return res.status(404).json({ message: 'No data found' });
        
        res.json({
            userId: row.userid,
            currentGPA: row.currentgpa,
            totalCreditsDone: row.totalcreditsdone,
            semesters: row.semesters,
            updatedAt: row.updatedat
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/results', async (req, res) => {
    const { userId, currentGPA, totalCreditsDone, semesters } = req.body;
    try {
        const row = await prisma.user_results.upsert({
            where: { userid: userId },
            update: {
                currentgpa: String(currentGPA),
                totalcreditsdone: String(totalCreditsDone),
                semesters: semesters,
                updatedat: new Date()
            },
            create: {
                userid: userId,
                currentgpa: String(currentGPA),
                totalcreditsdone: String(totalCreditsDone),
                semesters: semesters,
            }
        });
        
        res.json({
            userId: row.userid,
            currentGPA: row.currentgpa,
            totalCreditsDone: row.totalcreditsdone,
            semesters: row.semesters,
            updatedAt: row.updatedat
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.API_KEY,
    baseURL: "https://api.moonshot.cn/v1",
});

app.post('/api/ask-ai', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    try {
        const completion = await client.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful assistant for a CGPA calculator app." },
                { role: "user", content: prompt }
            ],
            model: "moonshot-v1-8k",
        });
        res.json({ reply: completion.choices[0].message.content });
    } catch (err) {
        console.error('AI Error:', err);
        res.status(500).json({ error: 'Failed to fetch AI response' });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Backend server running on port ${PORT}`));
