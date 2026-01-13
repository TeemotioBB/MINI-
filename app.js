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

    // ========== 🔥 PEGA O TELEGRAM_ID DO USUÁRIO ATUAL ==========
    function getMyTelegramId() {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
            return window.Telegram.WebApp.initDataUnsafe.user.id;
        } else {
            return localStorage.getItem('testTelegramId') || '123456789';
        }
    }

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
        console.log('🔭 Mostrando tela de sem perfis');
        
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
        
        console.log('👤 Mostrando perfil:', profile.name, '| Index:', currentProfileIndex, '/', profiles.length);
    }

    // ========== FUNÇÃO PARA PRÓXIMO PERFIL ==========
    function nextProfile() {
        currentProfileIndex++;
        console.log('➡️ Avançando para próximo perfil. Novo index:', currentProfileIndex, '/', profiles.length);
        showProfile();
    }

    // ========== BOTÃO LIKE (coração verde) - COM VIP E MATCH REAL ==========
    btnLike.addEventListener('click', async () => {
        console.log('🖱️ Botão LIKE clicado!');
        
        if (!profiles || currentProfileIndex >= profiles.length) {
            console.log('⚠️ Sem mais perfis');
            return;
        }
        
        // ✅ VERIFICAÇÃO VIP - PODE DAR LIKE?
        
        const profile = profiles[currentProfileIndex];
        likedProfiles.push(profile);
        console.log('❤️ LIKE dado em:', profile.name, '| Telegram ID:', profile.telegram_id);
        
        // ✅ MARCA PERFIL COMO VISTO!
        if (typeof markProfileAsSeen === 'function') {
            markProfileAsSeen(profile.telegram_id);
            console.log('👁️ Perfil marcado como visto');
        }
        
        // ✅ ENVIA LIKE E AGUARDA RESPOSTA DO BACKEND
        console.log('📤 Enviando like para o servidor...');
        const response = await sendLikeToBackend(profile.telegram_id, 'like');
        console.log('📥 Resposta do servidor:', response);
        
        // ✅ VERIFICA SE DEU MATCH (RESPOSTA DO SERVIDOR)
        const hasMatch = response && response.match === true;
        
        if (hasMatch) {
            console.log('🎉 MATCH COM:', profile.name, '| Match ID:', response.match_id);
            
            card.classList.add('swipe-right');
            showHeartAnimation();
            
            setTimeout(() => {
                card.classList.remove('swipe-right');
                nextProfile();
                
                setTimeout(() => {
                    if (typeof showMatchAnimation !== 'undefined') {
                        // 🔥 CORREÇÃO: PASSA O MATCH_ID DO SERVIDOR!
                        showMatchAnimation(profile, response.match_id);
                    }
                }, 300);
            }, 500);
        } else {
            console.log('💚 Like enviado, sem match (ainda)');
            card.classList.add('swipe-right');
            showHeartAnimation();
            
            setTimeout(() => {
                card.classList.remove('swipe-right');
                nextProfile();
            }, 500);
        }
    });

    // ========== BOTÃO DISLIKE (X vermelho) ==========
    btnDislike.addEventListener('click', async () => {
        console.log('🖱️ Botão DISLIKE clicado!');
        
        if (!profiles || currentProfileIndex >= profiles.length) return;
        
        const profile = profiles[currentProfileIndex];
        dislikedProfiles.push(profile);
        console.log('❌ DISLIKE dado em:', profile.name, '| Telegram ID:', profile.telegram_id);
        
        // ✅ MARCA PERFIL COMO VISTO!
        if (typeof markProfileAsSeen === 'function') {
            markProfileAsSeen(profile.telegram_id);
            console.log('👁️ Perfil marcado como visto');
        }
        
        // Envia dislike para o backend
        console.log('📤 Enviando dislike para o servidor...');
        await sendLikeToBackend(profile.telegram_id, 'dislike');
        
        card.classList.add('swipe-left');
        showXAnimation();
        
        setTimeout(() => {
            card.classList.remove('swipe-left');
            nextProfile();
        }, 500);
    });

    // ========== BOTÃO SUPER LIKE (estrela azul) - COM VIP E MATCH REAL ==========
    btnStar.addEventListener('click', async () => {
        console.log('🖱️ Botão SUPER LIKE clicado!');
        
        if (!profiles || currentProfileIndex >= profiles.length) return;
        
        
        const profile = profiles[currentProfileIndex];
        superLikedProfiles.push(profile);
        console.log('⭐ SUPER LIKE dado em:', profile.name, '| Telegram ID:', profile.telegram_id);
        
        // ✅ MARCA PERFIL COMO VISTO!
        if (typeof markProfileAsSeen === 'function') {
            markProfileAsSeen(profile.telegram_id);
            console.log('👁️ Perfil marcado como visto');
        }
        
        // Envia superlike para o backend e aguarda resposta
        console.log('📤 Enviando super like para o servidor...');
        const response = await sendLikeToBackend(profile.telegram_id, 'superlike');
        console.log('📥 Resposta do servidor:', response);
        
        const hasMatch = response && response.match === true;
        
        if (hasMatch) {
            console.log('🎉 MATCH COM:', profile.name, '| Match ID:', response.match_id);
            
            card.classList.add('swipe-up');
            showStarAnimation();
            
            setTimeout(() => {
                card.classList.remove('swipe-up');
                nextProfile();
                
                setTimeout(() => {
                    if (typeof showMatchAnimation !== 'undefined') {
                        // 🔥 CORREÇÃO: PASSA O MATCH_ID DO SERVIDOR!
                        showMatchAnimation(profile, response.match_id);
                    }
                }, 300);
            }, 600);
        } else {
            console.log('⭐ Super Like enviado, sem match (ainda)');
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
        
        
        console.log('⚡ BOOST ativado com sucesso!');
    });

    // ========== 🔥 ENVIAR LIKE PARA O BACKEND (CORRIGIDO!) ==========
    async function sendLikeToBackend(toTelegramId, type) {
        try {
            // 🔥 PEGA O MEU TELEGRAM_ID
            const myTelegramId = getMyTelegramId();
            
            console.log('🔄 Chamando API:', {
                from: myTelegramId,
                to: toTelegramId,
                type: type
            });
            
            const response = await fetch('https://mini-production-cf60.up.railway.app/api/likes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
                },
                body: JSON.stringify({
                    from_telegram_id: myTelegramId,
                    to_telegram_id: toTelegramId,
                    type: type
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Resposta do servidor:', data);
                
                if (data.match) {
                    console.log('🎉 MATCH CONFIRMADO PELO SERVIDOR!');
                }
                
                return data;
            } else {
                const error = await response.json();
                console.error('❌ Erro do servidor:', error);
                return null;
            }
        } catch (error) {
            console.error('❌ Erro ao enviar like:', error);
            return null;
        }
    }


    // ========== ESCUTA QUANDO OS PERFIS CARREGAREM ==========
    window.addEventListener('profilesLoaded', (event) => {
        console.log('📬 Evento profilesLoaded recebido:', event.detail);
        
        if (event.detail.count > 0) {
            showProfile();
            console.log('✅ Primeiro perfil carregado');
        } else {
            showNoProfiles();
            console.log('🔭 Nenhum perfil disponível');
        }
    });

    // ========== MOSTRA LOADING INICIAL ==========
    showLoading();

    console.log('✅ app.js carregado com sucesso!');
});

console.log('📄 app.js script carregado (aguardando DOM)');
