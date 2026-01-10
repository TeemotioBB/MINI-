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

// ========== BOTÃO LIKE (coração verde) - COM VIP ==========
btnLike.addEventListener('click', () => {
    if (currentProfileIndex >= profiles.length) return;
    
    // ✅ VERIFICAÇÃO VIP - PODE DAR LIKE?
    if (!window.vipSystem.registerLike()) {
        console.log('❌ Limite de likes atingido');
        return; // Bloqueia se não puder dar like
    }
    
    const profile = profiles[currentProfileIndex];
    likedProfiles.push(profile);
    console.log('❤️ Você deu LIKE em:', profile.name);
    console.log('📊 Total de likes:', likedProfiles.length);
    
    // Verifica se há match
    const hasMatch = checkForMatch(profile);
    
    if (hasMatch) {
        console.log('🎉 MATCH COM:', profile.name);
        
        card.classList.add('swipe-right');
        showHeartAnimation();
        
        setTimeout(() => {
            card.classList.remove('swipe-right');
            nextProfile();
            
            setTimeout(() => {
                showMatchAnimation(profile);
            }, 300);
        }, 500);
    } else {
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
    
    card.classList.add('swipe-left');
    showXAnimation();
    
    setTimeout(() => {
        card.classList.remove('swipe-left');
        nextProfile();
    }, 500);
});

// ========== BOTÃO SUPER LIKE (estrela azul) - COM VIP ==========
btnStar.addEventListener('click', () => {
    if (currentProfileIndex >= profiles.length) return;
    
    // ✅ VERIFICAÇÃO VIP - PODE DAR SUPER LIKE?
    if (!window.vipSystem.registerSuperLike()) {
        console.log('❌ Sem Super Likes disponíveis');
        return; // Bloqueia se não puder dar super like
    }
    
    const profile = profiles[currentProfileIndex];
    superLikedProfiles.push(profile);
    console.log('⭐ Você deu SUPER LIKE em:', profile.name);
    console.log('📊 Total de super likes:', superLikedProfiles.length);
    
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
        card.classList.add('swipe-up');
        showStarAnimation();
        
        setTimeout(() => {
            card.classList.remove('swipe-up');
            nextProfile();
        }, 600);
    }
});

// ========== BOTÃO BOOST - COM VIP ==========
btnBoost.addEventListener('click', () => {
    // ✅ VERIFICAÇÃO VIP - PODE DAR BOOST?
    if (!window.vipSystem.registerBoost()) {
        console.log('❌ Sem Boosts disponíveis');
        return; // Bloqueia se não puder dar boost
    }
    
    console.log('⚡ Boost ativado com sucesso!');
});

// ========== INICIALIZAR ==========
console.log('🚀 app.js iniciando...');
console.log('📋 Perfis disponíveis:', profiles.length);

// Aguarda VIP System carregar
setTimeout(() => {
    if (window.vipSystem) {
        window.vipSystem.updateUI();
        console.log('✅ Sistema VIP integrado com sucesso!');
        console.log('📊 Stats VIP:', window.vipSystem.getStats());
    }
}, 100);

// Mostrar o primeiro perfil
showProfile();

console.log('✅ app.js carregado com sucesso!');
