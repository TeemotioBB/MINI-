// Elementos do HTML
const profileImage = document.getElementById('profile-image');
const profileName = document.getElementById('profile-name');
const profileBio = document.getElementById('profile-bio');
const photoIndicators = document.getElementById('photo-indicators');
const navArrows = document.getElementById('nav-arrows');

const btnLike = document.getElementById('btn-like');
const btnDislike = document.getElementById('btn-dislike');
const btnStar = document.getElementById('btn-star');
const btnBoost = document.getElementById('btn-boost');

// Navegação de fotos
const btnPrevPhoto = document.getElementById('btn-prev-photo');
const btnNextPhoto = document.getElementById('btn-next-photo');
const arrowLeft = document.getElementById('arrow-left');
const arrowRight = document.getElementById('arrow-right');

// Arrays para salvar likes e dislikes
let likedProfiles = [];
let dislikedProfiles = [];
let superLikedProfiles = [];

// Controle de foto atual
let currentPhotoIndex = 0;

// Pega o card principal
const card = document.querySelector('.glass-card');

// ========== FUNÇÕES DE NAVEGAÇÃO DE FOTOS ==========

function createPhotoIndicators(photosCount) {
    photoIndicators.innerHTML = '';
    for (let i = 0; i < photosCount; i++) {
        const indicator = document.createElement('div');
        indicator.className = 'photo-indicator h-1 flex-1 rounded-full transition-all duration-300';
        indicator.style.backgroundColor = i === 0 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)';
        photoIndicators.appendChild(indicator);
    }
}

function updatePhotoIndicators() {
    const indicators = photoIndicators.querySelectorAll('.photo-indicator');
    indicators.forEach((indicator, index) => {
        indicator.style.backgroundColor = index === currentPhotoIndex 
            ? 'rgba(255, 255, 255, 0.9)' 
            : 'rgba(255, 255, 255, 0.4)';
    });
}

function showPhoto(index) {
    if (currentProfileIndex >= profiles.length) return;
    
    const profile = profiles[currentProfileIndex];
    const photos = profile.photos || [profile.photo];
    
    // Garante que o índice está dentro dos limites
    currentPhotoIndex = Math.max(0, Math.min(index, photos.length - 1));
    
    // Fade effect
    profileImage.style.opacity = '0';
    
    setTimeout(() => {
        profileImage.src = photos[currentPhotoIndex];
        profileImage.style.opacity = '1';
        updatePhotoIndicators();
        updateArrowsVisibility(photos.length);
    }, 150);
}

function nextPhoto() {
    if (currentProfileIndex >= profiles.length) return;
    const profile = profiles[currentProfileIndex];
    const photos = profile.photos || [profile.photo];
    
    if (currentPhotoIndex < photos.length - 1) {
        showPhoto(currentPhotoIndex + 1);
    }
}

function prevPhoto() {
    if (currentPhotoIndex > 0) {
        showPhoto(currentPhotoIndex - 1);
    }
}

function updateArrowsVisibility(photosCount) {
    if (photosCount <= 1) {
        navArrows.style.display = 'none';
        return;
    }
    
    navArrows.style.display = 'block';
    
    // Esconde seta esquerda se estiver na primeira foto
    arrowLeft.style.opacity = currentPhotoIndex === 0 ? '0' : '1';
    arrowLeft.style.pointerEvents = currentPhotoIndex === 0 ? 'none' : 'auto';
    
    // Esconde seta direita se estiver na última foto
    arrowRight.style.opacity = currentPhotoIndex === photosCount - 1 ? '0' : '1';
    arrowRight.style.pointerEvents = currentPhotoIndex === photosCount - 1 ? 'none' : 'auto';
}

// Mostra setas no hover/toque
const imageContainer = profileImage.parentElement;
imageContainer.addEventListener('mouseenter', () => {
    if (currentProfileIndex < profiles.length) {
        const photos = profiles[currentProfileIndex].photos || [];
        if (photos.length > 1) {
            navArrows.style.opacity = '1';
        }
    }
});

imageContainer.addEventListener('mouseleave', () => {
    navArrows.style.opacity = '0';
});

// Touch para mobile
let touchStarted = false;
imageContainer.addEventListener('touchstart', () => {
    touchStarted = true;
    if (currentProfileIndex < profiles.length) {
        const photos = profiles[currentProfileIndex].photos || [];
        if (photos.length > 1) {
            navArrows.style.opacity = '1';
            setTimeout(() => {
                if (!touchStarted) navArrows.style.opacity = '0';
            }, 2000);
        }
    }
});

imageContainer.addEventListener('touchend', () => {
    touchStarted = false;
});

// ========== FUNÇÕES DE ANIMAÇÃO ==========

function createConfetti(color) {
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '50%';
        confetti.style.backgroundColor = color;
        confetti.style.animationDelay = Math.random() * 0.3 + 's';
        confetti.style.animationDuration = (Math.random() * 1 + 1) + 's';
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 2000);
    }
}

function showHeartAnimation() {
    const heart = document.createElement('div');
    heart.innerHTML = '<i class="fa-solid fa-heart"></i>';
    heart.className = 'heart-animation';
    document.body.appendChild(heart);
    createConfetti('#10b981');
    setTimeout(() => heart.remove(), 800);
}

function showXAnimation() {
    const x = document.createElement('div');
    x.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    x.className = 'x-animation';
    document.body.appendChild(x);
    createConfetti('#ef4444');
    setTimeout(() => x.remove(), 800);
}

function showStarAnimation() {
    const star = document.createElement('div');
    star.innerHTML = '<i class="fa-solid fa-star"></i>';
    star.className = 'star-animation';
    document.body.appendChild(star);
    createConfetti('#3b82f6');
    setTimeout(() => createConfetti('#60a5fa'), 200);
    setTimeout(() => star.remove(), 1000);
}

// ========== FUNÇÃO PARA MOSTRAR PERFIL ==========

function showProfile() {
    if (currentProfileIndex >= profiles.length) {
        profileName.textContent = "Acabaram os perfis! 😢";
        profileBio.textContent = "Volte mais tarde para ver mais pessoas";
        profileImage.src = "https://via.placeholder.com/500x380?text=Sem+mais+perfis";
        photoIndicators.innerHTML = '';
        navArrows.style.display = 'none';
        return;
    }

    const profile = profiles[currentProfileIndex];
    const photos = profile.photos || [profile.photo];
    
    // Reset para primeira foto
    currentPhotoIndex = 0;
    
    profileName.textContent = `${profile.name}, ${profile.age}`;
    profileBio.innerHTML = profile.bio;
    profileImage.src = photos[0];
    
    // Cria indicadores
    createPhotoIndicators(photos.length);
    updateArrowsVisibility(photos.length);
}

// ========== FUNÇÃO PARA PRÓXIMO PERFIL ==========

function nextProfile() {
    currentProfileIndex++;
    showProfile();
}

// ========== EVENT LISTENERS DE NAVEGAÇÃO DE FOTOS ==========

btnPrevPhoto.addEventListener('click', prevPhoto);
btnNextPhoto.addEventListener('click', nextPhoto);
arrowLeft.addEventListener('click', (e) => {
    e.stopPropagation();
    prevPhoto();
});
arrowRight.addEventListener('click', (e) => {
    e.stopPropagation();
    nextPhoto();
});

// Suporte a teclado (setas esquerda/direita)
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevPhoto();
    if (e.key === 'ArrowRight') nextPhoto();
});

// ========== BOTÃO LIKE ==========

btnLike.addEventListener('click', () => {
    if (currentProfileIndex >= profiles.length) return;
    
    const profile = profiles[currentProfileIndex];
    likedProfiles.push(profile);
    console.log('❤️ Você deu LIKE em:', profile.name);
    console.log('Total de likes:', likedProfiles.length);
    
    card.classList.add('swipe-right');
    showHeartAnimation();
    
    setTimeout(() => {
        card.classList.remove('swipe-right');
        nextProfile();
    }, 500);
});

// ========== BOTÃO DISLIKE ==========

btnDislike.addEventListener('click', () => {
    if (currentProfileIndex >= profiles.length) return;
    
    const profile = profiles[currentProfileIndex];
    dislikedProfiles.push(profile);
    console.log('❌ Você deu DISLIKE em:', profile.name);
    
    card.classList.add('swipe-left');
    showXAnimation();
    
    setTimeout(() => {
        card.classList.remove('swipe-left');
        nextProfile();
    }, 500);
});

// ========== BOTÃO SUPER LIKE ==========

btnStar.addEventListener('click', () => {
    if (currentProfileIndex >= profiles.length) return;
    
    const profile = profiles[currentProfileIndex];
    superLikedProfiles.push(profile);
    console.log('⭐ Você deu SUPER LIKE em:', profile.name);
    console.log('Total de super likes:', superLikedProfiles.length);
    
    card.classList.add('swipe-up');
    showStarAnimation();
    
    setTimeout(() => {
        card.classList.remove('swipe-up');
        nextProfile();
    }, 600);
});

// ========== BOTÃO BOOST ==========

btnBoost.addEventListener('click', () => {
    alert('⚡ Boost ativado por 1 hora! (função em desenvolvimento)');
});

// ========== INICIALIZAR ==========

showProfile();
