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
let myUserId = null; // ID do usuário atual (user_id do banco, não telegram_id)

// ========== BUSCAR MEU USER_ID DO BANCO ==========
async function getMyUserId() {
    try {
        let telegramId = null;
        
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
            telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
        } else {
            telegramId = localStorage.getItem('testTelegramId') || '123456789';
        }
        
        console.log('🔍 Buscando user_id para telegram_id:', telegramId);
        
        const response = await fetch(`https://mini-production-cf60.up.railway.app/api/users/${telegramId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            myUserId = data.id;
            console.log('✅ Meu user_id:', myUserId, '| Nome:', data.name);
            return myUserId;
        } else {
            console.error('❌ Erro ao buscar user_id');
            return null;
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        return null;
    }
}

// ========== CARREGAR MATCHES DO BACKEND ==========
async function loadConversationsFromServer() {
    console.log('📥 Carregando matches do backend...');
    
    try {
        let telegramId = null;
        
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
            telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
        } else {
            telegramId = localStorage.getItem('testTelegramId') || '123456789';
        }
        
        console.log('👤 Buscando matches para telegram_id:', telegramId);
        
        const response = await fetch(`https://mini-production-cf60.up.railway.app/api/matches?telegram_id=${telegramId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });

        if (!response.ok) {
            console.error('❌ Erro ao carregar matches:', response.status);
            conversations = [];
            return;
        }
        
        const data = await response.json();
        console.log('📦 Dados recebidos do servidor:', data.length, 'matches');
        
        if (!myUserId) {
            await getMyUserId();
        }
        
        // Mapeia os matches para o formato do frontend
        conversations = data.map(match => {
            // Determina qual usuário é o "outro" (não sou eu)
            const isUser1 = match.user1_id === myUserId;
            
            const otherUser = {
                id: isUser1 ? match.user2_id : match.user1_id,
                telegram_id: isUser1 ? match.user2_telegram_id : match.user1_telegram_id,
                name: isUser1 ? match.user2_name : match.user1_name,
                age: isUser1 ? match.user2_age : match.user1_age,
                photo: isUser1 ? (match.user2_photo || match.user2_photos?.[0]) : (match.user1_photo || match.user1_photos?.[0]),
                photos: isUser1 ? match.user2_photos : match.user1_photos
            };
            
            console.log('📌 Match processado:', {
                match_id: match.match_id,
                eu: match.user1_id === myUserId ? match.user1_name : match.user2_name,
                outro: otherUser.name,
                photo: otherUser.photo
            });
            
            return {
                id: match.match_id,
                matchId: match.match_id,
                name: otherUser.name,
                photo: otherUser.photo || 'https://via.placeholder.com/100?text=Sem+Foto',
                lastMessage: `Vocês deram match! 💕`,
                time: formatTime(match.matched_at),
                unread: 0,
                online: true,
                messages: [
                    {
                        sender: 'system',
                        text: `🎉 Parabéns! Você e ${otherUser.name} deram match! Que tal começar uma conversa?`,
                        time: new Date(match.matched_at).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })
                    }
                ]
            };
        });

        console.log('✅ Conversas carregadas do servidor:', conversations.length);
        
        // Salva no localStorage como backup
        saveConversationsToStorage();
        
    } catch (error) {
        console.error('❌ Erro ao carregar conversas:', error);
        
        // Em caso de erro, tenta carregar do localStorage como fallback
        console.log('⚠️ Tentando carregar do localStorage como fallback...');
        loadConversationsFromStorage();
    }
}

// ========== FORMATAR TEMPO ==========
function formatTime(timestamp) {
    if (!timestamp) return 'Agora';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // segundos
    
    if (diff < 60) return 'Agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    
    return date.toLocaleDateString('pt-BR');
}

// ========== CARREGAR CONVERSAS DO LOCALSTORAGE (FALLBACK) ==========
function loadConversationsFromStorage() {
    console.log('📦 Carregando conversas do localStorage (fallback)...');
    try {
        const saved = localStorage.getItem('sparkConversations');
        if (saved) {
            const parsed = JSON.parse(saved);
            console.log('✅ Conversas encontradas no localStorage:', parsed.length);
            conversations = parsed;
        } else {
            console.log('ℹ️ Nenhuma conversa salva no localStorage');
            conversations = [];
        }
    } catch (e) {
        console.error('❌ Erro ao carregar do localStorage:', e);
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
        console.log('💾 Conversas salvas no localStorage:', conversations.length);
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

// Busca meu user_id primeiro
getMyUserId().then(() => {
    console.log('👤 User ID carregado, agora carregando conversas...');
    
    // Carrega conversas do servidor
    loadConversationsFromServer().then(() => {
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
    });
});

console.log('✅ chat.js carregado com sucesso!');
