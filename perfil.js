// ========== ELEMENTOS DO HTML ==========
const userName = document.getElementById('user-name');
const userAge = document.getElementById('user-age');
const userBio = document.getElementById('user-bio');
const userBioDisplay = document.getElementById('user-bio-display');
const userLocationDisplay = document.getElementById('user-location-display');
const userPlan = document.getElementById('user-plan');
const verifiedBadge = document.getElementById('verified-badge');
const userPhotosGrid = document.getElementById('user-photos-grid');

// Botões principais
const btnManagePhotos = document.getElementById('btn-manage-photos');
const btnEditProfile = document.getElementById('btn-edit-profile');
const btnPrivacy = document.getElementById('btn-privacy');
const btnNotifications = document.getElementById('btn-notifications');
const btnPremium = document.getElementById('btn-premium');
const btnUpgrade = document.getElementById('btn-upgrade');
const btnHelp = document.getElementById('btn-help');
const btnLogout = document.getElementById('btn-logout');

// Modais
const modalEdit = document.getElementById('modal-edit');
const modalPhotos = document.getElementById('modal-photos');
const modalPrivacy = document.getElementById('modal-privacy');
const modalNotifications = document.getElementById('modal-notifications');
const modalPremium = document.getElementById('modal-premium');
const modalHelp = document.getElementById('modal-help');

// Inputs do modal de edição
const inputName = document.getElementById('input-name');
const inputAge = document.getElementById('input-age');
const inputBio = document.getElementById('input-bio');
const inputInstagram = document.getElementById('input-instagram');
const inputCity = document.getElementById('input-city');
const bioCount = document.getElementById('bio-count');

// Modal de fotos
const photosManagerGrid = document.getElementById('photos-manager-grid');
const btnSavePhotos = document.getElementById('btn-save-photos');

// Botões de fechar modais
const btnCloseEdit = document.getElementById('btn-close-edit');
const btnSave = document.getElementById('btn-save');
const btnSubscribe = document.getElementById('btn-subscribe');
const btnBoostOnly = document.getElementById('btn-boost-only');

// Fotos disponíveis para seleção
const availablePhotos = [
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=500",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=500",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=500",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=500",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=500",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=500",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=500",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=500",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=500",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=500"
];

// ========== DADOS DO USUÁRIO ==========
let userData = {
    name: "João Silva",
    age: 28,
    photos: [
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300"
    ],
    bio: "Desenvolvedor • Café ☕ • Viagens ✈️",
    instagram: "@joaosilva",
    city: "São Paulo, SP",
    plan: "Spark Free",
    verified: true,
    privacy: {
        showAge: true,
        showInstagram: true,
        discoverable: true,
        privateProfile: false
    },
    notifications: {
        likes: true,
        matches: true,
        messages: true,
        superLikes: true,
        promo: false
    }
};

// ========== FUNÇÕES PRINCIPAIS ==========

// Renderiza fotos do usuário no grid principal
function renderUserPhotos() {
    userPhotosGrid.innerHTML = '';
    
    // Cria slots para até 4 fotos
    for (let i = 0; i < 4; i++) {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100';
        
        if (userData.photos[i]) {
            photoDiv.innerHTML = `
                <img src="${userData.photos[i]}" class="w-full h-full object-cover" alt="Foto ${i + 1}">
                ${i === 0 ? '<span class="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md">Principal</span>' : ''}
                <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            `;
        } else {
            photoDiv.innerHTML = `
                <div class="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <i class="fa-solid fa-image text-3xl mb-2"></i>
                    <span class="text-xs">Slot ${i + 1}</span>
                </div>
            `;
        }
        
        userPhotosGrid.appendChild(photoDiv);
    }
}

// Renderiza grid de gerenciamento de fotos
function renderPhotosManager() {
    photosManagerGrid.innerHTML = '';
    
    // Cria 4 slots
    for (let i = 0; i < 4; i++) {
        const slot = document.createElement('div');
        slot.className = 'relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300';
        slot.dataset.index = i;
        
        if (userData.photos[i]) {
            // Slot com foto
            slot.classList.remove('border-dashed');
            slot.classList.add('border-solid', 'border-orange-500');
            slot.innerHTML = `
                <img src="${userData.photos[i]}" class="w-full h-full object-cover" alt="Foto ${i + 1}">
                ${i === 0 ? '<span class="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md z-10">Principal</span>' : ''}
                <button class="btn-remove-photo absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-red-600 transition-all" data-index="${i}">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
                <button class="btn-change-photo absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-all flex items-center justify-center text-white z-0" data-index="${i}">
                    <i class="fa-solid fa-camera text-2xl"></i>
                </button>
            `;
        } else {
            // Slot vazio
            slot.innerHTML = `
                <button class="btn-add-photo-slot w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-500 transition-all" data-index="${i}">
                    <i class="fa-solid fa-plus text-3xl mb-2"></i>
                    <span class="text-xs font-medium">Adicionar</span>
                    ${i === 0 ? '<span class="text-[9px] text-gray-400 mt-1">(Principal)</span>' : ''}
                </button>
            `;
        }
        
        photosManagerGrid.appendChild(slot);
    }
    
    // Event listeners
    document.querySelectorAll('.btn-add-photo-slot').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            selectPhoto(index);
        });
    });
    
    document.querySelectorAll('.btn-change-photo').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            selectPhoto(index);
        });
    });
    
    document.querySelectorAll('.btn-remove-photo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            removePhoto(index);
        });
    });
}

// Seleciona foto de uma galeria
function selectPhoto(index) {
    // Cria modal de seleção
    const photoSelector = document.createElement('div');
    photoSelector.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-end animate-slide-up';
    photoSelector.innerHTML = `
        <div class="w-full max-w-[370px] mx-auto bg-white rounded-t-3xl p-6 pb-8 max-h-[80vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-bold text-gray-800">Escolha uma foto</h3>
                <button class="btn-close-selector w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="grid grid-cols-3 gap-3" id="photo-gallery">
                ${availablePhotos.map((photo, i) => `
                    <button class="photo-option aspect-square rounded-xl overflow-hidden hover:ring-4 hover:ring-orange-500 transition-all" data-photo="${photo}">
                        <img src="${photo}" class="w-full h-full object-cover" alt="Opção ${i + 1}">
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(photoSelector);
    
    // Event listeners
    photoSelector.querySelector('.btn-close-selector').addEventListener('click', () => {
        photoSelector.remove();
    });
    
    photoSelector.addEventListener('click', (e) => {
        if (e.target === photoSelector) photoSelector.remove();
    });
    
    photoSelector.querySelectorAll('.photo-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const photoUrl = btn.dataset.photo;
            userData.photos[index] = photoUrl;
            renderPhotosManager();
            photoSelector.remove();
            showToast('📸 Foto adicionada!');
        });
    });
}

// Remove foto
function removePhoto(index) {
    if (index === 0 && userData.photos.length > 1) {
        showToast('⚠️ A primeira foto é a principal. Mova as outras antes de remover.', 'warning');
        return;
    }
    
    if (userData.photos.length === 1) {
        showToast('⚠️ Você precisa ter pelo menos 1 foto', 'warning');
        return;
    }
    
    userData.photos.splice(index, 1);
    renderPhotosManager();
    showToast('🗑️ Foto removida');
}

// Salva fotos
function savePhotos() {
    if (userData.photos.length === 0) {
        showToast('❌ Adicione pelo menos 1 foto', 'error');
        return;
    }
    
    renderUserPhotos();
    closeModal(modalPhotos);
    showToast('✅ Fotos salvas com sucesso!');
    console.log('📸 Fotos salvas:', userData.photos);
}

// Carrega dados do usuário
function loadUserProfile() {
    userName.textContent = userData.name;
    userAge.textContent = `, ${userData.age}`;
    userBioDisplay.textContent = userData.bio;
    userLocationDisplay.innerHTML = `<i class="fa-solid fa-location-dot text-orange-500"></i> ${userData.city}`;
    userPlan.textContent = userData.plan;
    verifiedBadge.style.display = userData.verified ? 'inline' : 'none';
    renderUserPhotos();
}

// Abre modal genérico
function openModal(modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Fecha modal genérico
function closeModal(modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Fecha todos os modais
function closeAllModals() {
    [modalEdit, modalPhotos, modalPrivacy, modalNotifications, modalPremium, modalHelp].forEach(modal => {
        if (modal) closeModal(modal);
    });
}

// Mostra toast (notificação temporária)
function showToast(message, type = 'success') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-orange-500'
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

// Atualiza contador da bio
function updateBioCount() {
    bioCount.textContent = inputBio.value.length;
}

// ========== EDITAR PERFIL ==========

function openEditModal() {
    inputName.value = userData.name;
    inputAge.value = userData.age;
    inputBio.value = userData.bio;
    inputInstagram.value = userData.instagram;
    inputCity.value = userData.city;
    updateBioCount();
    openModal(modalEdit);
}

function saveProfile() {
    // Validação
    if (!inputName.value.trim()) {
        showToast('❌ Nome não pode estar vazio', 'error');
        return;
    }
    
    if (inputAge.value < 18 || inputAge.value > 99) {
        showToast('❌ Idade deve estar entre 18 e 99', 'error');
        return;
    }
    
    // Salva dados
    userData.name = inputName.value.trim();
    userData.age = parseInt(inputAge.value);
    userData.bio = inputBio.value.trim();
    userData.instagram = inputInstagram.value.trim();
    userData.city = inputCity.value.trim();
    
    loadUserProfile();
    closeModal(modalEdit);
    showToast('✅ Perfil atualizado com sucesso!');
    
    // Aqui você salvaria no backend/Telegram
    console.log('📝 Dados salvos:', userData);
}

// ========== TROCAR FOTO ==========

btnChangePhoto.addEventListener('click', () => {
    // Simulação de seletor de foto
    const photos = [
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300",
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300"
    ];
    
    const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
    userData.photo = randomPhoto;
    userPhoto.src = randomPhoto;
    showToast('📸 Foto atualizada!');
    
    // Em produção, aqui abriria um seletor de imagem
});

// ========== PRIVACIDADE ==========

function loadPrivacySettings() {
    document.getElementById('toggle-age').checked = userData.privacy.showAge;
    document.getElementById('toggle-instagram').checked = userData.privacy.showInstagram;
    document.getElementById('toggle-discovery').checked = userData.privacy.discoverable;
    document.getElementById('toggle-private').checked = userData.privacy.privateProfile;
}

function savePrivacySettings() {
    userData.privacy = {
        showAge: document.getElementById('toggle-age').checked,
        showInstagram: document.getElementById('toggle-instagram').checked,
        discoverable: document.getElementById('toggle-discovery').checked,
        privateProfile: document.getElementById('toggle-private').checked
    };
    
    console.log('🔒 Privacidade salva:', userData.privacy);
    showToast('🔒 Configurações de privacidade salvas!');
}

// ========== NOTIFICAÇÕES ==========

function loadNotificationSettings() {
    document.getElementById('notif-likes').checked = userData.notifications.likes;
    document.getElementById('notif-matches').checked = userData.notifications.matches;
    document.getElementById('notif-messages').checked = userData.notifications.messages;
    document.getElementById('notif-superlikes').checked = userData.notifications.superLikes;
    document.getElementById('notif-promo').checked = userData.notifications.promo;
}

function saveNotificationSettings() {
    userData.notifications = {
        likes: document.getElementById('notif-likes').checked,
        matches: document.getElementById('notif-matches').checked,
        messages: document.getElementById('notif-messages').checked,
        superLikes: document.getElementById('notif-superlikes').checked,
        promo: document.getElementById('notif-promo').checked
    };
    
    console.log('🔔 Notificações salvas:', userData.notifications);
    showToast('🔔 Preferências de notificação salvas!');
}

// ========== EVENT LISTENERS ==========

// Editar perfil
btnEditProfile.addEventListener('click', openEditModal);
btnCloseEdit.addEventListener('click', () => closeModal(modalEdit));
btnSave.addEventListener('click', saveProfile);
inputBio.addEventListener('input', updateBioCount);

// Privacidade
btnPrivacy.addEventListener('click', () => {
    loadPrivacySettings();
    openModal(modalPrivacy);
});

// Salva privacidade automaticamente quando muda toggle
document.querySelectorAll('#modal-privacy .toggle-switch').forEach(toggle => {
    toggle.addEventListener('change', savePrivacySettings);
});

// Notificações
btnNotifications.addEventListener('click', () => {
    loadNotificationSettings();
    openModal(modalNotifications);
});

// Salva notificações automaticamente quando muda toggle
document.querySelectorAll('#modal-notifications .toggle-switch').forEach(toggle => {
    toggle.addEventListener('change', saveNotificationSettings);
});

// Premium
btnPremium.addEventListener('click', () => openModal(modalPremium));
btnUpgrade.addEventListener('click', () => openModal(modalPremium));

// Assinar Premium
btnSubscribe.addEventListener('click', () => {
    if (confirm('💎 Confirmar assinatura Spark Premium por R$ 29,90/mês?')) {
        // Aqui você integraria com Telegram Stars ou outro método de pagamento
        showToast('🎉 Processando pagamento...', 'info');
        setTimeout(() => {
            userData.plan = 'Spark Premium';
            loadUserProfile();
            closeModal(modalPremium);
            showToast('👑 Bem-vindo ao Spark Premium!', 'success');
        }, 2000);
    }
});

// Comprar Boost
btnBoostOnly.addEventListener('click', () => {
    if (confirm('⚡ Comprar 1 Boost de 1 hora por R$ 4,90?')) {
        showToast('⚡ Boost ativado por 1 hora!', 'success');
        closeModal(modalPremium);
    }
});

// Ajuda
btnHelp.addEventListener('click', () => openModal(modalHelp));

// Logout
btnLogout.addEventListener('click', () => {
    if (confirm('🚪 Tem certeza que deseja sair da conta?')) {
        showToast('👋 Saindo...', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
});

// Fechar modais clicando no X
document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        closeAllModals();
    });
});

// Fechar modais clicando fora
[modalEdit, modalPhotos, modalPrivacy, modalNotifications, modalPremium, modalHelp].forEach(modal => {
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    }
});

// ========== INICIALIZAÇÃO ==========
loadUserProfile();

// ========== CSS PARA TOGGLES E ANIMAÇÕES ==========
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-up {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .animate-slide-up {
        animation: slide-up 0.3s ease-out;
    }
    
    /* Toggle Switch */
    .toggle-switch {
        opacity: 0;
        width: 0;
        height: 0;
    }
    
    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #cbd5e1;
        transition: 0.3s;
        border-radius: 12px;
    }
    
    .toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
    }
    
    .toggle-switch:checked + .toggle-slider {
        background: linear-gradient(135deg, #f97316 0%, #ec4899 100%);
    }
    
    .toggle-switch:checked + .toggle-slider:before {
        transform: translateX(24px);
    }
    
    /* Line clamp */
    .line-clamp-1 {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
`;
document.head.appendChild(style);
