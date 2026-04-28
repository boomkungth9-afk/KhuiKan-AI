const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('.'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// จำลองฐานข้อมูล (ชื่อผู้ใช้: { เหรียญ, วันที่รับเหรียญล่าสุด })
let users = {
    "admin": { coins: 0, lastCheckIn: null }
};

// ระบบ Login ง่ายๆ
app.post('/login', (req, res) => {
    const { username } = req.body;
    if (!users[username]) {
        users[username] = { coins: 0, lastCheckIn: null };
    }
    res.json({ username, coins: users[username].coins });
});

// ระบบรับเหรียญรายวัน (1 วัน = 100 Coins)
app.post('/daily-checkin', (req, res) => {
    const { username } = req.body;
    const user = users[username];
    const now = new Date().toDateString();

    if (user.lastCheckIn === now) {
        return res.json({ success: false, message: "วันนี้คุณรับเหรียญไปแล้วนะเจ้าคะ!" });
    }

    user.coins += 100;
    user.lastCheckIn = now;
    res.json({ success: true, coins: user.coins, message: "ยินดีด้วย! คุณได้รับ 100 Coins แล้วเจ้าคะ" });
});

app.post('/chat', async (req, res) => {
    const { prompt, customSystem, username } = req.body;
    const user = users[username];

    if (!user || user.coins <= 0) {
        return res.json({ reply: "เหรียญหมดแล้วนะเจ้าคะ! กรุณากดรับเหรียญรายวันก่อน", outOfCoins: true });
    }

    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: customSystem || "คุณคือ AI ผู้ช่วยใจดี"
    });

    try {
        const result = await model.generateContent(prompt);
        user.coins -= 1; // หักทีละ 1 เหรียญ
        res.json({ reply: result.response.text(), remainingCoins: user.coins });
    } catch (error) {
        res.status(500).json({ error: "มึนหัวนิดหน่อยเจ้าคะ" });
    }
});

app.listen(3000, () => console.log('Server runs on http://localhost:3000'));