// file: src/view/script.js

document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Hàm chuyển đổi Markdown cơ bản sang HTML
function formatText(text) {
    if (!text) return '';

    // 1. Chuyển đổi in đậm (**Text**) thành <strong>Text</strong>
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 2. Tạm thời chuyển ký tự xuống dòng thành một placeholder đặc biệt
    formattedText = formattedText.replace(/\n/g, '__NL__');

    // 3. Xử lý danh sách (<ul>/<li>)
    const listRegex = /(__NL__[\*\-]\s*.*)+/g;
    formattedText = formattedText.replace(listRegex, (match) => {
        let items = match.trim().split('__NL__').filter(item => item.match(/[\*\-]/));
        let htmlList = '<ul>';
        items.forEach(item => {
            let listItemContent = item.replace(/^[\*\-]\s*/, '').trim();
            htmlList += `<li>${listItemContent}</li>`;
        });
        htmlList += '</ul>';
        return htmlList;
    });

    // 4. Xử lý tiêu đề (Header, ví dụ ##) thành <h3> (Đơn giản hóa)
    formattedText = formattedText.replace(/###\s*(.*?)($|__NL__)/g, '<h4><strong>$1</strong></h4>');
    formattedText = formattedText.replace(/##\s*(.*?)($|__NL__)/g, '<h3><strong>$1</strong></h3>');


    // 5. Chuyển đổi placeholder còn lại thành <br>
    formattedText = formattedText.replace(/__NL__/g, '<br>');

    return formattedText;
}

// Hàm hiển thị từng ký tự (Typing Effect)
function typeText(element, rawText, finalHTML) {
    let index = 0;
    element.textContent = '';

    // Tốc độ gõ: 5ms (Bạn đã đặt 5ms, tốc độ rất nhanh)
    const interval = setInterval(() => {
        if (index < rawText.length) {
            // Gõ text thô (an toàn)
            element.textContent += rawText.charAt(index);
            index++;

            const chatWindow = document.getElementById('chat-window');
            chatWindow.scrollTop = chatWindow.scrollHeight;
        } else {
            clearInterval(interval);

            // SỬA LỖI: Thay thế nội dung của <span> đã gõ bằng HTML đã định dạng
            // Giữ nguyên nhãn "Gemini: " đã được tạo trong sendMessage()
            element.innerHTML = finalHTML;

            // Kích hoạt lại input sau khi gõ xong
            document.getElementById('message-input').disabled = false;
            document.getElementById('message-input').focus();
        }
    }, 5);
}


async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    const chatWindow = document.getElementById('chat-window');

    if (message === '') return;

    // 1. Hiển thị tin nhắn người dùng (ĐÃ SỬA: Bọc bằng <span> để bo tròn CSS hoạt động)
    const userDiv = document.createElement('div');
    userDiv.className = 'user-message';

    const userTextSpan = document.createElement('span');
    userTextSpan.textContent = `Bạn: ${message}`;
    userDiv.appendChild(userTextSpan);

    chatWindow.appendChild(userDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    input.value = '';
    input.disabled = true; // Vô hiệu hóa input khi AI đang phản hồi

    try {
        // Gửi tin nhắn đến Express server
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message }),
        });

        const data = await response.json();

        // 3. Hiển thị phản hồi từ AI
        const aiDiv = document.createElement('div');
        aiDiv.className = 'ai-message';

        // Tạo khung text để áp dụng hiệu ứng gõ chữ
        const aiTextSpan = document.createElement('span');
        // Chỉ thêm nhãn vào div cha, span chỉ chứa nội dung
        aiDiv.textContent = `Gemini: `;
        aiDiv.appendChild(aiTextSpan);
        chatWindow.appendChild(aiDiv);

        // Chuẩn bị cả hai phiên bản:
        const formattedHTML = formatText(data.response);

        // Chuỗi văn bản thuần túy (loại bỏ Markdown để gõ)
        const rawText = data.response
            .replace(/\*\*/g, '')
            .replace(/[\*\-]/g, '')
            .replace(/##+/g, '')
            .replace(/\n/g, ' ');

        // Gọi hàm gõ chữ (formattedHTML chỉ là nội dung bên trong span)
        typeText(aiTextSpan, rawText, formattedHTML);

    } catch (error) {
        console.error('Lỗi gửi tin nhắn:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ai-message';
        errorDiv.textContent = 'Lỗi: Không thể kết nối với server. Vui lòng kiểm tra console backend.';
        chatWindow.appendChild(errorDiv);
        input.disabled = false;
        input.focus();
    }
}