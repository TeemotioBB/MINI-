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

// ========== DADOS DE CONVERSAS ==========
let conversations = [];
let currentChat = null;

// ========== CARREGAR CONVERSAS DO LOCALSTORAGE ==========
function loadConversationsFromStorage() {
    console.log('📦 Carregando conversas do localStorage...');
    try {
        const saved = localStorage.getItem('sparkConversations');
        if (saved) {
            const parsed = JSON.parse(saved);
            console.log('✅ Conversas encontradas:', parsed.length);
            
            // Substitui completamente o array de conversas
            conversations = parsed;
            
            console.log('📝 Conversas carregadas com sucesso!');
        } else {
            console.log('ℹ️ Nenhuma conversa salva ainda');
            conversations = [];
        }
    } catch (e) {
        console.error('❌ Erro ao carregar conversas:', e);
        conversations = [];
    }
}

// ========== RENDERIZAR LISTA DE CONVERSAS ==========
function renderChatList() {
    console.log('🎨 Renderizando lista de conversas...');
    console.log('📊 Total de conversas:', conversations.length);
    
    if (conversations.length === 0) {
        chatList.innerHTML = '';
        noChats.classList.remove('hidden');
        console.log('ℹ️ Nenhuma conversa para exibir');
        return;
    }

    noChats.classList.add('hidden');
    
    chatList.innerHTML = conversations.map(conv => {
        console.log('📌 Renderizando:', conv.name);
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

    console.log('✅ Lista renderizada com sucesso!');

    // Adiciona evento de clique em cada conversa
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const chatId = parseInt(item.dataset.chatId);
            console.log('🖱️ Conversa clicada:', chatId);
            openChat(chatId);
        });
    });
}

// ========== ABRIR CONVERSA ==========
function openChat(chatId) {
    console.log('💬 Abrindo chat ID:', chatId);
    
    currentChat = conversations.find(c => c.id === chatId);
    
    if (!currentChat) {
        console.error('❌ Conversa não encontrada:', chatId);
        return;
    }

    console.log('✅ Conversa encontrada:', currentChat.name);

    // Atualiza informações do header
    chatUserName.textContent = currentChat.name;
    chatUserPhoto.src = currentChat.photo;

    // Marca mensagens como lidas
    currentChat.unread = 0;
    saveConversationsToStorage();

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
    
    console.log('✅ Chat aberto com sucesso!');
}

// ========== RENDERIZAR MENSAGENS ==========
function renderMessages() {
    if (!currentChat) return;

    console.log('💬 Renderizando mensagens para:', currentChat.name);
    console.log('📝 Total de mensagens:', currentChat.messages.length);

    messagesContainer.innerHTML = currentChat.messages.map(msg => {
        // Mensagem do sistema (match)
        if (msg.sender === 'system') {
            return `
                <div class="flex justify-center my-4">
                    <div class="bg-gradient-to-r from-pink-100 to-purple-100 text-gray-700 rounded-2xl px-4 py-2 text-sm text-center max-w-[80%]">
                        ${msg.text}
                    </div>
                </div>
            `;
        }
        
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

    // Scroll múltiplo para garantir
    setTimeout(() => scrollToBottom(), 50);
    setTimeout(() => scrollToBottom(), 100);
    
    console.log('✅ Mensagens renderizadas!');
}

// ========== ENVIAR MENSAGEM ==========
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;

    console.log('📤 Enviando mensagem:', text);

    const now = new Date();
    const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Adiciona mensagem do usuário
    currentChat.messages.push({
        sender: 'me',
        text: text,
        time: time
    });

    // Atualiza última mensagem
    currentChat.lastMessage = text;
    currentChat.time = "Agora";

    // Limpa input
    messageInput.value = '';

    // Renderiza mensagens
    renderMessages();

    // Salva no localStorage
    saveConversationsToStorage();

    // Força scroll imediato
    setTimeout(() => scrollToBottom(), 50);

    console.log('✅ Mensagem enviada!');

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

        currentChat.lastMessage = randomResponse;
        currentChat.time = "Agora";

        renderMessages();
        saveConversationsToStorage();
        
        setTimeout(() => scrollToBottom(), 50);
        
        console.log('🤖 Resposta automática enviada');
    }, 2000);
}

// ========== SALVAR CONVERSAS ==========
function saveConversationsToStorage() {
    try {
        localStorage.setItem('sparkConversations', JSON.stringify(conversations));
        console.log('💾 Conversas salvas:', conversations.length);
    } catch (e) {
        console.error('❌ Erro ao salvar conversas:', e);
    }
}

// ========== SCROLL PARA BAIXO ==========
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ========== AUTO-SCROLL QUANDO TECLADO APARECE ==========
messageInput.addEventListener('focus', () => {
    setTimeout(() => scrollToBottom(), 100);
    setTimeout(() => scrollToBottom(), 300);
    setTimeout(() => scrollToBottom(), 500);
});

messageInput.addEventListener('blur', () => {
    setTimeout(() => scrollToBottom(), 100);
});

// ========== DETECTA RESIZE (TECLADO) ==========
let lastHeight = window.innerHeight;
let scrollInterval = null;

window.addEventListener('resize', () => {
    const currentHeight = window.innerHeight;
    
    if (currentHeight < lastHeight && !chatScreen.classList.contains('hidden')) {
        if (scrollInterval) clearInterval(scrollInterval);
        
        scrollInterval = setInterval(() => scrollToBottom(), 50);
        
        setTimeout(() => {
            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }
            scrollToBottom();
        }, 1000);
    }
    
    lastHeight = currentHeight;
});

// ========== VOLTAR PARA LISTA ==========
backToList.addEventListener('click', () => {
    console.log('⬅️ Voltando para lista de conversas');
    chatScreen.classList.add('hidden');
    chatListScreen.classList.remove('hidden');
    bottomNav.classList.remove('hidden');
    currentChat = null;
    renderChatList();
});

// ========== ENVIAR MENSAGEM (EVENTOS) ==========
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// ========== INICIALIZAÇÃO ==========
console.log('🚀 chat.js iniciando...');

// Carrega conversas
loadConversationsFromStorage();

// Renderiza lista
renderChatList();

// ========== ABRE CHAT AUTOMATICAMENTE SE VIER DO MATCH ==========
const openChatId = localStorage.getItem('openChatId');

if (openChatId) {
    console.log('🎯 Detectado pedido para abrir chat:', openChatId);
    
    // Remove IMEDIATAMENTE para evitar loops
    localStorage.removeItem('openChatId');
    
    // Aguarda um pouco para garantir que tudo carregou
    setTimeout(() => {
        const chatId = parseInt(openChatId);
        console.log('🚀 Abrindo chat automaticamente:', chatId);
        openChat(chatId);
    }, 500);
} else {
    console.log('ℹ️ Nenhum chat para abrir automaticamente');
}

console.log('✅ chat.js carregado com sucesso!');
