// ========== CHAT.JS CORRIGIDO ==========
// Correções: tipos de dados, prioridade absoluta do backend, melhor tratamento de erros

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

// ========== DEBUG: Console com timestamp ==========
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
            // 🔥 CORREÇÃO: Garantir que myUserId é sempre número
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
    debugLog('🌐 === INICIANDO LOAD DO BACKEND ===');

    try {
        if (!myTelegramId) {
            myTelegramId = getMyTelegramId();
            debugLog('⚠️ myTelegramId não estava setado, obtido agora:', myTelegramId);
        }

        if (!myUserId) {
            debugLog('⚠️ myUserId não está setado! Tentando buscar...');
            await getMyUserId();
            if (!myUserId) {
                debugLog('❌ CRÍTICO: myUserId não pôde ser obtido!');
                return [];
            }
        }

        debugLog('👤 Credenciais confirmadas:', { myTelegramId, myUserId, myUserIdType: typeof myUserId });

        const url = `${API_BASE_URL}/matches?telegram_id=${myTelegramId}`;
        debugLog('📡 Fazendo requisição para:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });

        debugLog('📨 Resposta HTTP:', response.status);

        if (!response.ok) {
            debugLog('❌ Erro na resposta:', response.status);
            return [];
        }

        const data = await response.json();
        debugLog('📦 Dados brutos do backend:', {
            quantidade: data.length,
            primeiros: data.slice(0, 2)
        });

        const backendConversations = data.map((match, index) => {
            // 🔥 CORREÇÃO: Converter todos os IDs para número
            const matchUser1Id = parseInt(match.user1_id);
            const matchUser2Id = parseInt(match.user2_id);
            const matchId = parseInt(match.match_id);
            
            debugLog(`🔄 Processando match ${index + 1}/${data.length}:`, {
                match_id: matchId,
                user1_id: matchUser1Id,
                user2_id: matchUser2Id,
                user1_name: match.user1_name,
                user2_name: match.user2_name,
                myUserId: myUserId
            });

            // 🔥 CORREÇÃO: Comparação numérica garantida
            const isUser1 = matchUser1Id === myUserId;
            debugLog(`   ↳ Comparação: ${matchUser1Id} === ${myUserId} ? ${isUser1}`);
            debugLog(`   ↳ Eu sou user${isUser1 ? '1' : '2'}. Meu ID: ${myUserId}`);

            const otherUser = {
                id: isUser1 ? matchUser2Id : matchUser1Id,
                telegram_id: isUser1 ? match.user2_telegram_id : match.user1_telegram_id,
                name: isUser1 ? match.user2_name : match.user1_name,
                age: isUser1 ? match.user2_age : match.user1_age,
                photo: isUser1 ? (match.user2_photo || match.user2_photos?.[0]) : (match.user1_photo || match.user1_photos?.[0])
            };

            debugLog(`   ↳ Outro usuário:`, {
                name: otherUser.name,
                id: otherUser.id,
                telegram_id: otherUser.telegram_id
            });

            const conversation = {
                id: matchId, // 🔥 Sempre número
                matchId: matchId,
                otherUserId: otherUser.id,
                otherTelegramId: otherUser.telegram_id,
                name: otherUser.name,
                photo: otherUser.photo || 'https://via.placeholder.com/100?text=Sem+Foto',
                lastMessage: `Vocês deram match! 💕`,
                time: formatTime(match.matched_at),
                unread: 0,
                online: true,
                matchTimestamp: new Date(match.matched_at).getTime(),
                messages: [{
                    sender: 'system',
                    text: `🎉 Parabéns! Você e ${otherUser.name} deram match!`,
                    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                }]
            };

            debugLog(`   ↳ Conversa criada:`, {
                id: conversation.id,
                matchId: conversation.matchId,
                name: conversation.name
            });

            return conversation;
        });

        debugLog('✅ Total de conversas processadas do backend:', backendConversations.length);
        debugLog('📋 IDs das conversas:', backendConversations.map(c => ({ id: c.id, name: c.name, idType: typeof c.id })));

        return backendConversations;

    } catch (error) {
        debugLog('❌ ERRO CRÍTICO no loadConversationsFromServer:', error);
        return [];
    }
}

// ========== CARREGAR LOCALSTORAGE ==========
function loadConversationsFromStorage() {
    debugLog('📦 Carregando localStorage...');
    try {
        const saved = localStorage.getItem('sparkConversations');
        if (!saved) {
            debugLog('ℹ️ localStorage vazio');
            return [];
        }

        const parsed = JSON.parse(saved);
        
        // 🔥 CORREÇÃO: Garantir que IDs são números
        const normalized = parsed.map(conv => ({
            ...conv,
            id: parseInt(conv.id),
            matchId: parseInt(conv.matchId || conv.id)
        }));
        
        debugLog('✅ localStorage tem', normalized.length, 'conversas');
        if (normalized.length > 0) {
            debugLog('📋 Primeiras do localStorage:', normalized.slice(0, 3).map(c => ({ id: c.id, name: c.name, idType: typeof c.id })));
        }
        return normalized;
    } catch (e) {
        debugLog('❌ Erro ao ler localStorage:', e);
        return [];
    }
}

// ========== MESCLAR CONVERSAS ==========
async function loadAllConversations() {
    debugLog('🔄 === INICIANDO LOAD ALL CONVERSATIONS ===');

    // 🔥 CORREÇÃO: Sempre buscar do backend PRIMEIRO
    const backendConversations = await loadConversationsFromServer();
    debugLog('☁️ backend:', backendConversations.length);

    const localConversations = loadConversationsFromStorage();
    debugLog('📱 localStorage:', localConversations.length);

    // 🔥 PRIORIDADE ABSOLUTA DO BACKEND
    const conversationMap = new Map();

    // Primeiro adiciona do BACKEND (fonte da verdade)
    backendConversations.forEach(conv => {
        conversationMap.set(conv.id, conv);
        debugLog(`   ✅ Adicionado do backend: ID ${conv.id} (${typeof conv.id}) - ${conv.name}`);
    });

    // Depois complementa APENAS com mensagens locais (não adiciona conversas que não existem no backend)
    localConversations.forEach(conv => {
        if (conversationMap.has(conv.id)) {
            const existing = conversationMap.get(conv.id);
            // Adiciona mensagens locais não sincronizadas
            if (conv.messages && conv.messages.length > 0) {
                const localOnlyMessages = conv.messages.filter(m => !m.fromServer && m.sender !== 'system');
                if (localOnlyMessages.length > 0) {
                    existing.messages = [...existing.messages, ...localOnlyMessages];
                    debugLog(`   💬 Adicionadas ${localOnlyMessages.length} mensagens locais ao match ${conv.id}`);
                }
            }
        } else {
            // 🔥 CORREÇÃO: NÃO adicionar conversas que só existem localmente
            // Isso evita conversas "fantasma" que não existem mais no backend
            debugLog(`   ⚠️ Conversa ${conv.id} - ${conv.name} ignorada (não existe no backend)`);
        }
    });

    conversations = Array.from(conversationMap.values());
    conversations.sort((a, b) => (b.matchTimestamp || 0) - (a.matchTimestamp || 0));

    debugLog('✅ Total mesclado:', conversations.length);
    debugLog('📋 IDs finais:', conversations.map(c => ({ id: c.id, idType: typeof c.id, name: c.name })));

    saveConversationsToStorage();

    return conversations;
}

// ========== CARREGAR MENSAGENS ==========
async function loadMessagesFromServer(matchId) {
    debugLog('💬 Carregando mensagens do match:', matchId);

    try {
        const response = await fetch(`${API_BASE_URL}/matches/${matchId}/messages?limit=50`, {
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
            // 🔥 CORREÇÃO: Converter para número no click
            const chatId = parseInt(item.dataset.chatId);
            debugLog('🖱️ Click no chat ID:', chatId, typeof chatId);
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

    // 🔥 CORREÇÃO: Garantir que chatId é número
    const numericChatId = parseInt(chatId);
    if (isNaN(numericChatId) || numericChatId <= 0) {
        debugLog('❌ Chat ID inválido:', chatId);
        throw new Error('ID inválido');
    }

    debugLog('📊 Total de conversas:', conversations.length);
    debugLog('🔍 Procurando conversa com ID:', numericChatId, '(tipo:', typeof numericChatId, ')');
    debugLog('📋 IDs disponíveis:', conversations.map(c => ({ id: c.id, tipo: typeof c.id })));

    // 🔥 CORREÇÃO: Comparação numérica explícita
    currentChat = conversations.find(c => parseInt(c.id) === numericChatId);

    if (!currentChat) {
        debugLog('❌ Conversa NÃO encontrada no array!');
        debugLog('🔄 Recarregando TUDO do backend...');
        
        // 🔥 CORREÇÃO: Forçar refresh completo
        await loadAllConversations();
        currentChat = conversations.find(c => parseInt(c.id) === numericChatId);
        
        if (!currentChat) {
            debugLog('❌ CRÍTICO: Conversa não existe mesmo após reload!');
            debugLog('🔍 IDs após reload:', conversations.map(c => c.id));
            throw new Error('Conversa não encontrada: ' + numericChatId);
        }
    }

    debugLog('✅ Conversa encontrada:', { id: currentChat.id, name: currentChat.name });

    chatUserName.textContent = currentChat.name;
    chatUserPhoto.src = currentChat.photo;

    currentChat.unread = 0;
    saveConversationsToStorage();
    
    const serverMessages = await loadMessagesFromServer(numericChatId);

    if (serverMessages.length > 0) {
        const localMessages = currentChat.messages?.filter(m => m.sender === 'system') || [];
        currentChat.messages = [...localMessages, ...serverMessages];
    }

    if (!currentChat.messages || currentChat.messages.length === 0) {
        currentChat.messages = [{
            sender: 'system',
            text: `🎉 Parabéns! Você e ${currentChat.name} deram match!`,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }];
    }

    renderMessages();

    chatListScreen.classList.add('hidden');
    if (bottomNav) bottomNav.classList.add('hidden');
    chatScreen.classList.remove('hidden');

    setTimeout(() => scrollToBottom(), 150);
    debugLog('✅ Chat aberto com sucesso!');
}

// ========== RENDERIZAR MENSAGENS ==========
function renderMessages() {
    if (!currentChat || !messagesContainer) {
        debugLog('❌ Erro ao renderizar:', { currentChat: !!currentChat, messagesContainer: !!messagesContainer });
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
        debugLog('📡 POST para:', `${API_BASE_URL}/matches/${currentChat.id}/messages`);
        
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

        debugLog('📨 Resposta do envio:', response.status);

        if (response.ok) {
            const data = await response.json();
            newMessage.pending = false;
            newMessage.id = data.id;
            newMessage.fromServer = true;
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
        debugLog('💾 Conversas salvas:', conversations.length);
    } catch (e) {
        debugLog('❌ Erro ao salvar:', e);
    }
}

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

async function tryOpenChatFromMatch(chatId) {
    debugLog('🎯 === ABRINDO CHAT DO MATCH ===', chatId);
    
    try {
        // 🔥 CORREÇÃO: Garantir número
        const numericChatId = parseInt(chatId);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        debugLog('🔄 Recarregando conversas...');
        await loadAllConversations();
        
        const found = conversations.find(c => parseInt(c.id) === numericChatId);
        
        if (found) {
            debugLog('✅ Conversa encontrada!');
            await openChat(numericChatId);
            return true;
        }
        
        debugLog('❌ Conversa não encontrada!');
        debugLog('📋 IDs disponíveis:', conversations.map(c => c.id));
        return false;
        
    } catch (err) {
        debugLog('❌ Erro:', err);
        return false;
    }
}

// ========== INICIALIZAÇÃO ==========
debugLog('🚀 === INICIANDO CHAT.JS ===');

getMyUserId().then(async () => {
    debugLog('✅ User ID obtido:', myUserId, '(tipo:', typeof myUserId, ')');
    
    // 🔥 CORREÇÃO: Limpar localStorage antigo para evitar conflitos
    // localStorage.removeItem('sparkConversations'); // Descomente para forçar limpeza
    
    await loadAllConversations();
    renderChatList();

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

debugLog('✅ chat.js carregado!');
