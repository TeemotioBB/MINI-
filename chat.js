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
const bottomNav = document.getElementById('bottom-nav');

// ========== CONFIGURAÇÃO DA API ==========
const API_BASE_URL = 'https://mini-production-cf60.up.railway.app/api';

// ========== DADOS DE CONVERSAS ==========
let conversations = [];
let currentChat = null;
let myUserId = null;
let myTelegramId = null;

// ========== PEGAR MEU TELEGRAM ID ==========
function getMyTelegramId() {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
        return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    return localStorage.getItem('testTelegramId') || '123456789';
}

// ========== BUSCAR MEU USER_ID DO BANCO ==========
async function getMyUserId() {
    try {
        myTelegramId = getMyTelegramId();

        console.log('🔍 Buscando user_id para telegram_id:', myTelegramId);

        const response = await fetch(`${API_BASE_URL}/users/${myTelegramId}`, {
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

// ========== FORMATAR TEMPO ==========
function formatTime(timestamp) {
    if (!timestamp) return 'Agora';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

    return date.toLocaleDateString('pt-BR');
}

// ========== CARREGAR MATCHES DO BACKEND (ÚNICA FONTE DA VERDADE) ==========
async function loadConversationsFromServer() {
    console.log('☁️ Carregando matches do backend...');

    try {
        if (!myTelegramId) {
            myTelegramId = getMyTelegramId();
        }

        console.log('👤 Buscando matches para telegram_id:', myTelegramId);

        const response = await fetch(`${API_BASE_URL}/matches?telegram_id=${myTelegramId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });

        if (!response.ok) {
            console.error('❌ Erro ao carregar matches:', response.status);
            return [];
        }

        const data = await response.json();
        console.log('📦 Matches recebidos do servidor:', data.length);

        if (!myUserId) {
            await getMyUserId();
        }

        conversations = data.map(match => {
            const isUser1 = match.user1_id === myUserId;

            const otherUser = {
                id: isUser1 ? match.user2_id : match.user1_id,
                telegram_id: isUser1 ? match.user2_telegram_id : match.user1_telegram_id,
                name: isUser1 ? match.user2_name : match.user1_name,
                age: isUser1 ? match.user2_age : match.user1_age,
                photo: isUser1 ? (match.user2_photo || match.user2_photos?.[0]) : (match.user1_photo || match.user1_photos?.[0]),
                photos: isUser1 ? match.user2_photos : match.user1_photos
            };

            console.log('✅ Match:', {
                match_id: match.match_id,
                eu_sou: isUser1 ? 'user1' : 'user2',
                outro: otherUser.name,
                outro_id: otherUser.telegram_id
            });

            return {
                id: match.match_id,
                matchId: match.match_id,
                otherUserId: otherUser.id,
                otherTelegramId: otherUser.telegram_id,
                name: otherUser.name,
                photo: otherUser.photo || 'https://via.placeholder.com/100?text=Sem+Foto',
                lastMessage: `Vocês deram match! 💕`,
                time: formatTime(match.matched_at),
                unread: 0,
                online: true,
                matchTimestamp: new Date(match.matched_at).getTime(),
                messages: []
            };
        });

        console.log('✅ Conversas processadas:', conversations.length);
        if (conversations.length > 0) {
            console.log('📋 IDs:', conversations.map(c => ({ id: c.id, name: c.name })));
        }

        return conversations;

    } catch (error) {
        console.error('❌ Erro ao carregar conversas:', error);
        return [];
    }
}

// ========== CARREGAR MENSAGENS DO BACKEND ==========
async function loadMessagesFromServer(matchId) {
    console.log('💬 Carregando mensagens do match:', matchId);

    try {
        const response = await fetch(`${API_BASE_URL}/matches/${matchId}/messages?limit=50`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });

        if (!response.ok) {
            console.error('❌ Erro ao carregar mensagens:', response.status);
            return [];
        }

        const data = await response.json();
        console.log('📦 Mensagens recebidas:', data.length);

        const messages = data.map(msg => ({
            sender: msg.sender_id === myUserId ? 'me' : 'other',
            text: msg.content,
            time: new Date(msg.created_at).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            id: msg.id,
            fromServer: true
        }));

        return messages;

    } catch (error) {
        console.error('❌ Erro ao carregar mensagens:', error);
        return [];
    }
}

// ========== RENDERIZAR LISTA ==========
function renderChatList() {
    console.log('🎨 Renderizando lista de conversas...');

    if (!conversations || conversations.length === 0) {
        chatList.innerHTML = '';
        noChats.classList.remove('hidden');
        return;
    }

    noChats.classList.add('hidden');

    chatList.innerHTML = conversations.map(conv => `
        <div class="chat-item flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition-all" data-chat-id="${conv.id}">
            <div class="relative">
                <img src="${conv.photo}" class="w-14 h-14 rounded-full object-cover border-2 border-white shadow" onerror="this.src='https://via.placeholder.com/100?text=Foto'">
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
    `).join('');

    // Adiciona eventos de click
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', async () => {
            const chatId = parseInt(item.dataset.chatId);
            console.log('🖱️ Click na conversa, ID:', chatId);
            try {
                await openChat(chatId);
            } catch (err) {
                console.error('❌ Erro ao abrir chat:', err);
                alert('Erro ao abrir conversa. Tente novamente.');
            }
        });
    });

    console.log('✅ Lista renderizada com', conversations.length, 'conversas');
}

// ========== ABRIR CONVERSA ==========
async function openChat(chatId) {
    console.log('💬 Abrindo chat ID:', chatId);

    const numericChatId = parseInt(chatId);

    if (isNaN(numericChatId) || numericChatId <= 0) {
        console.error('❌ Chat ID inválido:', chatId);
        throw new Error('ID de conversa inválido');
    }

    console.log('🔍 Procurando conversa no array...');
    console.log('📊 Total disponível:', conversations.length);
    console.log('📋 IDs:', conversations.map(c => c.id));

    currentChat = conversations.find(c => c.id === numericChatId);

    if (!currentChat) {
        console.error('❌ Conversa não encontrada!');
        console.log('🔄 Recarregando do backend...');
        
        await loadConversationsFromServer();
        currentChat = conversations.find(c => c.id === numericChatId);
        
        if (!currentChat) {
            console.error('❌ Conversa não existe no backend!');
            throw new Error('Conversa não encontrada: ' + numericChatId);
        }
    }

    console.log('✅ Conversa encontrada:', currentChat.name);

    // Atualiza UI
    chatUserName.textContent = currentChat.name;
    chatUserPhoto.src = currentChat.photo;
    
    // Carrega mensagens
    const serverMessages = await loadMessagesFromServer(numericChatId);

    if (serverMessages.length > 0) {
        currentChat.messages = serverMessages;
    } else {
        // Mensagem de sistema se não tiver mensagens
        currentChat.messages = [{
            sender: 'system',
            text: `🎉 Parabéns! Você e ${currentChat.name} deram match!`,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }];
    }

    // Renderiza
    renderMessages();

    // Muda tela
    chatListScreen.classList.add('hidden');
    if (bottomNav) bottomNav.classList.add('hidden');
    chatScreen.classList.remove('hidden');

    setTimeout(() => scrollToBottom(), 150);
}

// ========== RENDERIZAR MENSAGENS ==========
function renderMessages() {
    if (!currentChat || !messagesContainer) {
        console.error('❌ Erro: currentChat ou messagesContainer não existe');
        return;
    }

    try {
        messagesContainer.innerHTML = currentChat.messages.map(msg => {
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

        setTimeout(() => scrollToBottom(), 50);
    } catch (error) {
        console.error('❌ Erro ao renderizar mensagens:', error);
    }
}

// ========== ENVIAR MENSAGEM ==========
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;

    const now = new Date();
    const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (!currentChat.messages) {
        currentChat.messages = [];
    }

    const newMessage = {
        sender: 'me',
        text: text,
        time: time,
        pending: true
    };

    currentChat.messages.push(newMessage);
    currentChat.lastMessage = text;
    currentChat.time = "Agora";

    messageInput.value = '';
    renderMessages();
    setTimeout(() => scrollToBottom(), 50);

    try {
        const response = await fetch(`${API_BASE_URL}/matches/${currentChat.id}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            },
            body: JSON.stringify({
                content: text,
                telegram_id: myTelegramId
            })
        });

        if (response.ok) {
            const data = await response.json();
            newMessage.pending = false;
            newMessage.id = data.id;
            newMessage.fromServer = true;
            console.log('✅ Mensagem enviada ao servidor');
        } else {
            newMessage.error = true;
            console.error('❌ Erro ao enviar mensagem');
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        newMessage.error = true;
    }
}

// ========== SCROLL ==========
function scrollToBottom() {
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// ========== EVENTOS ==========
if (backToList) {
    backToList.addEventListener('click', () => {
        chatScreen.classList.add('hidden');
        chatListScreen.classList.remove('hidden');
        if (bottomNav) bottomNav.classList.remove('hidden');
        currentChat = null;
        // Recarrega lista ao voltar
        loadConversationsFromServer().then(() => renderChatList());
    });
}

if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}

if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// ========== INICIALIZAÇÃO ==========
console.log('🚀 chat.js iniciando...');

getMyUserId().then(async () => {
    // Carrega conversas do backend
    await loadConversationsFromServer();
    renderChatList();

    // ✅ Verifica se deve abrir chat automaticamente (vindo do match)
    const openChatId = localStorage.getItem('openChatId');

    if (openChatId) {
        console.log('🎯 Abrindo chat automaticamente:', openChatId);
        
        // Remove flag imediatamente
        localStorage.removeItem('openChatId');

        // Aguarda um pouco e tenta abrir
        setTimeout(async () => {
            const chatId = parseInt(openChatId);
            if (!isNaN(chatId) && chatId > 0) {
                try {
                    await openChat(chatId);
                } catch (err) {
                    console.error('❌ Erro ao abrir chat:', err);
                    alert('Erro ao abrir conversa. Por favor, selecione manualmente.');
                }
            }
        }, 500);
    }
});

console.log('✅ chat.js carregado!');
