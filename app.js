// file: app.js

// 1. Import các modules cần thiết
const express = require('express');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();
const path = require('path');

// 2. Khởi tạo Express
const app = express();
const port = 3000;

// Middleware
app.use(express.json());

// Phục vụ tệp tĩnh từ thư mục src/view
app.use(express.static(path.join(__dirname, 'src', 'view')));


// Khai báo biến AI và các mô hình
let ai;
let chat;
const CHAT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "imagen-3.0-generate-002"; // Mô hình tạo ảnh

try {
    // 3. Khởi tạo GoogleGenAI
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("LỖI KHỞI ĐỘNG: Không tìm thấy GEMINI_API_KEY. Vui lòng kiểm tra file .env hoặc biến môi trường hệ thống.");
        process.exit(1);
    }

    ai = new GoogleGenAI(apiKey);

    // Khởi tạo một đối tượng chat session với System Instruction
    chat = ai.chats.create({
        model: CHAT_MODEL,
        config: {
            systemInstruction: "Bạn là một AI tư vấn về sức khỏe cho người dùng, hãy phản hồi 1 cách nhẹ nhàng, thoải mái, độ dài vừa phải, đúng trọng tâm trong suốt cuộc trò chuyện. Có thể thêm vài icon cho cảm giác thân thiện thoải mái."
        }
    });

    // 4. Định nghĩa API endpoint cho chat
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'src', 'view', 'index.html'));
    });

    // 4A. ENDPOINT CHAT (Giữ nguyên logic cũ)
    app.post('/chat', async (req, res) => {
        try {
            const userMessage = req.body.message;
            if (!userMessage) {
                return res.status(400).json({ error: 'Thiếu trường "message" trong request body.' });
            }

            console.log(`[CHAT] Người dùng: ${userMessage}`);
            const result = await chat.sendMessage({ message: userMessage });
            const aiResponse = result.text;
            console.log(`[CHAT] Gemini: ${aiResponse}`);
            res.json({ response: aiResponse });

        } catch (error) {
            console.error('LỖI GỌI API GEMINI CHAT:', error.message);
            res.status(500).json({ error: 'Đã xảy ra lỗi khi xử lý yêu cầu chat.' });
        }
    });

    // 4B. ENDPOINT TẠO ẢNH MỚI
    app.post('/generate', async (req, res) => {
        try {
            const prompt = req.body.prompt;

            if (!prompt) {
                return res.status(400).json({ error: 'Thiếu trường "prompt" trong request body.' });
            }

            console.log(`[IMAGE] Yêu cầu tạo ảnh: ${prompt}`);

            // GỌI API TẠO ẢNH
            const result = await ai.models.generateImages({
                model: IMAGE_MODEL,
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '1:1',
                },
            });

            // Lấy dữ liệu ảnh (Base64)
            const imageData = result.generatedImages[0].image.imageBytes;

            if (!imageData) {
                return res.status(500).json({ error: 'Không nhận được dữ liệu ảnh từ AI.' });
            }

            console.log(`[IMAGE] Đã tạo ảnh thành công.`);

            // Trả về dữ liệu ảnh (Base64 string) cho client
            res.json({
                base64Image: imageData,
                prompt: `Đã tạo ảnh theo mô tả: "${prompt}"`
            });

        } catch (error) {
            console.error('LỖI TẠO ẢNH:', error);
            res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo ảnh.' });
        }
    });

    // Lắng nghe kết nối sau khi khởi tạo AI thành công
    app.listen(port, () => {
        console.log(`Server chạy tại http://localhost:${port}`);
        console.log(`Chế độ Chat: ${CHAT_MODEL} | Chế độ Ảnh: ${IMAGE_MODEL}`);
    });

} catch (e) {
    console.error("LỖI NGHIÊM TRỌNG KHI KHỞI TẠO:", e.message);
    process.exit(1);
}