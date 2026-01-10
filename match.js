// ========== SISTEMA DE MATCH CORRIGIDO ==========

// Função para verificar se há match
function checkForMatch(profile) {
    console.log('🔍 Verificando match para:', profile.name);
    console.log('📋 Likes recebidos configurados:', LIKES_RECEBIDOS_CONFIG);
    
    // Verifica se esse perfil está na lista de quem deu like em você
    const hasMatch = LIKES_RECEBIDOS_CONFIG.some(like => like.userId === profile.id);
    
    console.log(hasMatch ? '✅ MATCH ENCONTRADO!' : '❌ Sem match');
    return hasMatch;
}

// Função para mostrar a tela de match
function showMatchAnimation(profile) {
    console.log('🎉 Iniciando animação de match com:', profile.name);
    
    // Busca dados do usuário
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userPhoto = userData.photos && userData.photos[0] 
        ? userData.photos[0] 
        : USER_CONFIG.photo;
    const userName = userData.name || USER_CONFIG.name;

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
                    <img src="${userPhoto}" class="match-photo match-photo-left" alt="Você">
                </div>
                <div class="match-heart">💕</div>
                <div class="match-photo-container">
                    <img src="${profile.photo}" class="match-photo match-photo-right" alt="${profile.name}">
                </div>
            </div>
            
            <h2 class="match-name">${profile.name}</h2>
            
            <div class="match-buttons">
                <button id="match-send-message" class="match-btn match-btn-primary">
                    <i class="fa-solid fa-paper-plane"></i>
                    Enviar Mensagem
                </button>
                <button id="match-continue" class="match-btn match-btn-secondary">
                    Continuar Explorando
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(matchOverlay);
    
    // Confete de match
    createMatchConfetti();
    
    // CRITICAL: Previne cliques acidentais
    setTimeout(() => {
        const sendBtn = document.getElementById('match-send-message');
        const continueBtn = document.getElementById('match-continue');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📨 Botão Enviar Mensagem clicado!');
                handleMatchSendMessage(profile, matchOverlay);
            });
        }
        
        if (continueBtn) {
            continueBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('➡️ Continuar explorando clicado!');
                handleMatchContinue(profile, matchOverlay);
            });
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

// Handler para enviar mensagem
function handleMatchSendMessage(profile, overlay) {
    console.log('💬 Criando conversa com:', profile.name);
    
    // Cria a conversa
    const timestamp = Date.now();
    const newConversation = {
        id: profile.id,
        matchTimestamp: timestamp, // Adiciona timestamp único
        name: profile.name,
        photo: profile.photo,
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
    
    // Verifica se já existe conversa com esse perfil
    const existingIndex = conversations.findIndex(c => c.id === profile.id);
    
    if (existingIndex >= 0) {
        console.log('⚠️ Conversa já existe, atualizando...');
        // Atualiza conversa existente
        conversations[existingIndex] = {
            ...conversations[existingIndex],
            ...newConversation,
            messages: [
                ...conversations[existingIndex].messages,
                ...newConversation.messages
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
        console.log('📝 Nova conversa:', newConversation);
    } catch (e) {
        console.error('❌ Erro ao salvar conversas:', e);
    }
    
    // Marca para abrir o chat
    localStorage.setItem('openChatId', profile.id.toString());
    console.log('🔖 Marcado para abrir chat:', profile.id);
    
    // Remove overlay
    overlay.remove();
    
    // Pequeno delay para garantir que salvou
    setTimeout(() => {
        console.log('🚀 Redirecionando para chat.html...');
        window.location.href = 'chat.html';
    }, 300);
}

// Handler para continuar explorando
function handleMatchContinue(profile, overlay) {
    console.log('✨ Criando conversa em segundo plano para:', profile.name);
    
    // Cria a conversa em segundo plano
    const timestamp = Date.now();
    const newConversation = {
        id: profile.id,
        matchTimestamp: timestamp,
        name: profile.name,
        photo: profile.photo,
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
    
    // Verifica se já existe
    const existingIndex = conversations.findIndex(c => c.id === profile.id);
    
    if (existingIndex >= 0) {
        conversations[existingIndex] = {
            ...conversations[existingIndex],
            ...newConversation,
            messages: [
                ...conversations[existingIndex].messages,
                ...newConversation.messages
            ]
        };
    } else {
        conversations.unshift(newConversation);
    }
    
    // Salva
    try {
        localStorage.setItem('sparkConversations', JSON.stringify(conversations));
        console.log('💾 Conversa salva em segundo plano');
    } catch (e) {
        console.error('❌ Erro ao salvar:', e);
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
