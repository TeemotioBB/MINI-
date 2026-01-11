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

// ========== DADOS DE LIKES (VÊM DO BACKEND!) ==========
let likesReceived = [];
let likesSent = [];

let currentTab = 'received';
let selectedProfile = null;

// ========== BUSCAR LIKES RECEBIDOS DO BACKEND ==========
async function loadLikesReceived() {
    console.log('📥 Carregando likes recebidos do servidor...');
    
    try {
        // Pega telegram_id
        let telegramId = null;
        
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
            telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
        } else {
            telegramId = localStorage.getItem('testTelegramId') || '123456789';
        }
        
        console.log('👤 Buscando likes para:', telegramId);
        
        // ✅ BUSCA LIKES RECEBIDOS
        const response = await fetch(`https://mini-production-cf60.up.railway.app/api/likes/received?telegram_id=${telegramId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });
        
        if (response.status === 403) {
            // Não é premium, não pode ver
            console.log('⚠️ Usuário não é premium - não pode ver likes');
            likesReceived = [];
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
            type: like.type
        }));
        
        console.log('✅ Likes recebidos:', likesReceived.length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar likes recebidos:', error);
        likesReceived = [];
    }
}

// ========== BUSCAR LIKES ENVIADOS (OPCIONAL) ==========
async function loadLikesSent() {
    console.log('📤 Carregando likes enviados...');
    
    // Por enquanto vazio, mas você pode implementar depois
    // Precisaria criar uma rota no backend: GET /api/likes/sent
    
    likesSent = [];
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
        if (currentTab === 'received' && !canSeeLikes) {
            return `
                <div class="like-card relative cursor-pointer group" data-id="${like.id}">
                    <div class="relative overflow-hidden rounded-2xl">
                        <img src="${like.photo}" class="w-full h-56 object-cover blur-lg">
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
            <div class="like-card relative cursor-pointer group" data-id="${like.id}">
                <div class="relative overflow-hidden rounded-2xl">
                    <img src="${like.photo}" class="w-full h-56 object-cover transition-transform group-hover:scale-105">
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
            
            // Se é aba recebidas e não é VIP, mostra modal de upgrade
            if (currentTab === 'received' && !canSeeLikes) {
                console.log('❌ Bloqueando acesso - não é VIP');
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
    
    if (!selectedProfile) return;

    modalPhoto.src = selectedProfile.photo;
    modalName.textContent = `${selectedProfile.name}, ${selectedProfile.age}`;
    modalBio.textContent = selectedProfile.bio;

    profileModal.classList.remove('hidden');
    
    setTimeout(() => {
        document.querySelector('.modal-content').style.transform = 'scale(1)';
        document.querySelector('.modal-content').style.opacity = '1';
    }, 10);
}

// ========== FECHAR MODAL ==========
function closeProfileModal() {
    document.querySelector('.modal-content').style.transform = 'scale(0.95)';
    document.querySelector('.modal-content').style.opacity = '0';
    
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

    // ✅ ENVIA LIKE PARA O BACKEND
    try {
        const response = await fetch('https://mini-production-cf60.up.railway.app/api/likes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            },
            body: JSON.stringify({
                to_telegram_id: selectedProfile.telegram_id,
                type: 'like'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Like enviado:', data);

            modalLike.innerHTML = '<i class="fa-solid fa-check text-xl"></i> ' + (data.match ? 'Match!' : 'Like enviado!');
            modalLike.classList.remove('from-green-400', 'to-emerald-500');
            modalLike.classList.add(data.match ? 'from-pink-500' : 'from-green-500', 'to-rose-500');

            setTimeout(() => {
                // Remove da lista
                const index = likesReceived.findIndex(l => l.id === selectedProfile.id);
                if (index > -1) {
                    likesReceived.splice(index, 1);
                }

                closeProfileModal();
                renderLikes();
                
                if (data.match) {
                    showMatchNotification(selectedProfile);
                }
            }, 1000);
        }
    } catch (error) {
        console.error('❌ Erro ao dar like:', error);
    }
});

// ========== REJEITAR NO MODAL ==========
modalDislike.addEventListener('click', () => {
    if (!selectedProfile) return;

    const index = likesReceived.findIndex(l => l.id === selectedProfile.id);
    if (index > -1) {
        likesReceived.splice(index, 1);
    }

    closeProfileModal();
    renderLikes();
});

// ========== MOSTRAR NOTIFICAÇÃO DE MATCH ==========
function showMatchNotification(profile) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-[200] flex items-center gap-3 animate-bounce';
    notification.innerHTML = `
        <i class="fa-solid fa-heart text-2xl"></i>
        <div>
            <p class="font-bold">É um Match! 💕</p>
            <p class="text-xs opacity-90">Você e ${profile.name} deram match!</p>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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
    if (tabReceived && likesReceived.length > 0) {
        tabReceived.innerHTML = `Recebidas (${likesReceived.length})`;
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
