// ========== SISTEMA DE LIKES - SEM VIP - TUDO LIBERADO ==========

// API_BASE_URL já foi declarado em vip.js que carrega antes deste arquivo

// Estado
let receivedLikes = [];
let sentLikes = [];
let currentTab = 'received';

// Elementos DOM
const likesGrid = document.getElementById('likes-grid');
const noLikes = document.getElementById('no-likes');
const tabReceived = document.getElementById('tab-received');
const tabSent = document.getElementById('tab-sent');
const receivedCount = document.getElementById('received-count');
const sentCount = document.getElementById('sent-count');
const likesBadge = document.getElementById('likes-badge');
const profileModal = document.getElementById('profile-modal');

// ========== PEGAR TELEGRAM ID ==========
function getMyTelegramId() {
    if (window.SPARK_TELEGRAM_ID) {
        return window.SPARK_TELEGRAM_ID;
    }
    
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
        return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    
    return localStorage.getItem('testTelegramId') || '123456789';
}

// ========== CARREGAR LIKES RECEBIDOS ==========
async function loadReceivedLikes() {
    try {
        const telegramId = getMyTelegramId();
        console.log('📥 Carregando likes recebidos para:', telegramId);
        
        const response = await fetch(`${API_BASE_URL}/likes/received/preview?telegram_id=${telegramId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Likes recebidos:', data);
            
            // Remove blur de TODOS os likes (não tem mais sistema VIP)
            receivedLikes = (data.likes || []).map(like => ({
                ...like,
                is_blurred: false // Sempre visível!
            }));
            
            if (receivedCount) {
                receivedCount.textContent = receivedLikes.length;
            }
            
            updateBadge(receivedLikes.length);
            
            return receivedLikes;
        } else {
            console.error('❌ Erro ao buscar likes recebidos:', response.status);
            return [];
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        return [];
    }
}

// ========== CARREGAR LIKES ENVIADOS ==========
async function loadSentLikes() {
    try {
        const telegramId = getMyTelegramId();
        console.log('📤 Carregando likes enviados por:', telegramId);
        
        const response = await fetch(`${API_BASE_URL}/likes/sent?telegram_id=${telegramId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Likes enviados:', data);
            
            sentLikes = (data || []).map(like => ({
                ...like,
                is_blurred: false
            }));
            
            if (sentCount) {
                sentCount.textContent = sentLikes.length;
            }
            
            return sentLikes;
        } else {
            console.error('❌ Erro ao buscar likes enviados:', response.status);
            return [];
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        return [];
    }
}

// ========== ATUALIZAR BADGE ==========
function updateBadge(count) {
    if (likesBadge) {
        if (count > 0) {
            likesBadge.textContent = count > 99 ? '99+' : count;
            likesBadge.classList.remove('hidden');
        } else {
            likesBadge.classList.add('hidden');
        }
    }
}

// ========== RENDERIZAR GRID DE LIKES ==========
function renderLikes() {
    const likes = currentTab === 'received' ? receivedLikes : sentLikes;
    
    console.log('🎨 Renderizando', likes.length, 'likes (tab:', currentTab, ')');
    
    if (!likes || likes.length === 0) {
        if (likesGrid) likesGrid.innerHTML = '';
        if (noLikes) noLikes.classList.remove('hidden');
        return;
    }
    
    if (noLikes) noLikes.classList.add('hidden');
    
    if (likesGrid) {
        likesGrid.innerHTML = likes.map(like => {
            // NUNCA tem blur - sistema VIP removido
            const photo = like.photo_url || like.photos?.[0] || 'https://via.placeholder.com/200x200?text=Foto';
            const name = like.name || 'Usuário';
            const age = like.age || '?';
            const isSuperLike = like.type === 'superlike';
            
            return `
                <div class="like-card relative rounded-2xl overflow-hidden shadow-lg cursor-pointer transform hover:scale-105 transition-all" 
                     data-id="${like.id}" 
                     data-telegram-id="${like.telegram_id || ''}"
                     onclick="openProfileModal(this)">
                    
                    <!-- Foto - SEMPRE VISÍVEL -->
                    <div class="relative">
                        <img 
                            src="${photo}" 
                            class="w-full h-40 object-cover"
                            onerror="this.src='https://via.placeholder.com/200x200?text=Foto'"
                        >
                        
                        ${isSuperLike ? `
                            <!-- Badge Super Like -->
                            <div class="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <i class="fa-solid fa-star text-[10px]"></i> Super
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Info - SEMPRE VISÍVEL -->
                    <div class="p-2 bg-white">
                        <h4 class="font-bold text-gray-800 text-sm truncate">${name}${age !== '?' ? ', ' + age : ''}</h4>
                        ${like.city ? `<p class="text-gray-500 text-xs truncate">${like.city}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// ========== ABRIR MODAL DE PERFIL ==========
function openProfileModal(element) {
    const likes = currentTab === 'received' ? receivedLikes : sentLikes;
    const id = parseInt(element.dataset.id);
    const like = likes.find(l => l.id === id);
    
    if (!like) {
        console.error('Like não encontrado');
        return;
    }
    
    console.log('👤 Abrindo perfil:', like);
    
    // Preenche o modal
    const modalPhoto = document.getElementById('modal-photo');
    const modalName = document.getElementById('modal-name');
    const modalBio = document.getElementById('modal-bio');
    
    if (modalPhoto) modalPhoto.src = like.photo_url || like.photos?.[0] || 'https://via.placeholder.com/400x300?text=Foto';
    if (modalName) modalName.textContent = `${like.name}${like.age ? ', ' + like.age : ''}`;
    if (modalBio) modalBio.textContent = like.bio || 'Sem descrição';
    
    // Salva o ID do perfil atual
    if (profileModal) {
        profileModal.dataset.currentId = like.id;
        profileModal.dataset.currentTelegramId = like.telegram_id;
        profileModal.classList.remove('hidden');
    }
}

// ========== DAR LIKE DE VOLTA ==========
async function likeBack(telegramId) {
    try {
        const myTelegramId = getMyTelegramId();
        
        console.log('💚 Dando like de volta em:', telegramId);
        
        const response = await fetch(`${API_BASE_URL}/likes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            },
            body: JSON.stringify({
                from_telegram_id: myTelegramId,
                to_telegram_id: telegramId,
                type: 'like'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Resposta:', data);
            
            if (data.match) {
                console.log('🎉 MATCH!');
                showMatchToast();
            }
            
            await loadReceivedLikes();
            renderLikes();
            
            return data;
        } else {
            console.error('❌ Erro ao dar like:', response.status);
            showErrorToast('Erro ao curtir. Tente novamente.');
            return null;
        }
    } catch (error) {
        console.error('❌ Erro ao dar like:', error);
        showErrorToast('Erro de conexão. Tente novamente.');
        return null;
    }
}

// ========== DAR DISLIKE EM LIKE RECEBIDO ==========
async function dislikeFromReceivedLikes(telegramId, userId) {
    try {
        const myTelegramId = getMyTelegramId();
        
        console.log('👎 Dando dislike em:', telegramId);
        
        const response = await fetch(`${API_BASE_URL}/likes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            },
            body: JSON.stringify({
                from_telegram_id: myTelegramId,
                to_telegram_id: telegramId,
                type: 'dislike'
            })
        });
        
        if (response.ok) {
            console.log('✅ Dislike registrado com sucesso');
            
            receivedLikes = receivedLikes.filter(like => like.id !== userId);
            
            if (receivedCount) {
                receivedCount.textContent = receivedLikes.length;
            }
            
            updateBadge(receivedLikes.length);
            renderLikes();
            showDislikeToast();
            
            return true;
        } else {
            console.error('❌ Erro ao dar dislike:', response.status);
            showErrorToast('Erro ao rejeitar. Tente novamente.');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao dar dislike:', error);
        showErrorToast('Erro de conexão. Tente novamente.');
        return false;
    }
}

// ========== TOAST DE MATCH ==========
function showMatchToast() {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-red-500 text-white px-6 py-3 rounded-full shadow-lg z-[9999] text-sm font-bold';
    toast.innerHTML = '🎉 É um Match! Veja no Chat';
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// ========== TOAST DE DISLIKE ==========
function showDislikeToast() {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-gray-700 text-white px-6 py-3 rounded-full shadow-lg z-[9999] text-sm font-bold';
    toast.innerHTML = '👋 Usuário removido da lista';
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 2000);
}

// ========== TOAST DE ERRO ==========
function showErrorToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg z-[9999] text-sm font-bold';
    toast.innerHTML = `❌ ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// ========== EVENT LISTENERS ==========

// Tabs
if (tabReceived) {
    tabReceived.addEventListener('click', () => {
        currentTab = 'received';
        tabReceived.classList.add('bg-gradient-to-r', 'from-orange-500', 'to-pink-500', 'text-white');
        tabReceived.classList.remove('text-gray-500');
        tabSent.classList.remove('bg-gradient-to-r', 'from-orange-500', 'to-pink-500', 'text-white');
        tabSent.classList.add('text-gray-500');
        renderLikes();
    });
}

if (tabSent) {
    tabSent.addEventListener('click', () => {
        currentTab = 'sent';
        tabSent.classList.add('bg-gradient-to-r', 'from-orange-500', 'to-pink-500', 'text-white');
        tabSent.classList.remove('text-gray-500');
        tabReceived.classList.remove('bg-gradient-to-r', 'from-orange-500', 'to-pink-500', 'text-white');
        tabReceived.classList.add('text-gray-500');
        renderLikes();
    });
}

// Modal close
const closeModal = document.getElementById('close-modal');
if (closeModal && profileModal) {
    closeModal.addEventListener('click', () => {
        profileModal.classList.add('hidden');
    });
}

// Modal like button
const modalLike = document.getElementById('modal-like');
if (modalLike && profileModal) {
    modalLike.addEventListener('click', async () => {
        const telegramId = profileModal.dataset.currentTelegramId;
        if (telegramId) {
            await likeBack(telegramId);
            profileModal.classList.add('hidden');
        }
    });
}

// Modal dislike button
const modalDislike = document.getElementById('modal-dislike');
if (modalDislike && profileModal) {
    modalDislike.addEventListener('click', async () => {
        const telegramId = profileModal.dataset.currentTelegramId;
        const userId = parseInt(profileModal.dataset.currentId, 10);
        
        if (telegramId && currentTab === 'received') {
            const success = await dislikeFromReceivedLikes(telegramId, userId);
            if (success) {
                profileModal.classList.add('hidden');
            }
        } else {
            profileModal.classList.add('hidden');
        }
    });
}

// Click outside modal
if (profileModal) {
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            profileModal.classList.add('hidden');
        }
    });
}

// ========== INICIALIZAÇÃO ==========
async function init() {
    console.log('🚀 Inicializando likes.js (sem sistema VIP)...');
    
    try {
        await Promise.all([
            loadReceivedLikes(),
            loadSentLikes()
        ]);
        
        renderLikes();
        
        console.log('✅ likes.js inicializado! Todos os likes visíveis! 🎉');
    } catch (error) {
        console.error('❌ Erro ao inicializar likes.js:', error);
    }
}

// Inicia quando o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Expõe funções globalmente
window.openProfileModal = openProfileModal;
window.likeBack = likeBack;
window.dislikeFromReceivedLikes = dislikeFromReceivedLikes;

console.log('✅ likes.js carregado - Sistema VIP removido!');
