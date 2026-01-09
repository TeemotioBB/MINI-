// ========== ELEMENTOS DO HTML ==========
const userPhoto = document.getElementById('user-photo');
const userName = document.getElementById('user-name');
const userAge = document.getElementById('user-age');
const userBio = document.getElementById('user-bio');
const userPlan = document.getElementById('user-plan');

// Botões principais
const btnChangePhoto = document.getElementById('btn-change-photo');
const btnEditProfile = document.getElementById('btn-edit-profile');
const btnPrivacy = document.getElementById('btn-privacy');
const btnNotifications = document.getElementById('btn-notifications');
const btnPremium = document.getElementById('btn-premium');
const btnUpgrade = document.getElementById('btn-upgrade');
const btnHelp = document.getElementById('btn-help');
const btnLogout = document.getElementById('btn-logout');

// Modal de edição
const modalEdit = document.getElementById('modal-edit');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnSave = document.getElementById('btn-save');

// Inputs do modal
const inputName = document.getElementById('input-name');
const inputAge = document.getElementById('input-age');
const inputBio = document.getElementById('input-bio');
const inputInstagram = document.getElementById('input-instagram');
const bioCount = document.getElementById('bio-count');

// ========== DADOS DO USUÁRIO ==========
let userData = {
    name: "João Silva",
    age: 28,
    photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300",
    bio: "Desenvolvedor • Café ☕ • Viagens ✈️",
    instagram: "",
    plan: "Spark Free",
    verified: true
};

// ========== FUNÇÕES ==========

// Carrega dados do usuário
function loadUserProfile() {
    userName.textContent = userData.name;
    userAge.textContent = `, ${userData.age}`;
    userPhoto.src = userData.photo;
    userBio.textContent = userData.bio;
    userPlan.textContent = userData.plan;
}

// Abre modal de edição
function openEditModal() {
    inputName.value = userData.name;
    inputAge.value = userData.age;
    inputBio.value = userData.bio;
    inputInstagram.value = userData.instagram;
    updateBioCount();
    
    modalEdit.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Bloqueia scroll
}

// Fecha modal
function closeEditModal() {
    modalEdit.classList.add('hidden');
    document.body.style.overflow = 'auto'; // Libera scroll
}

// Atualiza contador da bio
function updateBioCount() {
    bioCount.textContent = inputBio.value.length;
}

// Salva alterações
function saveProfile() {
    userData.name = inputName.value.trim();
    userData.age = parseInt(inputAge.value);
    userData.bio = inputBio.value.trim();
    userData.instagram = inputInstagram.value.trim();
    
    loadUserProfile();
    closeEditModal();
    
    // Feedback visual
    showToast('✅ Perfil atualizado com sucesso!');
}

// Mostra toast (notificação temporária)
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-[60] text-sm font-medium';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ========== EVENT LISTENERS ==========

// Trocar foto
btnChangePhoto.addEventListener('click', () => {
    showToast('📸 Função de trocar foto em desenvolvimento!');
    // Aqui depois você implementa upload de foto
});

// Editar perfil
btnEditProfile.addEventListener('click', openEditModal);
btnCloseModal.addEventListener('click', closeEditModal);

// Fechar modal clicando fora
modalEdit.addEventListener('click', (e) => {
    if (e.target === modalEdit) closeEditModal();
});

// Salvar alterações
btnSave.addEventListener('click', saveProfile);

// Contador da bio
inputBio.addEventListener('input', updateBioCount);

// Privacidade
btnPrivacy.addEventListener('click', () => {
    showToast('🔒 Abrindo configurações de privacidade...');
    // Aqui você pode abrir outro modal ou redirecionar
});

// Notificações
btnNotifications.addEventListener('click', () => {
    showToast('🔔 Abrindo configurações de notificações...');
});

// Premium/Boost
btnPremium.addEventListener('click', () => {
    showToast('⚡ Abrindo opções de Boost & Premium...');
});

btnUpgrade.addEventListener('click', () => {
    const confirmUpgrade = confirm('💎 Deseja fazer upgrade para Spark Premium?\n\n✨ Benefícios:\n• Likes ilimitados\n• Ver quem te deu like\n• Boost grátis toda semana\n• Sem anúncios');
    
    if (confirmUpgrade) {
        showToast('🎉 Redirecionando para pagamento...');
        // Aqui você integra com Telegram Stars ou outro método
    }
});

// Ajuda
btnHelp.addEventListener('click', () => {
    showToast('❓ Abrindo central de ajuda...');
});

// Logout
btnLogout.addEventListener('click', () => {
    const confirmLogout = confirm('Tem certeza que deseja sair da conta?');
    
    if (confirmLogout) {
        showToast('👋 Saindo da conta...');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
});

// ========== INICIALIZAÇÃO ==========
loadUserProfile();

// Adiciona CSS para animação do modal
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
`;
document.head.appendChild(style);
