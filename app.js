// ========== AGUARDA O DOM CARREGAR ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 app.js iniciando...');

    // ========== ELEMENTOS DO HTML ==========
    const profileImage = document.getElementById('profile-image');
    const profileName = document.getElementById('profile-name');
    const profileBio = document.getElementById('profile-bio');
    const verifiedBadge = document.getElementById('verified-badge');

    const btnLike = document.getElementById('btn-like');
    const btnDislike = document.getElementById('btn-dislike');
    const btnStar = document.getElementById('btn-star');
    const btnBoost = document.getElementById('btn-boost');

    // Áreas de exibição
    const profileCardArea = document.getElementById('profile-card-area');
    const noProfilesArea = document.getElementById('no-profiles-area');

    // Verifica se os elementos existem
    if (!btnLike || !btnDislike || !btnStar || !btnBoost) {
        console.error('❌ Botões não encontrados! Verifique o HTML.');
        return;
    }

    console.log('✅ Botões encontrados:', {
        like: !!btnLike,
        dislike: !!btnDislike,
        star: !!btnStar,
        boost: !!btnBoost
    });

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

    // ========== FUNÇÃO PARA MOSTRAR LOADING ==========
    function showLoading() {
        if (profileName) profileName.textContent = 'Carregando...';
        if (profileBio) profileBio.textContent = 'Buscando perfis perto de você';
        if (profileImage) profileImage.src = 'https://via.placeholder.com/500x600/f3f4f6/9ca3af?text=Carregando...';
        if (verifiedBadge) verifiedBadge.style.display = 'none';
    }

    // ========== FUNÇÃO PARA MOSTRAR TELA DE SEM PERFIS ==========
    function showNoProfiles() {
        console.log('📭 Mostrando tela de sem perfis');
        
        if (profileCardArea) {
            profileCardArea.classList.add('hidden');
        }
        if (noProfilesArea) {
            noProfilesArea.classList.remove('hidden');
        }
    }

    // ========== FUNÇÃO PARA MOSTRAR PERFIL ==========
    function showProfile() {
        // Verifica se não tem perfis ou acabaram
        if (!profiles || profiles.length === 0 || currentProfileIndex >= profiles.length) {
            showNoProfiles();
            return;
        }

        // Garante que a área do card está visível
        if (profileCardArea) {
            profileCardArea.classList.remove('hidden');
        }
        if (noProfilesArea) {
            noProfilesArea.classList.add('hidden');
        }

        const profile = profiles[currentProfileIndex];
        
        profileName.textContent = `${profile.name}, ${profile.age}`;
        profileBio.innerHTML = profile.bio || '';
        profileImage.src = profile.photo;
        
        // Mostra/esconde badge de verificado
        if (verifiedBadge) {
            verifiedBadge.style.display = profile.verified ? 'flex' : 'none';
        }
        
        console.log('👤 Mostrando perfil:', profile.name);
    }

    // ========== FUNÇÃO PARA PRÓXIMO PERFIL ==========
    function nextProfile() {
        currentProfileIndex++;
        showProfile();
    }

    // ========== BOTÃO LIKE (coração verde) - COM VIP ==========
    btnLike.addEventListener('click', () => {
        console.log('🖱️ Botão LIKE clicado!');
        
        if (!profiles || currentProfileIndex >= profiles.length) {
            console.log('⚠️ Sem mais perfis');
            return;
        }
        
        // ✅ VERIFICAÇÃO VIP - PODE DAR LIKE?
        if (window.vipSystem && !window.vipSystem.registerLike()) {
            console.log('❌ VIP bloqueou o like');
            return;
        }
        
        const profile = profiles[currentProfileIndex];
        likedProfiles.push(profile);
        console.log('❤️ LIKE dado em:', profile.name);
        
        // Envia like para o backend (não bloqueia a UI)
        sendLikeToBackend(profile.telegram_id, 'like');
        
        // Verifica se há match
        const hasMatch = typeof checkForMatch !== 'undefined' && checkForMatch(profile);
        
        if (hasMatch) {
            console.log('🎉 MATCH COM:', profile.name);
            
            card.classList.add('swipe-right');
            showHeartAnimation();
            
            setTimeout(() => {
                card.classList.remove('swipe-right');
                nextProfile();
                
                setTimeout(() => {
                    if (typeof showMatchAnimation !== 'undefined') {
                        showMatchAnimation(profile);
                    }
                }, 300);
            }, 500);
        } else {
            console.log('💚 Like normal, sem match');
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
        console.log('🖱️ Botão DISLIKE clicado!');
        
        if (!profiles || currentProfileIndex >= profiles.length) return;
        
        const profile = profiles[currentProfileIndex];
        dislikedProfiles.push(profile);
        console.log('❌ DISLIKE dado em:', profile.name);
        
        // Envia dislike para o backend
        sendLikeToBackend(profile.telegram_id, 'dislike');
        
        card.classList.add('swipe-left');
        showXAnimation();
        
        setTimeout(() => {
            card.classList.remove('swipe-left');
            nextProfile();
        }, 500);
    });

    // ========== BOTÃO SUPER LIKE (estrela azul) - COM VIP ==========
    btnStar.addEventListener('click', () => {
        console.log('🖱️ Botão SUPER LIKE clicado!');
        
        if (!profiles || currentProfileIndex >= profiles.length) return;
        
        // ✅ VERIFICAÇÃO VIP - PODE DAR SUPER LIKE?
        if (window.vipSystem && !window.vipSystem.registerSuperLike()) {
            console.log('❌ VIP bloqueou o super like');
            return;
        }
        
        const profile = profiles[currentProfileIndex];
        superLikedProfiles.push(profile);
        console.log('⭐ SUPER LIKE dado em:', profile.name);
        
        // Envia superlike para o backend
        sendLikeToBackend(profile.telegram_id, 'superlike');
        
        const hasMatch = typeof checkForMatch !== 'undefined' && checkForMatch(profile);
        
        if (hasMatch) {
            console.log('🎉 MATCH COM:', profile.name);
            
            card.classList.add('swipe-up');
            showStarAnimation();
            
            setTimeout(() => {
                card.classList.remove('swipe-up');
                nextProfile();
                
                setTimeout(() => {
                    if (typeof showMatchAnimation !== 'undefined') {
                        showMatchAnimation(profile);
                    }
                }, 300);
            }, 600);
        } else {
            console.log('⭐ Super Like normal, sem match');
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
        console.log('🖱️ Botão BOOST clicado!');
        
        // ✅ VERIFICAÇÃO VIP - PODE DAR BOOST?
        if (window.vipSystem && !window.vipSystem.registerBoost()) {
            console.log('❌ VIP bloqueou o boost');
            return;
        }
        
        console.log('⚡ BOOST ativado com sucesso!');
    });

    // ========== ENVIAR LIKE PARA O BACKEND ==========
    async function sendLikeToBackend(toTelegramId, type) {
        try {
            const response = await fetch('https://mini-production-cf60.up.railway.app/api/likes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
                },
                body: JSON.stringify({
                    to_telegram_id: toTelegramId,
                    type: type
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Like enviado para o servidor:', data);
                
                // Se deu match no servidor, mostra animação
                if (data.match) {
                    console.log('🎉 Match confirmado pelo servidor!');
                }
            }
        } catch (error) {
            console.log('⚠️ Erro ao enviar like (não impede uso):', error);
        }
    }

    // ========== AGUARDA VIP SYSTEM CARREGAR ==========
    setTimeout(() => {
        if (window.vipSystem) {
            window.vipSystem.updateUI();
            console.log('✅ Sistema VIP integrado!');
            console.log('📊 Stats:', window.vipSystem.getStats());
        } else {
            console.warn('⚠️ VIP System não encontrado - Funcionando sem limites');
        }
    }, 200);

    // ========== ESCUTA QUANDO OS PERFIS CARREGAREM ==========
    window.addEventListener('profilesLoaded', (event) => {
        console.log('📬 Evento profilesLoaded recebido:', event.detail);
        
        if (event.detail.count > 0) {
            showProfile();
            console.log('✅ Primeiro perfil carregado');
        } else {
            showNoProfiles();
            console.log('📭 Nenhum perfil disponível');
        }
    });

    // ========== MOSTRA LOADING INICIAL ==========
    showLoading();

    console.log('✅ app.js carregado com sucesso!');
});

console.log('📝 app.js script carregado (aguardando DOM)');
