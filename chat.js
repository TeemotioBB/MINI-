// ========== CHAT.JS COM TEMPO REAL E ÚLTIMA MENSAGEM ==========

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

const API_BASE_URL = 'https://mini-production-cf60.up.railway.app/api';

let conversations = [];
let currentChat = null;
let myUserId = null;
let myTelegramId = null;

// 🔥 Variáveis para polling
let pollingInterval = null;
let lastMessageId = null;
const POLLING_RATE = 3000; // 3 segundos

// ========== DEBUG ==========
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    if (data) {
        console.log(`[${timestamp}] ${message}`, data);
    } else {
        console.log(`[${timestamp}] ${message}`);
    }
}

function getMyTelegramId() {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
        return String(window.Telegram.WebApp.initDataUnsafe.user.id);
    }
    return localStorage.getItem('testTelegramId') || '123456789';
}

async function getMyUserId() {
    try {
        myTelegramId = getMyTelegramId();
        debugLog('🔍 Buscando user_id para telegram_id:', myTelegramId);

        const response = await fetch(`${API_BASE_URL}/users/${myTelegramId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });

        if (response.ok) {
            const data = await response.json();
            myUserId = parseInt(data.id);
            debugLog('✅ Meu user_id encontrado:', { id: myUserId, name: data.name });
            return myUserId;
        } else {
            debugLog('❌ Erro HTTP ao buscar user_id:', response.status);
            return null;
        }
    } catch (error) {
        debugLog('❌ Erro ao buscar user_id:', error);
        return null;
    }
}

// ========== CARREGAR MATCHES DO BACKEND ==========
async function loadConversationsFromServer() {
    debugLog('🌐 === CARREGANDO CONVERSAS DO BACKEND ===');

    try {
        if (!myTelegramId) {
            myTelegramId = getMyTelegramId();
        }

        if (!myUserId) {
            await getMyUserId();
            if (!myUserId) {
                debugLog('❌ CRÍTICO: myUserId não pôde ser obtido!');
                return [];
            }
        }

        const url = `${API_BASE_URL}/matches?telegram_id=${myTelegramId}`;
        debugLog('📡 Requisição para:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });

        if (!response.ok) {
            debugLog('❌ Erro na resposta:', response.status);
            return [];
        }

        const data = await response.json();
        debugLog('📦 Matches recebidos:', data.length);

        const backendConversations = data.map((match) => {
            const matchUser1Id = parseInt(match.user1_id);
            const matchUser2Id = parseInt(match.user2_id);
            const matchId = parseInt(match.match_id);
            
            const isUser1 = matchUser1Id === myUserId;

            const otherUser = {
                id: isUser1 ? matchUser2Id : matchUser1Id,
                telegram_id: isUser1 ? match.user2_telegram_id : match.user1_telegram_id,
                name: isUser1 ? match.user2_name : match.user1_name,
                age: isUser1 ? match.user2_age : match.user1_age,
                photo: isUser1 ? (match.user2_photo || match.user2_photos?.[0]) : (match.user1_photo || match.user1_photos?.[0])
            };

            // 🔥 CORREÇÃO: Usar última mensagem do servidor
            let lastMessage = 'Vocês deram match! 💕';
            let lastMessageTime = formatTime(match.matched_at);
            
            if (match.last_message_content) {
                // Verifica se fui eu que enviei
                const isSentByMe = parseInt(match.last_message_sender_id) === myUserId;
                lastMessage = isSentByMe ? `Você: ${match.last_message_content}` : match.last_message_content;
                lastMessageTime = formatTime(match.last_message_time);
            }

            const conversation = {
                id: matchId,
                matchId: matchId,
                otherUserId: otherUser.id,
                otherTelegramId: otherUser.telegram_id,
                name: otherUser.name,
                photo: otherUser.photo || 'https://via.placeholder.com/100?text=Sem+Foto',
                lastMessage: lastMessage,
                time: lastMessageTime,
                unread: parseInt(match.unread_count) || 0,
                online: true,
                matchTimestamp: new Date(match.last_message_time || match.matched_at).getTime(),
                messages: []
            };

            return conversation;
        });

        debugLog('✅ Conversas processadas:', backendConversations.length);
        return backendConversations;

    } catch (error) {
        debugLog('❌ ERRO:', error);
        return [];
    }
}

// ========== CARREGAR TODAS AS CONVERSAS ==========
async function loadAllConversations() {
    debugLog('🔄 === LOAD ALL CONVERSATIONS ===');

    const backendConversations = await loadConversationsFromServer();
    
    // Backend é a fonte da verdade
    conversations = backendConversations;
    conversations.sort((a, b) => (b.matchTimestamp || 0) - (a.matchTimestamp || 0));

    debugLog('✅ Total:', conversations.length);
    saveConversationsToStorage();

    return conversations;
}

// ========== CARREGAR MENSAGENS ==========
async function loadMessagesFromServer(matchId, afterId = null) {
    debugLog('💬 Carregando mensagens do match:', matchId, afterId ? `(após ID ${afterId})` : '');

    try {
        let url = `${API_BASE_URL}/matches/${matchId}/messages?limit=50`;
        if (afterId) {
            url += `&after_id=${afterId}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });

        if (!response.ok) {
            debugLog('❌ Erro ao carregar mensagens:', response.status);
            return [];
        }

        const data = await response.json();
        debugLog('📦 Mensagens recebidas:', data.length);

        const messages = data.map(msg => ({
            sender: parseInt(msg.sender_id) === myUserId ? 'me' : 'other',
            text: msg.content,
            time: new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            id: msg.id,
            fromServer: true
        }));

        return messages;

    } catch (error) {
        debugLog('❌ Erro:', error);
        return [];
    }
}

// ========== POLLING PARA NOVAS MENSAGENS ==========
function startPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }

    debugLog('🔄 Iniciando polling...');

    pollingInterval = setInterval(async () => {
        if (!currentChat) {
            debugLog('⏸️ Polling pausado (sem chat aberto)');
            return;
        }

        try {
            const newMessages = await loadMessagesFromServer(currentChat.id, lastMessageId);

            if (newMessages.length > 0) {
                debugLog('📬 Novas mensagens recebidas:', newMessages.length);

                // Adiciona apenas mensagens que ainda não existem
                newMessages.forEach(msg => {
                    const exists = currentChat.messages.some(m => m.id === msg.id);
                    if (!exists) {
                        currentChat.messages.push(msg);
                        // Atualiza o lastMessageId
                        if (msg.id > lastMessageId) {
                            lastMessageId = msg.id;
                        }
                    }
                });

                // Atualiza última mensagem na conversa
                const lastMsg = newMessages[newMessages.length - 1];
                currentChat.lastMessage = lastMsg.sender === 'me' ? `Você: ${lastMsg.text}` : lastMsg.text;
                currentChat.time = lastMsg.time;

                renderMessages();
                saveConversationsToStorage();
            }
        } catch (error) {
            debugLog('❌ Erro no polling:', error);
        }
    }, POLLING_RATE);
}

function stopPolling() {
    if (pollingInterval) {
        debugLog('⏹️ Parando polling');
        clearInterval(pollingInterval);
        pollingInterval = null;
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

// ========== RENDERIZAR LISTA ==========
function renderChatList() {
    debugLog('🎨 Renderizando lista...', conversations.length);

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
            debugLog('🖱️ Click no chat ID:', chatId);
            try {
                await openChat(chatId);
            } catch (err) {
                debugLog('❌ Erro ao abrir:', err);
                alert('Erro ao abrir conversa. Tente novamente.');
            }
        });
    });

    debugLog('✅ Lista renderizada!');
}

// ========== ABRIR CHAT ==========
async function openChat(chatId) {
    debugLog('💬 === ABRINDO CHAT ===', chatId);

    const numericChatId = parseInt(chatId);
    if (isNaN(numericChatId) || numericChatId <= 0) {
        debugLog('❌ Chat ID inválido:', chatId);
        throw new Error('ID inválido');
    }

    currentChat = conversations.find(c => parseInt(c.id) === numericChatId);

    if (!currentChat) {
        debugLog('❌ Conversa não encontrada, recarregando...');
        await loadAllConversations();
        currentChat = conversations.find(c => parseInt(c.id) === numericChatId);
        
        if (!currentChat) {
            debugLog('❌ CRÍTICO: Conversa não existe!');
            throw new Error('Conversa não encontrada: ' + numericChatId);
        }
    }

    debugLog('✅ Conversa encontrada:', { id: currentChat.id, name: currentChat.name });

    chatUserName.textContent = currentChat.name;
    
    // Ensure photo is valid before setting
    if (currentChat.photo && typeof currentChat.photo === 'string' && currentChat.photo.trim() !== '') {
        chatUserPhoto.src = currentChat.photo;
    } else {
        chatUserPhoto.src = 'https://via.placeholder.com/100x100/f3f4f6/9ca3af?text=Sem+Foto';
    }

    currentChat.unread = 0;
    
    // Carrega mensagens do servidor
    const serverMessages = await loadMessagesFromServer(numericChatId);

    // Mensagem de sistema + mensagens do servidor
    currentChat.messages = [
        {
            sender: 'system',
            text: `🎉 Parabéns! Você e ${currentChat.name} deram match!`,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        },
        ...serverMessages
    ];

    // Define o último ID de mensagem para o polling
    if (serverMessages.length > 0) {
        lastMessageId = Math.max(...serverMessages.map(m => m.id || 0));
    } else {
        lastMessageId = 0;
    }

    debugLog('📝 lastMessageId definido:', lastMessageId);

    renderMessages();

    chatListScreen.classList.add('hidden');
    if (bottomNav) bottomNav.classList.add('hidden');
    chatScreen.classList.remove('hidden');

    setTimeout(() => scrollToBottom(), 150);

    // 🔥 Inicia polling para novas mensagens
    startPolling();

    debugLog('✅ Chat aberto com sucesso!');
}

// ========== RENDERIZAR MENSAGENS ==========
function renderMessages() {
    if (!currentChat || !messagesContainer) {
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
        debugLog('❌ Erro ao renderizar mensagens:', error);
    }
}

// ========== ENVIAR MENSAGEM ==========
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;

    debugLog('📤 Enviando mensagem:', { text, matchId: currentChat.id });

    const now = new Date();
    const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMessage = {
        sender: 'me',
        text: text,
        time: time,
        pending: true
    };

    currentChat.messages.push(newMessage);
    currentChat.lastMessage = `Você: ${text}`;
    currentChat.time = "Agora";

    messageInput.value = '';
    renderMessages();

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
            
            // Atualiza lastMessageId para o polling não duplicar
            if (data.id > lastMessageId) {
                lastMessageId = data.id;
            }
            
            debugLog('✅ Mensagem enviada! ID:', data.id);
        } else {
            newMessage.error = true;
            debugLog('❌ Erro ao enviar:', response.status);
        }
    } catch (error) {
        debugLog('❌ Erro:', error);
        newMessage.error = true;
    }

    saveConversationsToStorage();
}

function saveConversationsToStorage() {
    try {
        localStorage.setItem('sparkConversations', JSON.stringify(conversations));
    } catch (e) {
        debugLog('❌ Erro ao salvar:', e);
    }
}

function loadConversationsFromStorage() {
    try {
        const saved = localStorage.getItem('sparkConversations');
        if (!saved) return [];
        return JSON.parse(saved).map(conv => ({
            ...conv,
            id: parseInt(conv.id),
            matchId: parseInt(conv.matchId || conv.id)
        }));
    } catch (e) {
        return [];
    }
}

function scrollToBottom() {
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// ========== EVENTOS ==========
if (backToList) {
    backToList.addEventListener('click', async () => {
        // 🔥 Para o polling ao voltar
        stopPolling();
        
        chatScreen.classList.add('hidden');
        chatListScreen.classList.remove('hidden');
        if (bottomNav) bottomNav.classList.remove('hidden');
        currentChat = null;
        lastMessageId = null;
        
        // 🔥 Recarrega a lista para atualizar última mensagem
        await loadAllConversations();
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

async function tryOpenChatFromMatch(chatId) {
    debugLog('🎯 === ABRINDO CHAT DO MATCH ===', chatId);
    
    try {
        const numericChatId = parseInt(chatId);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await loadAllConversations();
        
        const found = conversations.find(c => parseInt(c.id) === numericChatId);
        
        if (found) {
            debugLog('✅ Conversa encontrada!');
            await openChat(numericChatId);
            return true;
        }
        
        debugLog('❌ Conversa não encontrada!');
        return false;
        
    } catch (err) {
        debugLog('❌ Erro:', err);
        return false;
    }
}

// ========== ATUALIZAÇÃO PERIÓDICA DA LISTA ==========
let listRefreshInterval = null;

function startListRefresh() {
    // Atualiza a lista a cada 10 segundos quando NÃO está em um chat
    listRefreshInterval = setInterval(async () => {
        if (!currentChat) {
            debugLog('🔄 Atualizando lista de conversas...');
            await loadAllConversations();
            renderChatList();
        }
    }, 10000);
}

// ========== INICIALIZAÇÃO ==========
debugLog('🚀 === INICIANDO CHAT.JS ===');

getMyUserId().then(async () => {
    debugLog('✅ User ID obtido:', myUserId);
    
    await loadAllConversations();
    renderChatList();

    // Inicia refresh da lista
    startListRefresh();

    const openChatId = localStorage.getItem('openChatId');

    if (openChatId) {
        debugLog('🎯 Solicitação para abrir chat:', openChatId);
        localStorage.removeItem('openChatId');

        const chatId = parseInt(openChatId);
        
        if (!isNaN(chatId) && chatId > 0) {
            const success = await tryOpenChatFromMatch(chatId);
            
            if (!success) {
                debugLog('❌ Falha ao abrir automaticamente');
                alert('Erro ao abrir conversa. Selecione manualmente.');
            }
        }
    }
});

// Limpa intervals quando a página é fechada
window.addEventListener('beforeunload', () => {
    stopPolling();
    if (listRefreshInterval) {
        clearInterval(listRefreshInterval);
    }
});

debugLog('✅ chat.js carregado!');
