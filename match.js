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
                <a href="#" id="match-send-message" class="match-btn match-btn-primary">
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
            sendBtn.onclick = (e) => {
                e.preventDefault();
                console.log('🔨 Botão Enviar Mensagem clicado!');
                handleMatchSendMessage(profile, matchOverlay, validMatchId);
            };
        } else {
            console.error('❌ Botão "Enviar Mensagem" não encontrado!');
        }
        
        if (continueBtn) {
            continueBtn.onclick = (e) => {
                e.preventDefault();
                console.log('➡️ Continuar explorando clicado!');
                handleMatchContinue(profile, matchOverlay, validMatchId);
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
    
    // Valida matchId novamente
    if (!matchId || matchId <= 0) {
        console.error('❌ Match ID inválido!');
        alert('Erro: Match ID inválido. Por favor, recarregue a página.');
        overlay.remove();
        return;
    }
    
    // Cria a conversa com dados do perfil
    const timestamp = Date.now();
    const newConversation = {
        id: matchId,
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
    
    console.log('📝 Conversa criada:', {
        id: newConversation.id,
        matchId: newConversation.matchId,
        name: newConversation.name,
        otherTelegramId: newConversation.otherTelegramId
    });
    
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
        conversations = [];
    }
    
    // Remove conversa duplicada (se existir)
    conversations = conversations.filter(c => c.id !== matchId && c.matchId !== matchId);
    console.log('🧹 Conversas após filtrar duplicadas:', conversations.length);
    
    // Adiciona nova conversa no início
    conversations.unshift(newConversation);
    console.log('➕ Nova conversa adicionada. Total:', conversations.length);
    
    // Salva conversas
    try {
        const conversationsJson = JSON.stringify(conversations);
        localStorage.setItem('sparkConversations', conversationsJson);
        console.log('💾 Conversas salvas no localStorage');
        
        // 🔥 VALIDAÇÃO CRÍTICA: Verifica se salvou corretamente
        const verification = localStorage.getItem('sparkConversations');
        if (!verification) {
            throw new Error('localStorage.setItem não salvou os dados!');
        }
        
        const parsed = JSON.parse(verification);
        const found = parsed.find(c => c.id === matchId);
        
        if (!found) {
            throw new Error('Conversa não encontrada após salvar!');
        }
        
        console.log('✅ Validação OK! Conversa salva:', {
            id: found.id,
            name: found.name,
            matchId: found.matchId
        });
        
    } catch (e) {
        console.error('❌ ERRO CRÍTICO ao salvar conversas:', e);
        overlay.remove();
        alert('Erro ao salvar conversa. Por favor, tente novamente.');
        return;
    }
    
    // 🔥 MARCA PARA ABRIR O CHAT
    try {
        localStorage.setItem('openChatId', matchId.toString());
        console.log('📌 Marcado para abrir chat com Match ID:', matchId);
        
        // Valida que foi salvo
        const savedChatId = localStorage.getItem('openChatId');
        if (savedChatId !== matchId.toString()) {
            throw new Error('openChatId não foi salvo corretamente!');
        }
        console.log('✅ openChatId validado:', savedChatId);
        
    } catch (e) {
        console.error('❌ Erro ao salvar openChatId:', e);
        overlay.remove();
        alert('Erro ao preparar abertura do chat. Tente novamente.');
        return;
    }
    
    // Remove overlay
    overlay.remove();
    
    // ✅ AGUARDA UM POUCO ANTES DE REDIRECIONAR (garante que localStorage sincronizou)
    console.log('⏳ Aguardando 200ms antes de redirecionar...');
    setTimeout(() => {
        console.log('🚀 Redirecionando para chat.html...');
        window.location.href = 'chat.html';
    }, 200);
}

// 🔥 HANDLER: Continuar explorando após match
function handleMatchContinue(profile, overlay, matchId) {
    console.log('✨ Criando conversa em segundo plano para:', profile.name);
    console.log('🆔 Usando Match ID do servidor:', matchId);
    
    // Valida matchId
    if (!matchId || matchId <= 0) {
        console.error('❌ Match ID inválido!');
        overlay.remove();
        showToast('⚠️ Erro ao salvar match', 'error');
        return;
    }
    
    // Cria a conversa em segundo plano
    const timestamp = Date.now();
    const newConversation = {
        id: matchId,
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
        conversations = [];
    }
    
    // Remove duplicadas
    conversations = conversations.filter(c => c.id !== matchId && c.matchId !== matchId);
    
    // Adiciona nova conversa
    conversations.unshift(newConversation);
    
    // Salva
    try {
        localStorage.setItem('sparkConversations', JSON.stringify(conversations));
        console.log('💾 Conversa salva em segundo plano com Match ID:', matchId);
        console.log('🔍 Conversa criada:', {
            id: newConversation.id,
            matchId: newConversation.matchId,
            name: newConversation.name
        });
        
        // Valida
        const verification = localStorage.getItem('sparkConversations');
        if (verification) {
            const parsed = JSON.parse(verification);
            const found = parsed.find(c => c.id === matchId);
            if (found) {
                console.log('✅ Conversa validada no localStorage!');
            }
        }
        
    } catch (e) {
        console.error('❌ Erro ao salvar:', e);
        overlay.remove();
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
