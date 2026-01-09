// ========== ELEMENTOS DO HTML ==========
const userPhoto = document.getElementById('user-photo');
const userName = document.getElementById('user-name');
const userAge = document.getElementById('user-age');
const userBio = document.getElementById('user-bio');
const userPlan = document.getElementById('user-plan');
const verifiedBadge = document.getElementById('verified-badge');

// Botões principais
const btnChangePhoto = document.getElementById('btn-change-photo');
const btnEditProfile = document.getElementById('btn-edit-profile');
const btnPrivacy = document.getElementById('btn-privacy');
const btnNotifications = document.getElementById('btn-notifications');
const btnPremium = document.getElementById('btn-premium');
const btnUpgrade = document.getElementById('btn-upgrade');
const btnHelp = document.getElementById('btn-help');
const btnLogout = document.getElementById('btn-logout');

// Modais
const modalEdit = document.getElementById('modal-edit');
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

// Botões de fechar modais
const btnCloseEdit = document.getElementById('btn-close-edit');
const btnSave = document.getElementById('btn-save');
const btnSubscribe = document.getElementById('btn-subscribe');
const btnBoostOnly = document.getElementById('btn-boost-only');

// ========== DADOS DO USUÁRIO ==========
let userData = {
    name: "João Silva",
    age: 28,
    photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300",
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

// Carrega dados do usuário
function loadUserProfile() {
    userName.textContent = userData.name;
    userAge.textContent = `, ${userData.age}`;
    userPhoto.src = userData.photo;
    userBio.textContent = userData.bio;
    userPlan.textContent = userData.plan;
    verifiedBadge.style.display = userData.verified ? 'inline' : 'none';
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
    [modalEdit, modalPrivacy, modalNotifications, modalPremium, modalHelp].forEach(modal => {
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
[modalEdit, modalPrivacy, modalNotifications, modalPremium, modalHelp].forEach(modal => {
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
