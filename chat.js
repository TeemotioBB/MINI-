// ========== ELEMENTOS DO HTML ==========
const chatListScreen = document.getElementById('chat-list-screen');
const chatScreen = document.getElementById('chat-screen');
const chatList = document.getElementById('chat-list');
const noChats = document.getElementById('no-chats');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const backToList = document.getElementById('back-to-list');
const chatUserName = document.getElementById('chat-user-name');
const chatUserPhoto = document.getElementById('chat-user-photo');
const inputContainer = document.getElementById('input-container');
const bottomNav = document.getElementById('bottom-nav');

// ========== DADOS SIMULADOS DE CONVERSAS ==========
const conversations = [
    {
        id: 1,
        name: "Amanda",
        photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300",
        lastMessage: "Oi! Tudo bem? 😊",
        time: "Agora",
        unread: 2,
        online: true,
        messages: [
            { sender: "other", text: "Oi! Vi que deu match 💕", time: "14:30" },
            { sender: "me", text: "Sim! Adorei seu perfil 😊", time: "14:32" },
            { sender: "other", text: "Que legal! O que você gosta de fazer?", time: "14:35" },
            { sender: "me", text: "Adoro viajar e conhecer lugares novos!", time: "14:36" },
            { sender: "other", text: "Oi! Tudo bem? 😊", time: "14:40" }
        ]
    },
    {
        id: 2,
        name: "Lucas",
        photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300",
        lastMessage: "Bora sair algum dia? 🍕",
        time: "2h atrás",
        unread: 0,
        online: false,
        messages: [
            { sender: "other", text: "E aí! Como vai?", time: "12:00" },
            { sender: "me", text: "Tudo ótimo! E você?", time: "12:15" },
            { sender: "other", text: "Bora sair algum dia? 🍕", time: "12:30" }
        ]
    },
    {
        id: 3,
        name: "Júlia",
        photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=300",
        lastMessage: "Também amo séries! Qual tá assistindo?",
        time: "Ontem",
        unread: 1,
        online: true,
        messages: [
            { sender: "other", text: "Oi! Vi que você curte séries", time: "Ontem 20:00" },
            { sender: "me", text: "Sim! Vicio total 📺", time: "Ontem 20:05" },
            { sender: "other", text: "Também amo séries! Qual tá assistindo?", time: "Ontem 20:10" }
        ]
    },
    {
        id: 4,
        name: "Rafael",
        photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300",
        lastMessage: "Show! Depois me manda suas artes",
        time: "2 dias",
        unread: 0,
        online: false,
        messages: [
            { sender: "me", text: "Vi que você é designer!", time: "2 dias 15:00" },
            { sender: "other", text: "Sim! Trabalho com design gráfico", time: "2 dias 15:30" },
            { sender: "other", text: "Show! Depois me manda suas artes", time: "2 dias 15:31" }
        ]
    }
];

let currentChat = null;

// ========== RENDERIZAR LISTA DE CONVERSAS ==========
function renderChatList() {
    console.log('Renderizando lista de conversas...');
    console.log('Número de conversas:', conversations.length);
    
    if (conversations.length === 0) {
        noChats.classList.remove('hidden');
        console.log('Nenhuma conversa encontrada');
        return;
    }

    chatList.innerHTML = conversations.map(conv => {
        console.log('Renderizando conversa:', conv.name);
        return `
        <div class="chat-item flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition-all" data-chat-id="${conv.id}">
            <div class="relative">
                <img src="${conv.photo}" class="w-14 h-14 rounded-full object-cover border-2 border-white shadow">
                ${conv.online ? '<div class="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>' : ''}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-center mb-1">
                    <h3 class="font-bold text-gray-800">${conv.name}</h3>
                    <span class="text-xs text-gray-400">${conv.time}</span>
                </div>
                <p class="text-sm text-gray-500 truncate">${conv.lastMessage}</p>
            </div>
            ${conv.unread > 0 ? `
                <div class="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
                    ${conv.unread}
                </div>
            ` : ''}
        </div>
    `;
    }).join('');

    console.log('HTML inserido:', chatList.innerHTML.length, 'caracteres');

    // Adiciona evento de clique em cada conversa
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const chatId = parseInt(item.dataset.chatId);
            console.log('Conversa clicada:', chatId);
            openChat(chatId);
        });
    });
}

// ========== ABRIR CONVERSA ==========
function openChat(chatId) {
    currentChat = conversations.find(c => c.id === chatId);
    if (!currentChat) return;

    // Atualiza informações do header
    chatUserName.textContent = currentChat.name;
    chatUserPhoto.src = currentChat.photo;

    // Renderiza as mensagens
    renderMessages();

    // Esconde lista e bottom nav, mostra chat
    chatListScreen.classList.add('hidden');
    bottomNav.classList.add('hidden');
    chatScreen.classList.remove('hidden');

    // Scroll para o fim quando abrir o chat
    setTimeout(() => {
        scrollToBottom();
    }, 150);
}

// ========== RENDERIZAR MENSAGENS ==========
function renderMessages() {
    if (!currentChat) return;

    messagesContainer.innerHTML = currentChat.messages.map(msg => {
        const isMe = msg.sender === 'me';
        return `
            <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
                <div class="${isMe ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' : 'bg-white text-gray-800'} 
                            rounded-2xl px-4 py-2 max-w-[70%] shadow-sm">
                    <p class="text-sm">${msg.text}</p>
                    <span class="text-xs ${isMe ? 'text-white/70' : 'text-gray-400'} mt-1 block text-right">${msg.time}</span>
                </div>
            </div>
        `;
    }).join('');

    // Scroll imediato múltiplas vezes para garantir
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 50);
    
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

// ========== ENVIAR MENSAGEM ==========
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;

    const now = new Date();
    const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Adiciona mensagem do usuário
    currentChat.messages.push({
        sender: 'me',
        text: text,
        time: time
    });

    // Limpa input
    messageInput.value = '';

    // Renderiza mensagens
    renderMessages();

    // Força scroll imediato para a última mensagem
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 50);

    // Simula resposta automática após 2 segundos
    setTimeout(() => {
        const responses = [
            "Que legal! 😊",
            "Verdade! Adorei isso",
            "Hahaha muito bom!",
            "Sério? Conta mais!",
            "Também acho! 💕",
            "Combinamos então! 🎉"
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];

        currentChat.messages.push({
            sender: 'other',
            text: randomResponse,
            time: time
        });

        // Atualiza última mensagem na lista
        currentChat.lastMessage = randomResponse;
        currentChat.time = "Agora";

        renderMessages();
        
        // Força scroll para a resposta
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 50);
    }, 2000);
}

// Auto-scroll quando o teclado aparece
messageInput.addEventListener('focus', () => {
    // Força scroll múltiplas vezes para garantir
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
    
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 300);
    
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 500);
});

// Detecta quando o teclado fecha
messageInput.addEventListener('blur', () => {
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
});

// Função helper para scroll suave
function scrollToBottom() {
    // Força scroll imediato
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Detecta mudanças no tamanho da viewport (quando teclado abre/fecha)
let lastHeight = window.innerHeight;
let scrollInterval = null;

window.addEventListener('resize', () => {
    const currentHeight = window.innerHeight;
    
    // Se a altura diminuiu, provavelmente o teclado abriu
    if (currentHeight < lastHeight && !chatScreen.classList.contains('hidden')) {
        // Limpa intervalo anterior se existir
        if (scrollInterval) {
            clearInterval(scrollInterval);
        }
        
        // Força scroll múltiplas vezes durante 1 segundo
        scrollInterval = setInterval(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 50);
        
        setTimeout(() => {
            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }
            // Um último scroll para garantir
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 1000);
    }
    
    lastHeight = currentHeight;
});

// ========== VOLTAR PARA LISTA ==========
backToList.addEventListener('click', () => {
    chatScreen.classList.add('hidden');
    chatListScreen.classList.remove('hidden');
    bottomNav.classList.remove('hidden');
    currentChat = null;
    renderChatList(); // Atualiza a lista
});

// ========== ENVIAR MENSAGEM ==========
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// ========== INICIALIZAR ==========
console.log('Chat.js carregado!');
console.log('Conversas:', conversations);
renderChatList();
