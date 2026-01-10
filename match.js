// ========== SISTEMA DE MATCH ==========

// ========== DADOS DO USUÁRIO ATUAL ==========
// Usa configuração do config.js se disponível
let currentUser = typeof USER_CONFIG !== 'undefined' && USER_CONFIG ? {...USER_CONFIG} : {
    id: 1293602874,  // Seu ID do Telegram
    name: "Você",
    photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300"
};

// Tenta pegar dados reais do Telegram (sobrescreve config)
if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    const tg = Telegram.WebApp;
    const telegramUser = tg.initDataUnsafe?.user;
    
    if (telegramUser) {
        currentUser.id = telegramUser.id || currentUser.id;
        currentUser.name = telegramUser.first_name || currentUser.name;
        currentUser.photo = telegramUser.photo_url || currentUser.photo;
        console.log('👤 Usuário do Telegram detectado:', currentUser);
    } else {
        console.log('👤 Usando ID configurado:', currentUser.id);
    }
} else {
    console.log('👤 Telegram não disponível. Usando ID:', currentUser.id);
}

// Simula likes que outros usuários deram em você
// Usa configuração do config.js se disponível, senão usa padrão
const likesRecebidos = typeof LIKES_RECEBIDOS_CONFIG !== 'undefined' && LIKES_RECEBIDOS_CONFIG 
    ? LIKES_RECEBIDOS_CONFIG 
    : [
        { userId: 2, userName: "Lucas", userPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300" },
        { userId: 4, userName: "Rafael", userPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300" },
        { userId: 7, userName: "Camila", userPhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300" }
    ];

console.log('✅ Sistema de Match inicializado');
console.log('🆔 Seu ID:', currentUser.id);
console.log('💕 Perfis que vão dar match:', likesRecebidos.map(l => l.userName).join(', '));

// ========== VERIFICAR SE HÁ MATCH ==========
function checkForMatch(profile) {
    // Verifica se o perfil que você deu like já tinha dado like em você
    const hasMatch = likesRecebidos.some(like => like.userId === profile.id);
    return hasMatch;
}

// ========== ANIMAÇÃO DE MATCH ==========
function showMatchAnimation(profile) {
    // Cria overlay escuro
    const overlay = document.createElement('div');
    overlay.className = 'match-overlay';
    overlay.innerHTML = `
        <div class="match-content" id="match-content-box">
            <div class="match-sparkles">✨</div>
            <h1 class="match-title">É UM MATCH!</h1>
            <p class="match-subtitle">Vocês se curtiram mutuamente! 💕</p>
            
            <div class="match-photos">
                <div class="match-photo-container">
                    <img src="${currentUser.photo}" 
                         class="match-photo match-photo-left" alt="${currentUser.name}">
                </div>
                <div class="match-heart">
                    <i class="fa-solid fa-heart"></i>
                </div>
                <div class="match-photo-container">
                    <img src="${profile.photo}" 
                         class="match-photo match-photo-right" alt="${profile.name}">
                </div>
            </div>
            
            <h2 class="match-name">${profile.name}</h2>
            
            <div class="match-buttons">
                <button id="match-send-message" class="match-btn match-btn-primary">
                    <i class="fa-solid fa-comment-dots"></i>
                    Enviar Mensagem
                </button>
                <button id="match-continue" class="match-btn match-btn-secondary">
                    Continuar Explorando
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Confete MASSIVO
    createMatchConfetti();
    
    // Aguarda o DOM estar pronto antes de adicionar eventos
    setTimeout(() => {
        const btnSendMessage = document.getElementById('match-send-message');
        const btnContinue = document.getElementById('match-continue');
        const contentBox = document.getElementById('match-content-box');
        
        console.log('🔘 Botões encontrados:', { btnSendMessage, btnContinue });
        
        // Evento no botão "Enviar Mensagem"
        if (btnSendMessage) {
            btnSendMessage.addEventListener('click', function(e) {
                console.log('🟢 Clicou em Enviar Mensagem');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                createMatchConversation(profile);
                overlay.remove();
                window.location.href = 'chat.html';
            }, { capture: true });
            
            // Touch para mobile
            btnSendMessage.addEventListener('touchend', function(e) {
                console.log('👆 Touch em Enviar Mensagem');
                e.preventDefault();
                e.stopPropagation();
                
                createMatchConversation(profile);
                overlay.remove();
                window.location.href = 'chat.html';
            }, { capture: true });
        }
        
        // Evento no botão "Continuar Explorando"
        if (btnContinue) {
            btnContinue.addEventListener('click', function(e) {
                console.log('🟢 Clicou em Continuar');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                createMatchConversation(profile);
                overlay.remove();
            }, { capture: true });
            
            // Touch para mobile
            btnContinue.addEventListener('touchend', function(e) {
                console.log('👆 Touch em Continuar');
                e.preventDefault();
                e.stopPropagation();
                
                createMatchConversation(profile);
                overlay.remove();
            }, { capture: true });
        }
        
        // Bloqueia propagação no content box para não fechar ao clicar dentro
        if (contentBox) {
            contentBox.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
        
        // Fecha APENAS ao clicar no fundo (overlay)
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                console.log('🟡 Clicou no overlay (fundo)');
                createMatchConversation(profile);
                overlay.remove();
            }
        });
        
    }, 150);
}

// ========== CRIAR CONVERSA APÓS MATCH ==========
function createMatchConversation(profile) {
    // Verifica se já existe conversa com essa pessoa
    const existingConv = conversations.find(c => c.name === profile.name);
    if (existingConv) return; // Já existe
    
    // Cria nova conversa
    const newConversation = {
        id: conversations.length + 1,
        name: profile.name,
        photo: profile.photo,
        lastMessage: "Vocês deram match! 💕",
        time: "Agora",
        unread: 0,
        online: true,
        messages: [
            { 
                sender: "system", 
                text: `Você e ${profile.name} deram match! Comecem a conversa 💕`, 
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }
        ]
    };
    
    // Adiciona no início da lista
    conversations.unshift(newConversation);
    
    // Salva no localStorage
    saveConversations();
    
    console.log('✅ Nova conversa criada com:', profile.name);
}

// ========== CONFETE ESPECIAL DE MATCH ==========
function createMatchConfetti() {
    const colors = ['#ff0080', '#ff4d4d', '#ff69b4', '#ffd700', '#00ff88'];
    
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'match-confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-20px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 4000);
        }, i * 20);
    }
}

// ========== SALVAR CONVERSAS NO LOCALSTORAGE ==========
function saveConversations() {
    try {
        localStorage.setItem('sparkConversations', JSON.stringify(conversations));
    } catch (e) {
        console.error('Erro ao salvar conversas:', e);
    }
}

// ========== CARREGAR CONVERSAS DO LOCALSTORAGE ==========
function loadConversations() {
    try {
        const saved = localStorage.getItem('sparkConversations');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Mescla conversas salvas com as padrão, sem duplicar
            parsed.forEach(savedConv => {
                const exists = conversations.find(c => c.id === savedConv.id);
                if (!exists) {
                    conversations.push(savedConv);
                }
            });
        }
    } catch (e) {
        console.error('Erro ao carregar conversas:', e);
    }
}

// Carrega conversas ao iniciar
loadConversations();
