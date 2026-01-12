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

// ========== CARREGAR CONVERSAS DO LOCALSTORAGE ==========
function loadConversationsFromStorage() {
    console.log('📦 Carregando conversas do localStorage...');
    try {
        const saved = localStorage.getItem('sparkConversations');
        if (saved) {
            const parsed = JSON.parse(saved);
            console.log('✅ Conversas encontradas no localStorage:', parsed.length);
            if (parsed.length > 0) {
                console.log('📋 Primeiras conversas:', parsed.slice(0, 3).map(c => ({
                    id: c.id,
                    name: c.name,
                    matchId: c.matchId
                })));
            }
            return parsed;
        } else {
            console.log('ℹ️ Nenhuma conversa salva no localStorage');
            return [];
        }
    } catch (e) {
        console.error('❌ Erro ao carregar do localStorage:', e);
        return [];
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

// ========== CARREGAR MATCHES DO BACKEND ==========
async function loadConversationsFromServer() {
    console.log('🔥 Carregando matches do backend...');

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
        console.log('📦 Dados recebidos do servidor:', data.length, 'matches');

        if (!myUserId) {
            await getMyUserId();
        }

        const backendConversations = data.map(match => {
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
                eu: isUser1 ? match.user1_name : match.user2_name,
                outro: otherUser.name,
                photo: otherUser.photo
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

        console.log('✅ Conversas do backend:', backendConversations.length);
        return backendConversations;

    } catch (error) {
        console.error('❌ Erro ao carregar conversas:', error);
        return [];
    }
}

// ========== CARREGAR MENSAGENS DO BACKEND ==========
async function loadMessagesFromServer(matchId) {
    console.log('🔥 Carregando mensagens do match:', matchId);

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

// ========== MESCLAR CONVERSAS ==========
async function loadAllConversations() {
    console.log('🔄 Carregando TODAS as conversas...');

    // 🔥 PRIORIZA BACKEND (fonte da verdade!)
    const backendConversations = await loadConversationsFromServer();
    console.log('☁️ backend:', backendConversations.length);

    const localConversations = loadConversationsFromStorage();
    console.log('📱 localStorage:', localConversations.length);

    const conversationMap = new Map();

    // ✅ COMEÇA COM BACKEND (sempre correto)
    backendConversations.forEach(conv => {
        conversationMap.set(conv.id, conv);
    });

    // Complementa com mensagens locais não sincronizadas
    localConversations.forEach(conv => {
        if (conversationMap.has(conv.id)) {
            // Se já existe no backend, só adiciona mensagens locais
            const existing = conversationMap.get(conv.id);
            if (conv.messages && conv.messages.length > 0) {
                const localOnlyMessages = conv.messages.filter(m => !m.fromServer && m.sender !== 'system');
                if (localOnlyMessages.length > 0) {
                    existing.messages = [...existing.messages, ...localOnlyMessages];
                }
            }
        } else {
            // Se não existe no backend, é uma conversa local não sincronizada
            console.log('⚠️ Conversa apenas no localStorage:', conv.id, conv.name);
            conversationMap.set(conv.id, conv);
        }
    });

    conversations = Array.from(conversationMap.values());

    conversations.sort((a, b) => {
        const timeA = a.matchTimestamp || 0;
        const timeB = b.matchTimestamp || 0;
        return timeB - timeA;
    });

    console.log('✅ Total mesclado:', conversations.length);
    
    if (conversations.length > 0) {
        console.log('📋 IDs disponíveis:', conversations.map(c => ({ 
            id: c.id, 
            name: c.name 
        })));
    }

    // Salva resultado mesclado
    saveConversationsToStorage();

    return conversations;
}

// ========== RENDERIZAR LISTA ==========
function renderChatList() {
    console.log('🎨 Renderizando lista...');

    if (conversations.length === 0) {
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

    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', async () => {
            const chatId = parseInt(item.dataset.chatId);
            console.log('🖱️ Click on chat item, ID:', chatId);
            try {
                await openChat(chatId);
            } catch (err) {
                console.error('❌ Erro ao abrir chat ao clicar:', err);
                alert('Erro ao abrir conversa. Por favor, tente novamente.');
            }
        });
    });
}

// ========== ABRIR CONVERSA ==========
async function openChat(chatId) {
    console.log('💬 Abrindo chat ID:', chatId, '| Tipo:', typeof chatId);

    // 🔥 GARANTE QUE chatId É UM NÚMERO VÁLIDO
    const numericChatId = typeof chatId === 'string' ? parseInt(chatId) : chatId;

    if (isNaN(numericChatId) || numericChatId <= 0) {
        console.error('❌ Chat ID inválido:', chatId);
        throw new Error('ID de conversa inválido');
    }

    console.log('🔢 Chat ID numérico:', numericChatId);
    console.log('📊 Total de conversas disponíveis:', conversations.length);

    // 🔥 TENTA ENCONTRAR A CONVERSA
    currentChat = conversations.find(c => c.id === numericChatId);

    if (!currentChat) {
        console.error('❌ Conversa não encontrada no array local');
        console.log('🔍 Procurando por ID:', numericChatId);
        console.log('📋 IDs disponíveis:', conversations.map(c => c.id));
        
        // 🔥 FORÇA RECARREGAR DO BACKEND
        console.log('🔄 Tentando recarregar do backend...');
        await loadAllConversations();
        currentChat = conversations.find(c => c.id === numericChatId);
        
        if (!currentChat) {
            console.error('❌ Conversa não encontrada mesmo após recarregar do backend');
            throw new Error('Conversa não encontrada. ID: ' + numericChatId);
        }
    }

    console.log('✅ Conversa encontrada:', currentChat.name, '| Match ID:', currentChat.matchId);

    // Atualiza UI
    chatUserName.textContent = currentChat.name;
    chatUserPhoto.src = currentChat.photo;

    currentChat.unread = 0;
    saveConversationsToStorage();
    
    // Carrega mensagens do servidor
    const serverMessages = await loadMessagesFromServer(numericChatId);

    if (serverMessages.length > 0) {
        const localMessages = currentChat.messages?.filter(m => m.sender === 'system') || [];
        currentChat.messages = [...localMessages, ...serverMessages];
    }

    // Garante que tem pelo menos a mensagem de sistema
    if (!currentChat.messages || currentChat.messages.length === 0) {
        currentChat.messages = [
            {
                sender: 'system',
                text: `🎉 Parabéns! Você e ${currentChat.name} deram match!`,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }
        ];
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
        console.error('❌ Não é possível renderizar mensagens:', {
            currentChat: !!currentChat,
            messagesContainer: !!messagesContainer
        });
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
        messagesContainer.innerHTML = `
            <div class="flex justify-center my-4">
                <div class="bg-red-100 text-red-700 rounded-2xl px-4 py-2 text-sm text-center">
                    ⚠️ Erro ao carregar mensagens. Tente novamente.
                </div>
            </div>
        `;
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
        } else {
            newMessage.error = true;
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        newMessage.error = true;
    }

    saveConversationsToStorage();
}

// ========== SALVAR ==========
function saveConversationsToStorage() {
    try {
        localStorage.setItem('sparkConversations', JSON.stringify(conversations));
        console.log('💾 Conversas salvas:', conversations.length);
    } catch (e) {
        console.error('❌ Erro ao salvar:', e);
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
        renderChatList();
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

// ========== FUNÇÃO PARA ABRIR CHAT VINDO DO MATCH ==========
async function tryOpenChatFromMatch(chatId) {
    console.log('🎯 Tentando abrir chat vindo do match:', chatId);
    
    try {
        // Aguarda um pouco para garantir que o localStorage está sincronizado
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 🔥 FORÇA RECARREGAR DO BACKEND PRIMEIRO!
        console.log('☁️ Recarregando conversas do backend...');
        await loadAllConversations();
        
        // Agora busca a conversa
        const found = conversations.find(c => c.id === chatId);
        
        if (found) {
            console.log('✅ Conversa encontrada após carregar do backend');
            await openChat(chatId);
            return true;
        }
        
        console.error('❌ Conversa não encontrada mesmo após carregar do backend');
        console.log('📋 IDs disponíveis:', conversations.map(c => c.id));
        return false;
        
    } catch (err) {
        console.error('❌ Erro ao abrir chat do match:', err);
        return false;
    }
}

// ========== INICIALIZAÇÃO ==========
console.log('🚀 chat.js iniciando...');

getMyUserId().then(async () => {
    // Carrega conversas
    await loadAllConversations();
    renderChatList();

    // ✅ VERIFICA SE DEVE ABRIR CHAT AUTOMATICAMENTE
    const openChatId = localStorage.getItem('openChatId');

    if (openChatId) {
        console.log('🎯 Solicitação para abrir chat:', openChatId);
        console.log('📊 Total de conversas carregadas:', conversations.length);

        // Remove o flag IMEDIATAMENTE para evitar loops
        localStorage.removeItem('openChatId');

        // Tenta abrir o chat
        const chatId = parseInt(openChatId);
        
        if (!isNaN(chatId) && chatId > 0) {
            const success = await tryOpenChatFromMatch(chatId);
            
            if (!success) {
                console.error('❌ Falha ao abrir chat automaticamente');
                // Mostra mensagem amigável ao usuário
                if (window.Telegram?.WebApp?.showAlert) {
                    window.Telegram.WebApp.showAlert('Erro ao abrir conversa. Por favor, selecione a conversa manualmente.');
                } else {
                    alert('Erro ao abrir conversa. Por favor, selecione a conversa manualmente.');
                }
            }
        } else {
            console.error('❌ Chat ID inválido:', openChatId);
        }
    }
});

console.log('✅ chat.js carregado!');
