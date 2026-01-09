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
const likesReceived = [
    {
        id: 101,
        name: "Carla",
        age: 25,
        photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=500",
        bio: "Apaixonada por fotografia 📸 | Adoro café ☕",
        verified: true,
        time: "2min atrás"
    },
    {
        id: 102,
        name: "Marina",
        age: 23,
        photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=500",
        bio: "Dançarina profissional 💃 | Yoga lover",
        verified: true,
        time: "15min atrás"
    },
    {
        id: 103,
        name: "Beatriz",
        age: 27,
        photo: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=500",
        bio: "Médica veterinária 🐾 | Amo animais",
        verified: false,
        time: "1h atrás"
    },
    {
        id: 104,
        name: "Sofia",
        age: 24,
        photo: "https://images.unsplash.com/photo-1488716820095-cbe80883c496?auto=format&fit=crop&q=80&w=500",
        bio: "Estudante de arquitetura 🏛️",
        verified: true,
        time: "2h atrás"
    },
    {
        id: 105,
        name: "Isabela",
        age: 26,
        photo: "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?auto=format&fit=crop&q=80&w=500",
        bio: "Chef de cozinha 👩‍🍳 | Foodie",
        verified: true,
        time: "3h atrás"
    },
    {
        id: 106,
        name: "Larissa",
        age: 22,
        photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=500",
        bio: "Influencer digital ✨ | Moda e estilo",
        verified: true,
        time: "5h atrás"
    }
];

const likesSent = [
    {
        id: 201,
        name: "Amanda",
        age: 24,
        photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=500",
        bio: "Amante de café e livros ☕📚",
        verified: false,
        time: "1 dia atrás"
    },
    {
        id: 202,
        name: "Júlia",
        age: 22,
        photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=500",
        bio: "Viciada em séries e pizza 🍕",
        verified: true,
        time: "1 dia atrás"
    },
    {
        id: 203,
        name: "Camila",
        age: 25,
        photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=500",
        bio: "Fitness lover 💪 | Nutricionista",
        verified: true,
        time: "2 dias atrás"
    }
];

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

    likesGrid.innerHTML = likes.map(like => `
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
    `).join('');

    // Adiciona evento de clique nos cards
    document.querySelectorAll('.like-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
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
    
    // Animação de entrada
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

    // Animação de sucesso
    modalLike.innerHTML = '<i class="fa-solid fa-check text-xl"></i> Match!';
    modalLike.classList.remove('from-green-400', 'to-emerald-500');
    modalLike.classList.add('from-pink-500', 'to-rose-500');

    setTimeout(() => {
        // Remove do array de likes recebidos
        const index = likesReceived.findIndex(l => l.id === selectedProfile.id);
        if (index > -1) {
            likesReceived.splice(index, 1);
        }

        closeProfileModal();
        renderLikes();
        
        // Mostra notificação de match
        showMatchNotification(selectedProfile);
    }, 1000);
});

// ========== REJEITAR NO MODAL ==========
modalDislike.addEventListener('click', () => {
    if (!selectedProfile) return;

    // Remove do array
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

// ========== INICIALIZAR ==========
renderLikes();
