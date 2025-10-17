// file: app.js

// 1. Import các modules cần thiết
const express = require('express');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();
const path = require('path');
const cors = require('cors');

// 2. Khởi tạo Express
const app = express();
const port = process.env.PORT || 3000;

// 3. Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src', 'view')));

// 4. Khởi tạo AI
const CHAT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "imagen-3.0-generate-002";
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ Không tìm thấy GEMINI_API_KEY. Kiểm tra file .env hoặc Render Environment.");
    process.exit(1);
}

const ai = new GoogleGenAI(apiKey);

// 🔹 Bộ nhớ lưu các phiên chat riêng cho từng user (sessionId → chat)
const userSessions = new Map();

// 5. ROUTES

// 🏠 Trang chính
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'view', 'index.html'));
});

// 💬 CHAT ENDPOINT
app.post('/chat', async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Thiếu trường "message" trong request body.' });
        }

        if (!sessionId) {
            return res.status(400).json({ error: 'Thiếu "sessionId" để xác định người dùng.' });
        }

        // Nếu user chưa có session => tạo mới
        if (!userSessions.has(sessionId)) {
            const newChat = ai.chats.create({
                model: CHAT_MODEL,
                config: {
                    systemInstruction:
                        "Bạn là một AI tư vấn về sức khỏe, phản hồi ngắn gọn, nhẹ nhàng, đúng trọng tâm, có thể thêm vài emoji thân thiện như 😊🌿❤️. Nên nhớ chỉ trò chuyện về vấn đề sức khỏe, nếu bị hỏi sang vấn đề khác thì từ chối khéo"
                }
            });
            userSessions.set(sessionId, newChat);
            console.log(`🆕 Tạo session mới cho user: ${sessionId}`);
        }

        // Lấy phiên chat tương ứng
        const chat = userSessions.get(sessionId);

        // Gửi tin nhắn
        console.log(`[CHAT][${sessionId}] Người dùng: ${message}`);
        const result = await chat.sendMessage({ message });
        const aiResponse = result.text;
        console.log(`[CHAT][${sessionId}] Gemini: ${aiResponse}`);

        res.json({ response: aiResponse });

    } catch (error) {
        console.error('❌ Lỗi xử lý chat:', error.message);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi xử lý yêu cầu chat.' });
    }
});

// 🖼️ IMAGE GENERATION ENDPOINT
app.post('/generate', async (req, res) => {
    try {
        const prompt = req.body.prompt;

        if (!prompt) {
            return res.status(400).json({ error: 'Thiếu trường "prompt" trong request body.' });
        }

        console.log(`[IMAGE] Tạo ảnh theo mô tả: ${prompt}`);

        const result = await ai.models.generateImages({
            model: IMAGE_MODEL,
            prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1'
            },
        });

        const imageData = result.generatedImages[0].image.imageBytes;

        if (!imageData) {
            return res.status(500).json({ error: 'Không nhận được dữ liệu ảnh từ AI.' });
        }

        console.log(`[IMAGE] ✅ Ảnh tạo thành công.`);
        res.json({
            base64Image: imageData,
            prompt: `Đã tạo ảnh theo mô tả: "${prompt}"`
        });

    } catch (error) {
        console.error('❌ Lỗi tạo ảnh:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo ảnh.' });
    }
});

// 🔁 API reset ngữ cảnh (nếu người dùng muốn bắt đầu lại)
app.post('/reset', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && userSessions.has(sessionId)) {
        userSessions.delete(sessionId);
        console.log(`🔄 Đã reset session: ${sessionId}`);
        return res.json({ message: 'Đã khởi tạo lại ngữ cảnh hội thoại.' });
    }
    res.json({ message: 'Không tìm thấy session để reset.' });
});

// 🚀 Lắng nghe
app.listen(port, () => {
    console.log(`✅ Server chạy tại http://localhost:${port}`);
    console.log(`Chat Model: ${CHAT_MODEL} | Image Model: ${IMAGE_MODEL}`);
});
