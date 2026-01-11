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

// ========== DADOS SIMULADOS DE LIKES ==========
// ========== LIKES RECEBIDOS ==========
// Os likes virão do banco de dados via API
const likesReceived = [];

// ========== LIKES ENVIADOS ==========
// Os likes virão do banco de dados via API
const likesSent = [];

let currentTab = 'received';
let selectedProfile = null;

// ========== RENDERIZAR GRID DE LIKES ==========
function renderLikes() {
    const likes = currentTab === 'received' ? likesReceived : likesSent;
    
    if (likes.length === 0) {
        likesGrid.classList.add('hidden');
        noLikes.classList.remove('hidden');
        return;
    }

    likesGrid.classList.remove('hidden');
    noLikes.classList.add('hidden');

    // âœ… VERIFICAÃ‡ÃƒO VIP - PODE VER LIKES RECEBIDOS?
    const canSeeLikes = window.vipSystem ? window.vipSystem.canSeeLikes() : false;

    console.log('ðŸ” Pode ver likes recebidos?', canSeeLikes);
    console.log('ðŸ“Š Tab atual:', currentTab);

    likesGrid.innerHTML = likes.map(like => {
        // Se Ã© aba de "Recebidas" e NÃƒO Ã© VIP, mostra bloqueado
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
                    
                    ${currentTab === 'received' ? `
                        <div class="absolute top-3 right-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-2 py-1 rounded-full text-[10px] font-bold uppercase">
                            Novo
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
            
            // Se Ã© aba recebidas e nÃ£o Ã© VIP, mostra modal de upgrade
            if (currentTab === 'received' && !canSeeLikes) {
                console.log('âŒ Bloqueando acesso - nÃ£o Ã© VIP');
                if (window.vipSystem) {
                    window.vipSystem.showUpgradeModal('viewLikes');
                }
                return;
            }
            
            console.log('âœ… Abrindo perfil ID:', id);
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
modalLike.addEventListener('click', () => {
    if (!selectedProfile) return;

    // âœ… VERIFICAÃ‡ÃƒO VIP - PODE DAR LIKE?
    if (window.vipSystem && !window.vipSystem.registerLike()) {
        console.log('âŒ Limite de likes atingido');
        closeProfileModal();
        return;
    }

    modalLike.innerHTML = '<i class="fa-solid fa-check text-xl"></i> Match!';
    modalLike.classList.remove('from-green-400', 'to-emerald-500');
    modalLike.classList.add('from-pink-500', 'to-rose-500');

    setTimeout(() => {
        const index = likesReceived.findIndex(l => l.id === selectedProfile.id);
        if (index > -1) {
            likesReceived.splice(index, 1);
        }

        closeProfileModal();
        renderLikes();
        
        showMatchNotification(selectedProfile);
    }, 1000);
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

// ========== MOSTRAR NOTIFICAÃ‡ÃƒO DE MATCH ==========
function showMatchNotification(profile) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-[200] flex items-center gap-3 animate-bounce';
    notification.innerHTML = `
        <i class="fa-solid fa-heart text-2xl"></i>
        <div>
            <p class="font-bold">Ã‰ um Match! ðŸ’•</p>
            <p class="text-xs opacity-90">VocÃª e ${profile.name} deram match!</p>
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

// ========== INICIALIZAR ==========
console.log('ðŸš€ likes.js iniciando...');

setTimeout(() => {
    if (window.vipSystem) {
        window.vipSystem.updateUI();
        console.log('âœ… Sistema VIP integrado na pÃ¡gina de likes');
        console.log('ðŸ‘‘ Ã‰ Premium?', window.vipSystem.isPremium());
        console.log('ðŸ‘ï¸ Pode ver likes?', window.vipSystem.canSeeLikes());
    } else {
        console.warn('âš ï¸ VIP System nÃ£o encontrado');
    }
    renderLikes();
}, 100);

console.log('âœ… likes.js carregado!');
