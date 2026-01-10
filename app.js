// ========== ELEMENTOS DO HTML ==========
const profileImage = document.getElementById('profile-image');
const profileName = document.getElementById('profile-name');
const profileBio = document.getElementById('profile-bio');

const btnLike = document.getElementById('btn-like');
const btnDislike = document.getElementById('btn-dislike');
const btnStar = document.getElementById('btn-star');
const btnBoost = document.getElementById('btn-boost');

// ========== ARRAYS PARA SALVAR AÇÕES ==========
let likedProfiles = [];
let dislikedProfiles = [];
let superLikedProfiles = [];

// ========== CARD PRINCIPAL ==========
const card = document.querySelector('.glass-card');

// ========== FUNÇÕES DE ANIMAÇÃO ==========

// Cria confete colorido
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

// Mostra ícone de coração COM CONFETE
function showHeartAnimation() {
    const heart = document.createElement('div');
    heart.innerHTML = '<i class="fa-solid fa-heart"></i>';
    heart.className = 'heart-animation';
    document.body.appendChild(heart);
    
    createConfetti('#10b981');
    
    setTimeout(() => heart.remove(), 800);
}

// Mostra ícone de X COM CONFETE
function showXAnimation() {
    const x = document.createElement('div');
    x.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    x.className = 'x-animation';
    document.body.appendChild(x);
    
    createConfetti('#ef4444');
    
    setTimeout(() => x.remove(), 800);
}

// Mostra ícone de estrela COM EXPLOSÃO
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
        return;
    }

    const profile = profiles[currentProfileIndex];
    
    profileName.textContent = `${profile.name}, ${profile.age}`;
    profileBio.innerHTML = profile.bio;
    profileImage.src = profile.photo;
    
    console.log('👤 Mostrando perfil:', profile.name);
}

// ========== FUNÇÃO PARA PRÓXIMO PERFIL ==========
function nextProfile() {
    currentProfileIndex++;
    showProfile();
}

// ========== BOTÃO LIKE (coração verde) ==========
btnLike.addEventListener('click', () => {
    if (currentProfileIndex >= profiles.length) return;
    
    const profile = profiles[currentProfileIndex];
    likedProfiles.push(profile);
    console.log('❤️ Você deu LIKE em:', profile.name);
    console.log('📊 Total de likes:', likedProfiles.length);
    
    // ✨ VERIFICA SE HÁ MATCH ✨
    const hasMatch = checkForMatch(profile);
    
    if (hasMatch) {
        console.log('🎉 MATCH COM:', profile.name);
        
        // Animações normais primeiro
        card.classList.add('swipe-right');
        showHeartAnimation();
        
        // Depois mostra o match
        setTimeout(() => {
            card.classList.remove('swipe-right');
            nextProfile();
            
            // Mostra tela de match após 300ms
            setTimeout(() => {
                showMatchAnimation(profile);
            }, 300);
        }, 500);
    } else {
        // Sem match, apenas animações normais
        card.classList.add('swipe-right');
        showHeartAnimation();
        
        setTimeout(() => {
            card.classList.remove('swipe-right');
            nextProfile();
        }, 500);
    }
});

// ========== BOTÃO DISLIKE (X vermelho) ==========
btnDislike.addEventListener('click', () => {
    if (currentProfileIndex >= profiles.length) return;
    
    const profile = profiles[currentProfileIndex];
    dislikedProfiles.push(profile);
    console.log('❌ Você deu DISLIKE em:', profile.name);
    
    // Animações
    card.classList.add('swipe-left');
    showXAnimation();
    
    // Espera animação terminar
    setTimeout(() => {
        card.classList.remove('swipe-left');
        nextProfile();
    }, 500);
});

// ========== BOTÃO SUPER LIKE (estrela azul) ==========
btnStar.addEventListener('click', () => {
    if (currentProfileIndex >= profiles.length) return;
    
    const profile = profiles[currentProfileIndex];
    superLikedProfiles.push(profile);
    console.log('⭐ Você deu SUPER LIKE em:', profile.name);
    console.log('📊 Total de super likes:', superLikedProfiles.length);
    
    // ✨ VERIFICA SE HÁ MATCH (Super Like também pode dar match!) ✨
    const hasMatch = checkForMatch(profile);
    
    if (hasMatch) {
        console.log('🎉 MATCH COM:', profile.name);
        
        card.classList.add('swipe-up');
        showStarAnimation();
        
        setTimeout(() => {
            card.classList.remove('swipe-up');
            nextProfile();
            
            setTimeout(() => {
                showMatchAnimation(profile);
            }, 300);
        }, 600);
    } else {
        // Sem match
        card.classList.add('swipe-up');
        showStarAnimation();
        
        setTimeout(() => {
            card.classList.remove('swipe-up');
            nextProfile();
        }, 600);
    }
});

// ========== BOTÃO BOOST ==========
btnBoost.addEventListener('click', () => {
    alert('⚡ Boost ativado por 1 hora! (função em desenvolvimento)');
});

// ========== INICIALIZAR ==========
console.log('🚀 app.js iniciando...');
console.log('📋 Perfis disponíveis:', profiles.length);

// Mostrar o primeiro perfil quando carregar a página
showProfile();

console.log('✅ app.js carregado com sucesso!');
