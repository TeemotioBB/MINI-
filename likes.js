// ========== ELEMENTOS DO HTML ==========
const tabReceived = document.getElementById('tab-received');
const tabSent = document.getElementById('tab-sent');
const likesGrid = document.getElementById('likes-grid');
const noLikes = document.getElementById('no-likes');
const profileModal = document.getElementById('profile-modal');
const closeModal = document.getElementById('close-modal');
const modalPhoto = document.getElementById('modal-photo');
const modalName = document.getElementById('modal-name');
const modalBio = document.getElementById('modal-bio');
const modalLike = document.getElementById('modal-like');
const modalDislike = document.getElementById('modal-dislike');

// ========== CONFIGURAÇÃO DA API ==========
const API_BASE_URL = 'https://mini-production-cf60.up.railway.app/api';

// ========== DADOS DE LIKES ==========
let likesReceived = [];
let likesSent = [];

let currentTab = 'received';
let selectedProfile = null;

// ========== PEGAR MEU TELEGRAM ID ==========
function getMyTelegramId() {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
        return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    return localStorage.getItem('testTelegramId') || '123456789';
}

// ========== BUSCAR LIKES RECEBIDOS DO BACKEND ==========
async function loadLikesReceived() {
    console.log('📥 Carregando likes recebidos do servidor...');
    
    try {
        const telegramId = getMyTelegramId();
        console.log('👤 Buscando likes para:', telegramId);
        
        // ✅ BUSCA LIKES RECEBIDOS
        const response = await fetch(`${API_BASE_URL}/likes/received?telegram_id=${telegramId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });
        
        if (response.status === 403) {
            // Não é premium - ainda assim podemos mostrar likes com blur
            console.log('⚠️ Usuário não é premium - likes serão mostrados com blur');
            
            // Tenta buscar contagem de likes (se tiver essa rota)
            try {
                const countResponse = await fetch(`${API_BASE_URL}/likes/count?telegram_id=${telegramId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
                    }
                });
                
                if (countResponse.ok) {
                    const countData = await countResponse.json();
                    // Cria likes "fake" com blur para mostrar quantidade
                    likesReceived = Array(countData.count || 0).fill(null).map((_, i) => ({
                        id: i + 1,
                        telegram_id: 0,
                        name: '???',
                        age: '??',
                        gender: 'unknown',
                        photo: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&q=80&w=500',
                        photos: [],
                        bio: 'Assine Premium para ver',
                        city: '',
                        verified: false,
                        time: 'Agora',
                        type: 'like',
                        locked: true
                    }));
                    console.log('🔒 Likes bloqueados criados:', likesReceived.length);
                }
            } catch (e) {
                console.log('ℹ️ Não foi possível buscar contagem de likes');
                likesReceived = [];
            }
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // ✅ MAPEIA PARA O FORMATO DO FRONTEND
        likesReceived = data.map(like => ({
            id: like.id,
            telegram_id: like.telegram_id,
            name: like.name,
            age: like.age,
            gender: like.gender,
            photo: like.photo_url || like.photos?.[0] || 'https://via.placeholder.com/500x600?text=Sem+Foto',
            photos: like.photos || [],
            bio: like.bio || 'Sem bio',
            city: like.city || '',
            verified: like.is_premium || false,
            time: formatTime(like.liked_at),
            type: like.type,
            locked: false
        }));
        
        console.log('✅ Likes recebidos:', likesReceived.length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar likes recebidos:', error);
        likesReceived = [];
    }
}

// ========== BUSCAR LIKES ENVIADOS ==========
async function loadLikesSent() {
    console.log('📤 Carregando likes enviados...');
    
    try {
        const telegramId = getMyTelegramId();
        
        // Se tiver uma rota para likes enviados, use aqui
        // Por enquanto, vamos deixar vazio
        // const response = await fetch(`${API_BASE_URL}/likes/sent?telegram_id=${telegramId}`, ...);
        
        likesSent = [];
        console.log('ℹ️ Likes enviados: funcionalidade em desenvolvimento');
        
    } catch (error) {
        console.error('❌ Erro ao carregar likes enviados:', error);
        likesSent = [];
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

// ========== RENDERIZAR GRID DE LIKES ==========
function renderLikes() {
    const likes = currentTab === 'received' ? likesReceived : likesSent;
    
    console.log('🎨 Renderizando likes:', {
        tab: currentTab,
        count: likes.length
    });
    
    if (likes.length === 0) {
        likesGrid.classList.add('hidden');
        noLikes.classList.remove('hidden');
        return;
    }

    likesGrid.classList.remove('hidden');
    noLikes.classList.add('hidden');

    // ✅ VERIFICAÇÃO VIP
    const canSeeLikes = window.vipSystem ? window.vipSystem.canSeeLikes() : false;

    console.log('💎 Pode ver likes recebidos?', canSeeLikes);
    console.log('📊 Tab atual:', currentTab);

    likesGrid.innerHTML = likes.map(like => {
        // Se é aba de "Recebidas" e NÃO é VIP, mostra bloqueado
        if (currentTab === 'received' && (!canSeeLikes || like.locked)) {
            return `
                <div class="like-card relative cursor-pointer group" data-id="${like.id}" data-locked="true">
                    <div class="relative overflow-hidden rounded-2xl">
                        <img src="${like.photo}" class="w-full h-56 object-cover blur-lg" onerror="this.src='https://via.placeholder.com/500x600?text=Foto'">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-black/40 flex flex-col items-center justify-center">
                            <i class="fa-solid fa-lock text-white text-3xl mb-2"></i>
                            <p class="text-white font-bold text-sm">Premium</p>
                            <p class="text-white/80 text-xs">Assine para ver</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Mostra normalmente para VIP ou aba "Enviadas"
        return `
            <div class="like-card relative cursor-pointer group" data-id="${like.id}" data-locked="false">
                <div class="relative overflow-hidden rounded-2xl">
                    <img src="${like.photo}" class="w-full h-56 object-cover transition-transform group-hover:scale-105" onerror="this.src='https://via.placeholder.com/500x600?text=Foto'">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    
                    ${like.verified ? `
                        <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1">
                            <i class="fa-solid fa-circle-check text-blue-500 text-[10px]"></i>
                        </div>
                    ` : ''}
                    
                    ${currentTab === 'received' && like.type === 'superlike' ? `
                        <div class="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                            <i class="fa-solid fa-star text-[10px]"></i> Super
                        </div>
                    ` : ''}
                    
                    <div class="absolute bottom-0 left-0 right-0 p-3">
                        <h3 class="text-white font-bold text-lg">${like.name}, ${like.age}</h3>
                        <p class="text-white/80 text-xs mt-1">${like.time}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Adiciona evento de clique nos cards
    document.querySelectorAll('.like-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const isLocked = card.dataset.locked === 'true';
            
            // Se é aba recebidas e está bloqueado, mostra modal de upgrade
            if (currentTab === 'received' && isLocked) {
                console.log('❌ Bloqueando acesso - não é VIP ou like bloqueado');
                if (window.vipSystem) {
                    window.vipSystem.showUpgradeModal('viewLikes');
                }
                return;
            }
            
            console.log('✅ Abrindo perfil ID:', id);
            openProfileModal(id);
        });
    });
}

// ========== ABRIR MODAL DE PERFIL ==========
function openProfileModal(id) {
    const likes = currentTab === 'received' ? likesReceived : likesSent;
    selectedProfile = likes.find(l => l.id === id);
    
    if (!selectedProfile) {
        console.error('❌ Perfil não encontrado:', id);
        return;
    }

    modalPhoto.src = selectedProfile.photo;
    modalName.textContent = `${selectedProfile.name}, ${selectedProfile.age}`;
    modalBio.textContent = selectedProfile.bio;

    // Reset do botão de like
    modalLike.innerHTML = '<i class="fa-solid fa-heart text-lg"></i> Curtir';
    modalLike.classList.remove('from-pink-500', 'from-green-500');
    modalLike.classList.add('from-green-400', 'to-emerald-500');

    profileModal.classList.remove('hidden');
    
    setTimeout(() => {
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.transform = 'scale(1)';
            modalContent.style.opacity = '1';
        }
    }, 10);
}

// ========== FECHAR MODAL ==========
function closeProfileModal() {
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.transform = 'scale(0.95)';
        modalContent.style.opacity = '0';
    }
    
    setTimeout(() => {
        profileModal.classList.add('hidden');
        selectedProfile = null;
    }, 200);
}

// ========== DAR LIKE NO MODAL ==========
modalLike.addEventListener('click', async () => {
    if (!selectedProfile) return;

    // ✅ VERIFICAÇÃO VIP
    if (window.vipSystem && !window.vipSystem.registerLike()) {
        console.log('❌ Limite de likes atingido');
        closeProfileModal();
        return;
    }

    console.log('❤️ Dando like em:', selectedProfile.name);
    console.log('📌 Telegram ID:', selectedProfile.telegram_id);

    // Desabilita botão temporariamente
    modalLike.disabled = true;
    modalLike.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-lg"></i> Enviando...';

    // ✅ ENVIA LIKE PARA O BACKEND
    try {
        const myTelegramId = getMyTelegramId();
        
        const response = await fetch(`${API_BASE_URL}/likes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            },
            body: JSON.stringify({
                from_telegram_id: myTelegramId,
                to_telegram_id: selectedProfile.telegram_id,
                type: 'like'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Like enviado:', data);

            if (data.match) {
                modalLike.innerHTML = '<i class="fa-solid fa-heart text-xl"></i> Match! 🎉';
                modalLike.classList.remove('from-green-400', 'to-emerald-500');
                modalLike.classList.add('from-pink-500', 'to-rose-500');
            } else {
                modalLike.innerHTML = '<i class="fa-solid fa-check text-xl"></i> Like enviado!';
                modalLike.classList.remove('from-green-400', 'to-emerald-500');
                modalLike.classList.add('from-green-500', 'to-green-600');
            }

            setTimeout(() => {
                // Remove da lista
                const index = likesReceived.findIndex(l => l.id === selectedProfile.id);
                if (index > -1) {
                    likesReceived.splice(index, 1);
                }

                closeProfileModal();
                renderLikes();
                updateTabCounter();
                
                if (data.match) {
                    showMatchNotification(selectedProfile, data.match_id);
                }
            }, 1000);
        } else {
            const error = await response.json();
            console.error('❌ Erro ao dar like:', error);
            modalLike.innerHTML = '<i class="fa-solid fa-exclamation-triangle text-lg"></i> Erro';
            
            setTimeout(() => {
                modalLike.innerHTML = '<i class="fa-solid fa-heart text-lg"></i> Curtir';
                modalLike.disabled = false;
            }, 2000);
        }
    } catch (error) {
        console.error('❌ Erro ao dar like:', error);
        modalLike.innerHTML = '<i class="fa-solid fa-exclamation-triangle text-lg"></i> Erro';
        
        setTimeout(() => {
            modalLike.innerHTML = '<i class="fa-solid fa-heart text-lg"></i> Curtir';
            modalLike.disabled = false;
        }, 2000);
    }
});

// ========== REJEITAR NO MODAL ==========
modalDislike.addEventListener('click', async () => {
    if (!selectedProfile) return;

    console.log('❌ Rejeitando:', selectedProfile.name);

    // Envia dislike para o backend
    try {
        const myTelegramId = getMyTelegramId();
        
        await fetch(`${API_BASE_URL}/likes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            },
            body: JSON.stringify({
                from_telegram_id: myTelegramId,
                to_telegram_id: selectedProfile.telegram_id,
                type: 'dislike'
            })
        });
    } catch (error) {
        console.error('⚠️ Erro ao enviar dislike (ignorado):', error);
    }

    // Remove da lista
    const index = likesReceived.findIndex(l => l.id === selectedProfile.id);
    if (index > -1) {
        likesReceived.splice(index, 1);
    }

    closeProfileModal();
    renderLikes();
    updateTabCounter();
});

// ========== MOSTRAR NOTIFICAÇÃO DE MATCH ==========
function showMatchNotification(profile, matchId) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-[200] flex items-center gap-3 cursor-pointer';
    notification.innerHTML = `
        <i class="fa-solid fa-heart text-2xl animate-pulse"></i>
        <div>
            <p class="font-bold">É um Match! 💕</p>
            <p class="text-xs opacity-90">Você e ${profile.name} deram match!</p>
        </div>
    `;
    
    // Clique leva para o chat
    notification.addEventListener('click', () => {
        if (matchId) {
            localStorage.setItem('openChatId', matchId.toString());
        }
        window.location.href = 'chat.html';
    });
    
    document.body.appendChild(notification);
    
    // Animação de entrada
    notification.style.animation = 'bounceIn 0.5s ease-out';
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// ========== TROCAR DE TAB ==========
tabReceived.addEventListener('click', () => {
    currentTab = 'received';
    tabReceived.classList.add('bg-gradient-to-r', 'from-orange-500', 'to-pink-500', 'text-white');
    tabReceived.classList.remove('text-gray-500');
    tabSent.classList.remove('bg-gradient-to-r', 'from-orange-500', 'to-pink-500', 'text-white');
    tabSent.classList.add('text-gray-500');
    renderLikes();
});

tabSent.addEventListener('click', () => {
    currentTab = 'sent';
    tabSent.classList.add('bg-gradient-to-r', 'from-orange-500', 'to-pink-500', 'text-white');
    tabSent.classList.remove('text-gray-500');
    tabReceived.classList.remove('bg-gradient-to-r', 'from-orange-500', 'to-pink-500', 'text-white');
    tabReceived.classList.add('text-gray-500');
    renderLikes();
});

// ========== EVENTOS DO MODAL ==========
closeModal.addEventListener('click', closeProfileModal);

profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) {
        closeProfileModal();
    }
});

// ========== ATUALIZAR CONTADOR NA TAB ==========
function updateTabCounter() {
    if (tabReceived) {
        const count = likesReceived.length;
        tabReceived.textContent = `Recebidas (${count})`;
        
        // Também atualiza o badge se existir
        const badge = document.querySelector('[href="likes.html"] .absolute');
        if (badge && count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
        }
    }
    
    if (tabSent) {
        const count = likesSent.length;
        tabSent.textContent = `Enviadas (${count})`;
    }
}

// ========== INICIALIZAR ==========
console.log('🚀 likes.js iniciando...');

setTimeout(async () => {
    // Carrega likes do backend
    await loadLikesReceived();
    await loadLikesSent();
    
    // Atualiza contador
    updateTabCounter();
    
    // Renderiza
    renderLikes();
    
    if (window.vipSystem) {
        window.vipSystem.updateUI();
        console.log('✅ Sistema VIP integrado na página de likes');
        console.log('💎 É Premium?', window.vipSystem.isPremium());
        console.log('👁️ Pode ver likes?', window.vipSystem.canSeeLikes());
    } else {
        console.warn('⚠️ VIP System não encontrado');
    }
}, 100);

console.log('✅ likes.js carregado!');
