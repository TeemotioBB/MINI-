// ========== SISTEMA DE MATCH CORRIGIDO ==========

// Função para verificar se há match (AGORA USA RESPOSTA DO BACKEND!)
function checkForMatch(profile) {
    console.log('🔍 Verificando match para:', profile.name);
    // NOTA: Agora o match é verificado pelo backend, não mais por LIKES_RECEBIDOS_CONFIG
    // Esta função é mantida apenas por compatibilidade
    return false;
}

// 🔥 FUNÇÃO PRINCIPAL: Mostra animação de match
function showMatchAnimation(profile, matchId) {
    console.log('🎉 Iniciando animação de match com:', profile.name);
    console.log('🆔 Match ID recebido do servidor:', matchId);
    console.log('📦 Dados do perfil:', { 
        name: profile.name, 
        telegram_id: profile.telegram_id,
        photo: profile.photo 
    });
    
    if (!matchId) {
        console.error('❌ ERRO: matchId não foi recebido do servidor!');
        alert('Erro ao criar match. Por favor, recarregue a página.');
        return;
    }
    
    // Valida que matchId é um número válido
    const validMatchId = parseInt(matchId);
    if (isNaN(validMatchId) || validMatchId <= 0) {
        console.error('❌ ERRO: matchId inválido:', matchId);
        alert('Erro ao criar match. Match ID inválido.');
        return;
    }
    
    console.log('✅ Match ID validado:', validMatchId);
    
    // Busca dados do usuário
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userPhoto = userData.photos && userData.photos[0] 
        ? userData.photos[0] 
        : (typeof USER_CONFIG !== 'undefined' ? USER_CONFIG.photo : 'https://via.placeholder.com/100?text=Você');
    const userName = userData.name || (typeof USER_CONFIG !== 'undefined' ? USER_CONFIG.name : 'Você');

    // Cria overlay de match
    const matchOverlay = document.createElement('div');
    matchOverlay.className = 'match-overlay';
    matchOverlay.innerHTML = `
        <div class="match-content">
            <div class="match-sparkles">✨</div>
            <h1 class="match-title">É um Match!</h1>
            <p class="match-subtitle">Você e ${profile.name} deram like um no outro</p>
            
            <div class="match-photos">
                <div class="match-photo-container">
                    <img src="${userPhoto}" class="match-photo match-photo-left" alt="Você" onerror="this.src='https://via.placeholder.com/100?text=Você'">
                </div>
                <div class="match-heart">💕</div>
                <div class="match-photo-container">
                    <img src="${profile.photo}" class="match-photo match-photo-right" alt="${profile.name}" onerror="this.src='https://via.placeholder.com/100?text=${profile.name}'">
                </div>
            </div>
            
            <h2 class="match-name">${profile.name}</h2>
            
            <div class="match-buttons">
                <a href="chat.html" id="match-send-message" class="match-btn match-btn-primary">
                    <i class="fa-solid fa-paper-plane"></i>
                    Enviar Mensagem
                </a>
                <button id="match-continue" class="match-btn match-btn-secondary">
                    Continuar Explorando
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(matchOverlay);
    
    // Confete de match
    createMatchConfetti();
    
    // ✅ CORREÇÃO CRÍTICA: Aguarda o DOM renderizar antes de adicionar eventos
    setTimeout(() => {
        const sendBtn = document.getElementById('match-send-message');
        const continueBtn = document.getElementById('match-continue');
        
        if (sendBtn) {
            // ✅ REMOVE event listener e usa onclick direto no link
            sendBtn.onclick = (e) => {
                e.preventDefault();
                console.log('🔨 Botão Enviar Mensagem clicado!');
                handleMatchSendMessage(profile, matchOverlay, matchId);
            };
        } else {
            console.error('❌ Botão "Enviar Mensagem" não encontrado!');
        }
        
        if (continueBtn) {
            continueBtn.onclick = (e) => {
                e.preventDefault();
                console.log('➡️ Continuar explorando clicado!');
                handleMatchContinue(profile, matchOverlay, matchId);
            };
        } else {
            console.error('❌ Botão "Continuar" não encontrado!');
        }
    }, 100);
}

// Cria confete de match
function createMatchConfetti() {
    const colors = ['#ff0080', '#ff4d4d', '#ffaa00', '#00aaff', '#aa00ff'];
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'match-confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 4000);
        }, i * 30);
    }
}

// 🔥 HANDLER: Enviar mensagem após match
function handleMatchSendMessage(profile, overlay, matchId) {
    console.log('💬 Criando conversa com:', profile.name);
    console.log('🆔 Usando Match ID do servidor:', matchId);
    
    // Cria a conversa com dados do perfil
    const timestamp = Date.now();
    const newConversation = {
        id: matchId, // 🔥 USA O MATCH_ID DO SERVIDOR!
        matchId: matchId,
        matchTimestamp: timestamp,
        name: profile.name,
        photo: profile.photo,
        otherTelegramId: profile.telegram_id,
        lastMessage: `Vocês deram match! 💕`,
        time: "Agora",
        unread: 0,
        online: true,
        messages: [
            {
                sender: 'system',
                text: `🎉 Parabéns! Você e ${profile.name} deram match! Que tal começar uma conversa?`,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }
        ]
    };
    
    // Carrega conversas existentes
    let conversations = [];
    try {
        const saved = localStorage.getItem('sparkConversations');
        if (saved) {
            conversations = JSON.parse(saved);
            console.log('📦 Conversas carregadas:', conversations.length);
        }
    } catch (e) {
        console.error('❌ Erro ao carregar conversas:', e);
    }
    
    // 🔥 VERIFICA SE JÁ EXISTE CONVERSA COM ESSE MATCH_ID
    const existingIndex = conversations.findIndex(c => c.id === matchId);
    
    if (existingIndex >= 0) {
        console.log('⚠️ Conversa já existe, atualizando...');
        // Atualiza conversa existente
        conversations[existingIndex] = {
            ...conversations[existingIndex],
            ...newConversation,
            messages: [
                ...conversations[existingIndex].messages,
                ...newConversation.messages.filter(m => 
                    !conversations[existingIndex].messages.some(em => em.text === m.text)
                )
            ]
        };
    } else {
        console.log('✅ Criando nova conversa');
        // Adiciona nova conversa no início
        conversations.unshift(newConversation);
    }
    
    // Salva conversas
    try {
        localStorage.setItem('sparkConversations', JSON.stringify(conversations));
        console.log('💾 Conversas salvas:', conversations.length);
        console.log('🔍 Nova conversa salva:', {
            id: newConversation.id,
            matchId: newConversation.matchId,
            name: newConversation.name,
            telegram_id: newConversation.otherTelegramId
        });
        
        // 🔥 VALIDA QUE A CONVERSA FOI SALVA CORRETAMENTE
        const verification = localStorage.getItem('sparkConversations');
        if (verification) {
            const parsed = JSON.parse(verification);
            const found = parsed.find(c => c.id === matchId);
            if (found) {
                console.log('✅ Conversa verificada no localStorage!');
            } else {
                console.error('⚠️ Conversa não encontrada após salvar!');
            }
        }
    } catch (e) {
        console.error('❌ Erro ao salvar conversas:', e);
        overlay.remove(); // Remove overlay antes de mostrar erro
        alert('Erro ao salvar conversa. Tente novamente.');
        return;
    }
    
    // 🔥 MARCA PARA ABRIR O CHAT COM O MATCH_ID!
    localStorage.setItem('openChatId', matchId.toString());
    console.log('📌 Marcado para abrir chat com Match ID:', matchId);
    
    // Remove overlay
    overlay.remove();
    
    // ✅ REDIRECT DIRETO SEM DELAY
    console.log('🚀 Redirecionando para chat.html...');
    window.location.href = 'chat.html';
}

// 🔥 HANDLER: Continuar explorando após match
function handleMatchContinue(profile, overlay, matchId) {
    console.log('✨ Criando conversa em segundo plano para:', profile.name);
    console.log('🆔 Usando Match ID do servidor:', matchId);
    
    // Cria a conversa em segundo plano
    const timestamp = Date.now();
    const newConversation = {
        id: matchId, // 🔥 USA O MATCH_ID DO SERVIDOR!
        matchId: matchId,
        matchTimestamp: timestamp,
        name: profile.name,
        photo: profile.photo,
        otherTelegramId: profile.telegram_id,
        lastMessage: `Vocês deram match! 💕`,
        time: "Agora",
        unread: 1,
        online: true,
        messages: [
            {
                sender: 'system',
                text: `🎉 Parabéns! Você e ${profile.name} deram match! Que tal começar uma conversa?`,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }
        ]
    };
    
    // Carrega e salva conversas
    let conversations = [];
    try {
        const saved = localStorage.getItem('sparkConversations');
        if (saved) {
            conversations = JSON.parse(saved);
        }
    } catch (e) {
        console.error('❌ Erro ao carregar conversas:', e);
    }
    
    // 🔥 VERIFICA SE JÁ EXISTE CONVERSA COM ESSE MATCH_ID
    const existingIndex = conversations.findIndex(c => c.id === matchId);
    
    if (existingIndex >= 0) {
        conversations[existingIndex] = {
            ...conversations[existingIndex],
            ...newConversation,
            messages: [
                ...conversations[existingIndex].messages,
                ...newConversation.messages.filter(m => 
                    !conversations[existingIndex].messages.some(em => em.text === m.text)
                )
            ]
        };
    } else {
        conversations.unshift(newConversation);
    }
    
    // Salva
    try {
        localStorage.setItem('sparkConversations', JSON.stringify(conversations));
        console.log('💾 Conversa salva em segundo plano com Match ID:', matchId);
        console.log('🔍 Conversa criada:', {
            id: newConversation.id,
            matchId: newConversation.matchId,
            name: newConversation.name
        });
    } catch (e) {
        console.error('❌ Erro ao salvar:', e);
        overlay.remove(); // Remove overlay antes de mostrar erro
        showToast('⚠️ Erro ao salvar match', 'error');
        return;
    }
    
    // Remove overlay
    overlay.remove();
    
    // Mostra notificação
    showToast('💕 Match salvo! Veja na aba Chat', 'success');
}

// Toast de notificação
function showToast(message, type = 'success') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };
    
    const toast = document.createElement('div');
    toast.className = `fixed top-4 left-1/2 -translate-x-1/2 ${colors[type]} text-white px-6 py-3 rounded-full shadow-lg z-[60] text-sm font-medium transition-all`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

console.log('✅ match.js carregado e funcionando!');
