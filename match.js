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
    console.log('🎉 Iniciando animação de match com:', profile.name);
    
    // Cria overlay escuro
    const overlay = document.createElement('div');
    overlay.className = 'match-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;';
    
    const content = document.createElement('div');
    content.className = 'match-content';
    content.innerHTML = `
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
            <button type="button" class="match-btn match-btn-primary" data-action="message">
                <i class="fa-solid fa-comment-dots"></i>
                Enviar Mensagem
            </button>
            <button type="button" class="match-btn match-btn-secondary" data-action="continue">
                Continuar Explorando
            </button>
        </div>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    console.log('✅ Overlay adicionado ao DOM');
    
    // Confete MASSIVO
    createMatchConfetti();
    
    // Função para fechar o match
    function closeMatch() {
        console.log('🚪 Fechando tela de match');
        createMatchConversation(profile);
        overlay.remove();
    }
    
    // Função para ir ao chat
    function goToChat() {
        console.log('💬 Indo para o chat');
        createMatchConversation(profile);
        overlay.remove();
        window.location.href = 'chat.html';
    }
    
    // Aguarda renderização
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Pega TODOS os botões
            const allButtons = overlay.querySelectorAll('button');
            console.log('🔍 Botões encontrados:', allButtons.length);
            
            allButtons.forEach((btn, index) => {
                console.log(`Botão ${index}:`, btn.getAttribute('data-action'));
                
                // Remove eventos antigos se existirem
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // Adiciona novo evento
                newBtn.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const action = newBtn.getAttribute('data-action');
                    console.log('🖱️ CLIQUE DETECTADO! Ação:', action);
                    
                    if (action === 'message') {
                        goToChat();
                    } else {
                        closeMatch();
                    }
                };
                
                // Também adiciona onmousedown como backup
                newBtn.onmousedown = function(e) {
                    e.preventDefault();
                    console.log('🖱️ MOUSEDOWN! Ação:', newBtn.getAttribute('data-action'));
                };
                
                // Touch para mobile
                newBtn.ontouchstart = function(e) {
                    console.log('👆 TOUCH START! Ação:', newBtn.getAttribute('data-action'));
                };
                
                newBtn.ontouchend = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const action = newBtn.getAttribute('data-action');
                    console.log('👆 TOUCH END! Ação:', action);
                    
                    if (action === 'message') {
                        goToChat();
                    } else {
                        closeMatch();
                    }
                };
            });
            
            console.log('✅ Eventos configurados');
        });
    });
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
