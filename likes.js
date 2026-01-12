// ========== SISTEMA DE LIKES - VERSÃO CORRIGIDA ==========

const API_BASE_URL = 'https://mini-production-cf60.up.railway.app/api';

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
    // Primeiro tenta da variável global (definida no index.html)
    if (window.SPARK_TELEGRAM_ID) {
        return window.SPARK_TELEGRAM_ID;
    }
    
    // Depois tenta do Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
        return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    
    // Por último, do localStorage
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
            
            receivedLikes = data.likes || [];
            
            // Atualiza contador
            if (receivedCount) {
                receivedCount.textContent = receivedLikes.length;
            }
            
            // Atualiza badge
            updateBadge(receivedLikes.length);
            
            return receivedLikes;
        } else {
            console.error('❌ Erro ao buscar likes recebidos:', response.status);
            
            // Se for 403 (não autorizado), tenta a rota de contagem
            if (response.status === 403) {
                const countResponse = await fetch(`${API_BASE_URL}/likes/count?telegram_id=${telegramId}`);
                if (countResponse.ok) {
                    const countData = await countResponse.json();
                    console.log('📊 Contagem de likes:', countData);
                    
                    // Cria likes "falsos" para mostrar a quantidade
                    receivedLikes = Array(countData.count).fill().map((_, i) => ({
                        id: i,
                        name: '???',
                        photo_url: 'https://via.placeholder.com/200x200?text=%3F',
                        is_blurred: true
                    }));
                    
                    if (receivedCount) {
                        receivedCount.textContent = countData.count;
                    }
                    
                    updateBadge(countData.count);
                }
            }
            
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
            
            // Sent likes should never be blurred (user can see who they liked)
            sentLikes = (data || []).map(like => ({
                ...like,
                is_blurred: false
            }));
            
            // Atualiza contador
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
            const isBlurred = like.is_blurred === true;
            const photo = like.photo_url || like.photos?.[0] || 'https://via.placeholder.com/200x200?text=Foto';
            const name = like.name || '???';
            const age = like.age || '?';
            const isSuperLike = like.type === 'superlike';
            
            return `
                <div class="like-card relative rounded-2xl overflow-hidden shadow-lg cursor-pointer transform hover:scale-105 transition-all" 
                     data-id="${like.id}" 
                     data-telegram-id="${like.telegram_id}"
                     ${!isBlurred ? 'onclick="openProfileModal(this)"' : ''}>
                    
                    <!-- Foto -->
                    <div class="relative">
                        <img 
                            src="${photo}" 
                            class="w-full h-40 object-cover ${isBlurred ? 'blur-lg' : ''}"
                            onerror="this.src='https://via.placeholder.com/200x200?text=Foto'"
                        >
                        
                        ${isBlurred ? `
                            <!-- Overlay para Premium -->
                            <div class="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                                <i class="fa-solid fa-lock text-white text-2xl mb-2"></i>
                                <span class="text-white text-xs font-bold">Premium</span>
                            </div>
                        ` : ''}
                        
                        ${isSuperLike ? `
                            <!-- Badge Super Like -->
                            <div class="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <i class="fa-solid fa-star text-[10px]"></i> Super
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Info -->
                    <div class="p-2 bg-white">
                        <h4 class="font-bold text-gray-800 text-sm truncate">${name}${!isBlurred && age !== '?' ? ', ' + age : ''}</h4>
                        ${like.city && !isBlurred ? `<p class="text-gray-500 text-xs truncate">${like.city}</p>` : ''}
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
    
    if (!like || like.is_blurred) {
        // Se for blurred, mostra modal de premium
        showPremiumModal();
        return;
    }
    
    console.log('👤 Abrindo perfil:', like);
    
    // Preenche o modal
    const modalPhoto = document.getElementById('modal-photo');
    const modalName = document.getElementById('modal-name');
    const modalBio = document.getElementById('modal-bio');
    
    if (modalPhoto) modalPhoto.src = like.photo_url || like.photos?.[0] || 'https://via.placeholder.com/400x300?text=Foto';
    if (modalName) modalName.textContent = `${like.name}, ${like.age}`;
    if (modalBio) modalBio.textContent = like.bio || 'Sem descrição';
    
    // Salva o ID do perfil atual
    if (profileModal) {
        profileModal.dataset.currentId = like.id;
        profileModal.dataset.currentTelegramId = like.telegram_id;
        profileModal.classList.remove('hidden');
    }
}

// ========== MODAL DE PREMIUM ==========
function showPremiumModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 text-center">
            <div class="w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fa-solid fa-crown text-4xl text-white"></i>
            </div>
            <h2 class="text-2xl font-black text-gray-800 mb-2">Quem te curtiu?</h2>
            <p class="text-gray-600 mb-4">Desbloqueie o Premium para ver quem curtiu você!</p>
            <div class="bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl p-4 mb-6">
                <p class="text-sm font-bold text-orange-600">✨ Veja todos os seus admiradores!</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg mb-3">
                Assinar Premium - R$ 29,90/mês
            </button>
            <button onclick="this.closest('.fixed').remove()" class="w-full text-gray-500 font-medium py-2">
                Agora não
            </button>
        </div>
    `;
    document.body.appendChild(modal);
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
                // Match!
                console.log('🎉 MATCH!');
                showMatchToast();
            }
            
            // Recarrega os likes
            await loadReceivedLikes();
            renderLikes();
            
            return data;
        }
    } catch (error) {
        console.error('❌ Erro ao dar like:', error);
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
    modalDislike.addEventListener('click', () => {
        profileModal.classList.add('hidden');
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
    console.log('🚀 Inicializando likes.js...');
    
    try {
        // Carrega likes em paralelo
        await Promise.all([
            loadReceivedLikes(),
            loadSentLikes()
        ]);
        
        // Renderiza a tab ativa
        renderLikes();
        
        console.log('✅ likes.js inicializado!');
    } catch (error) {
        console.error('❌ Erro ao inicializar likes.js:', error);
    }
}

// Inicia quando o DOM carregar
console.log('📜 likes.js carregado, estado do documento:', document.readyState);
if (document.readyState === 'loading') {
    console.log('⏳ Aguardando DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', init);
} else {
    console.log('✅ DOM já carregado, iniciando imediatamente...');
    init();
}

// Expõe funções globalmente
window.openProfileModal = openProfileModal;
window.likeBack = likeBack;

console.log('✅ likes.js carregado!');
