// file: src/view/script.js

document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

// ⚙️ Tạo sessionId cố định cho mỗi người (lưu vào localStorage)
const sessionId = localStorage.getItem('sessionId') || crypto.randomUUID();
localStorage.setItem('sessionId', sessionId);

// Hàm chuyển đổi Markdown cơ bản sang HTML
function formatText(text) {
    if (!text) return '';

    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\n/g, '__NL__');

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

    formattedText = formattedText.replace(/###\s*(.*?)($|__NL__)/g, '<h4><strong>$1</strong></h4>');
    formattedText = formattedText.replace(/##\s*(.*?)($|__NL__)/g, '<h3><strong>$1</strong></h3>');
    formattedText = formattedText.replace(/__NL__/g, '<br>');

    return formattedText;
}

// Hiệu ứng gõ chữ
function typeText(element, rawText, finalHTML) {
    let index = 0;
    element.textContent = '';

    const interval = setInterval(() => {
        if (index < rawText.length) {
            element.textContent += rawText.charAt(index);
            index++;

            const chatWindow = document.getElementById('chat-window');
            chatWindow.scrollTop = chatWindow.scrollHeight;
        } else {
            clearInterval(interval);
            element.innerHTML = finalHTML;

            const input = document.getElementById('message-input');
            input.disabled = false;
            input.focus();
        }
    }, 5);
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    const chatWindow = document.getElementById('chat-window');

    if (message === '') return;

    // Hiển thị tin nhắn người dùng
    const userDiv = document.createElement('div');
    userDiv.className = 'user-message';
    const userTextSpan = document.createElement('span');
    userTextSpan.textContent = `Bạn: ${message}`;
    userDiv.appendChild(userTextSpan);
    chatWindow.appendChild(userDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    input.value = '';
    input.disabled = true;

    try {
        // Gửi tin nhắn đến server, có kèm sessionId
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, sessionId })
        });

        const data = await response.json();

        // Hiển thị phản hồi AI
        const aiDiv = document.createElement('div');
        aiDiv.className = 'ai-message';
        aiDiv.textContent = 'Gemini: ';
        const aiTextSpan = document.createElement('span');
        aiDiv.appendChild(aiTextSpan);
        chatWindow.appendChild(aiDiv);

        const formattedHTML = formatText(data.response);
        const rawText = data.response
            .replace(/\*\*/g, '')
            .replace(/[\*\-]/g, '')
            .replace(/##+/g, '')
            .replace(/\n/g, ' ');

        typeText(aiTextSpan, rawText, formattedHTML);

    } catch (error) {
        console.error('Lỗi gửi tin nhắn:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ai-message';
        errorDiv.textContent = '⚠️ Lỗi: Không thể kết nối đến server.';
        chatWindow.appendChild(errorDiv);
        input.disabled = false;
        input.focus();
    }
}
