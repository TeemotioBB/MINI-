// ========== AGUARDA O DOM CARREGAR ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('ðŸš€ app.js iniciando...');

    // ========== ELEMENTOS DO HTML ==========
    const profileImage = document.getElementById('profile-image');
    const profileName = document.getElementById('profile-name');
    const profileBio = document.getElementById('profile-bio');
    const verifiedBadge = document.getElementById('verified-badge');

    const btnLike = document.getElementById('btn-like');
    const btnDislike = document.getElementById('btn-dislike');
    const btnStar = document.getElementById('btn-star');
    const btnBoost = document.getElementById('btn-boost');

    // Ãreas de exibiÃ§Ã£o
    const profileCardArea = document.getElementById('profile-card-area');
    const noProfilesArea = document.getElementById('no-profiles-area');

    // Verifica se os elementos existem
    if (!btnLike || !btnDislike || !btnStar || !btnBoost) {
        console.error('âŒ BotÃµes nÃ£o encontrados! Verifique o HTML.');
        return;
    }

    console.log('âœ… BotÃµes encontrados:', {
        like: !!btnLike,
        dislike: !!btnDislike,
        star: !!btnStar,
        boost: !!btnBoost
    });

    // ========== ARRAYS PARA SALVAR AÃ‡Ã•ES ==========
    let likedProfiles = [];
    let dislikedProfiles = [];
    let superLikedProfiles = [];

    // ========== CARD PRINCIPAL ==========
    const card = document.querySelector('.glass-card');

    // ========== ðŸ”¥ PEGA O TELEGRAM_ID DO USUÃRIO ATUAL ==========
    function getMyTelegramId() {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
            return window.Telegram.WebApp.initDataUnsafe.user.id;
        } else {
            return localStorage.getItem('testTelegramId') || '123456789';
        }
    }

    // ========== ✅ VALIDA SE USUÁRIO TEM FOTO E IDADE ==========
    async function validateUserProfile() {
        try {
            const myTelegramId = getMyTelegramId();
            
            // Tenta buscar do localStorage primeiro
            let userData = localStorage.getItem('userData');
            if (userData) {
                userData = JSON.parse(userData);
            }
            
            // Se não tiver no localStorage, busca do servidor
            if (!userData || !userData.photos || !userData.age) {
                const response = await fetch(`https://mini-production-cf60.up.railway.app/api/users/${myTelegramId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
                    }
                });
                
                if (response.ok) {
                    userData = await response.json();
                }
            }
            
            // Valida se tem foto
            const hasPhoto = userData && ((userData.photos && userData.photos.length > 0) || userData.photo_url);
            
            // Valida se tem idade
            const hasAge = userData && userData.age;
            
            if (!hasPhoto && !hasAge) {
                showToast('⚠️ Complete seu perfil! Adicione foto e idade para curtir', 'warning');
                return false;
            } else if (!hasPhoto) {
                showToast('⚠️ Adicione pelo menos uma foto no seu perfil para curtir', 'warning');
                return false;
            } else if (!hasAge) {
                showToast('⚠️ Adicione sua idade no perfil para curtir', 'warning');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao validar perfil:', error);
            // Em caso de erro, permite a ação (evita bloquear o usuário por erro de rede)
            return true;
        }
    }
    
    // ========== 🎨 FUNÇÃO DE TOAST ==========
    function showToast(message, type = 'info') {
        // Remove toasts existentes
        const existingToasts = document.querySelectorAll('.custom-toast');
        existingToasts.forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.textContent = message;
        
        // Cores baseadas no tipo
        if (type === 'warning') {
            toast.style.background = 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)';
        } else if (type === 'error') {
            toast.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        } else {
            toast.style.background = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
        }
        
        // Estilos
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            color: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: '10000',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '90%',
            textAlign: 'center',
            animation: 'slideDown 0.3s ease-out'
        });
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ========== FUNÃ‡Ã•ES DE ANIMAÃ‡ÃƒO ==========
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

    // ========== FUNÃ‡ÃƒO PARA MOSTRAR LOADING ==========
    function showLoading() {
        if (profileName) profileName.textContent = 'Carregando...';
        if (profileBio) profileBio.textContent = 'Buscando perfis perto de vocÃª';
        if (profileImage) profileImage.src = 'https://via.placeholder.com/500x600/f3f4f6/9ca3af?text=Carregando...';
        if (verifiedBadge) verifiedBadge.style.display = 'none';
    }

    // ========== FUNÃ‡ÃƒO PARA MOSTRAR TELA DE SEM PERFIS ==========
    function showNoProfiles() {
        console.log('ðŸ”­ Mostrando tela de sem perfis');
        
        if (profileCardArea) {
            profileCardArea.classList.add('hidden');
        }
        if (noProfilesArea) {
            noProfilesArea.classList.remove('hidden');
        }
    }

    // ========== FUNÃ‡ÃƒO PARA MOSTRAR PERFIL ==========
    function showProfile() {
        // Verifica se nÃ£o tem perfis ou acabaram
        if (!profiles || profiles.length === 0 || currentProfileIndex >= profiles.length) {
            showNoProfiles();
            return;
        }

        // Garante que a Ã¡rea do card estÃ¡ visÃ­vel
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
        
        console.log('ðŸ‘¤ Mostrando perfil:', profile.name, '| Index:', currentProfileIndex, '/', profiles.length);
    }

    // ========== FUNÃ‡ÃƒO PARA PRÃ“XIMO PERFIL ==========
    function nextProfile() {
        currentProfileIndex++;
        console.log('âž¡ï¸ AvanÃ§ando para prÃ³ximo perfil. Novo index:', currentProfileIndex, '/', profiles.length);
        showProfile();
    }

    // ========== BOTÃƒO LIKE (coraÃ§Ã£o verde) - COM VIP E MATCH REAL ==========
    btnLike.addEventListener('click', async () => {
        console.log('ðŸ–±ï¸ BotÃ£o LIKE clicado!');
        
        // ✅ VALIDA SE TEM FOTO E IDADE
        if (!await validateUserProfile()) {
            return;
        }
        
        if (!profiles || currentProfileIndex >= profiles.length) {
            console.log('âš ï¸ Sem mais perfis');
            return;
        }
        
        // âœ… VERIFICAÃ‡ÃƒO VIP - PODE DAR LIKE?
        if (window.vipSystem && !window.vipSystem.registerLike()) {
            console.log('âŒ VIP bloqueou o like');
            return;
        }
        
        const profile = profiles[currentProfileIndex];
        likedProfiles.push(profile);
        console.log('â¤ï¸ LIKE dado em:', profile.name, '| Telegram ID:', profile.telegram_id);
        
        // âœ… MARCA PERFIL COMO VISTO!
        if (typeof markProfileAsSeen === 'function') {
            markProfileAsSeen(profile.telegram_id);
            console.log('ðŸ‘ï¸ Perfil marcado como visto');
        }
        
        // âœ… ENVIA LIKE E AGUARDA RESPOSTA DO BACKEND
        console.log('ðŸ“¤ Enviando like para o servidor...');
        const response = await sendLikeToBackend(profile.telegram_id, 'like');
        console.log('ðŸ“¥ Resposta do servidor:', response);
        
        // âœ… VERIFICA SE DEU MATCH (RESPOSTA DO SERVIDOR)
        const hasMatch = response && response.match === true;
        
        if (hasMatch) {
            console.log('ðŸŽ‰ MATCH COM:', profile.name, '| Match ID:', response.match_id);
            
            card.classList.add('swipe-right');
            showHeartAnimation();
            
            setTimeout(() => {
                card.classList.remove('swipe-right');
                nextProfile();
                
                setTimeout(() => {
                    if (typeof showMatchAnimation !== 'undefined') {
                        // ðŸ”¥ CORREÃ‡ÃƒO: PASSA O MATCH_ID DO SERVIDOR!
                        showMatchAnimation(profile, response.match_id);
                    }
                }, 300);
            }, 500);
        } else {
            console.log('ðŸ’š Like enviado, sem match (ainda)');
            card.classList.add('swipe-right');
            showHeartAnimation();
            
            setTimeout(() => {
                card.classList.remove('swipe-right');
                nextProfile();
            }, 500);
        }
    });

    // ========== BOTÃƒO DISLIKE (X vermelho) ==========
    btnDislike.addEventListener('click', async () => {
        console.log('ðŸ–±ï¸ BotÃ£o DISLIKE clicado!');
        
        // ✅ VALIDA SE TEM FOTO E IDADE
        if (!await validateUserProfile()) {
            return;
        }
        
        if (!profiles || currentProfileIndex >= profiles.length) return;
        
        const profile = profiles[currentProfileIndex];
        dislikedProfiles.push(profile);
        console.log('âŒ DISLIKE dado em:', profile.name, '| Telegram ID:', profile.telegram_id);
        
        // âœ… MARCA PERFIL COMO VISTO!
        if (typeof markProfileAsSeen === 'function') {
            markProfileAsSeen(profile.telegram_id);
            console.log('ðŸ‘ï¸ Perfil marcado como visto');
        }
        
        // Envia dislike para o backend
        console.log('ðŸ“¤ Enviando dislike para o servidor...');
        await sendLikeToBackend(profile.telegram_id, 'dislike');
        
        card.classList.add('swipe-left');
        showXAnimation();
        
        setTimeout(() => {
            card.classList.remove('swipe-left');
            nextProfile();
        }, 500);
    });

    // ========== BOTÃƒO SUPER LIKE (estrela azul) - COM VIP E MATCH REAL ==========
    btnStar.addEventListener('click', async () => {
        console.log('ðŸ–±ï¸ BotÃ£o SUPER LIKE clicado!');
        
        // ✅ VALIDA SE TEM FOTO E IDADE
        if (!await validateUserProfile()) {
            return;
        }
        
        if (!profiles || currentProfileIndex >= profiles.length) return;
        
        // âœ… VERIFICAÃ‡ÃƒO VIP - PODE DAR SUPER LIKE?
        if (window.vipSystem && !window.vipSystem.registerSuperLike()) {
            console.log('âŒ VIP bloqueou o super like');
            return;
        }
        
        const profile = profiles[currentProfileIndex];
        superLikedProfiles.push(profile);
        console.log('â­ SUPER LIKE dado em:', profile.name, '| Telegram ID:', profile.telegram_id);
        
        // âœ… MARCA PERFIL COMO VISTO!
        if (typeof markProfileAsSeen === 'function') {
            markProfileAsSeen(profile.telegram_id);
            console.log('ðŸ‘ï¸ Perfil marcado como visto');
        }
        
        // Envia superlike para o backend e aguarda resposta
        console.log('ðŸ“¤ Enviando super like para o servidor...');
        const response = await sendLikeToBackend(profile.telegram_id, 'superlike');
        console.log('ðŸ“¥ Resposta do servidor:', response);
        
        const hasMatch = response && response.match === true;
        
        if (hasMatch) {
            console.log('ðŸŽ‰ MATCH COM:', profile.name, '| Match ID:', response.match_id);
            
            card.classList.add('swipe-up');
            showStarAnimation();
            
            setTimeout(() => {
                card.classList.remove('swipe-up');
                nextProfile();
                
                setTimeout(() => {
                    if (typeof showMatchAnimation !== 'undefined') {
                        // ðŸ”¥ CORREÃ‡ÃƒO: PASSA O MATCH_ID DO SERVIDOR!
                        showMatchAnimation(profile, response.match_id);
                    }
                }, 300);
            }, 600);
        } else {
            console.log('â­ Super Like enviado, sem match (ainda)');
            card.classList.add('swipe-up');
            showStarAnimation();
            
            setTimeout(() => {
                card.classList.remove('swipe-up');
                nextProfile();
            }, 600);
        }
    });

    // ========== BOTÃƒO BOOST - COM VIP ==========
    btnBoost.addEventListener('click', () => {
        console.log('ðŸ–±ï¸ BotÃ£o BOOST clicado!');
        
        // âœ… VERIFICAÃ‡ÃƒO VIP - PODE DAR BOOST?
        if (window.vipSystem && !window.vipSystem.registerBoost()) {
            console.log('âŒ VIP bloqueou o boost');
            return;
        }
        
        console.log('âš¡ BOOST ativado com sucesso!');
    });

    // ========== ðŸ”¥ ENVIAR LIKE PARA O BACKEND (CORRIGIDO!) ==========
    async function sendLikeToBackend(toTelegramId, type) {
        try {
            // ðŸ”¥ PEGA O MEU TELEGRAM_ID
            const myTelegramId = getMyTelegramId();
            
            console.log('ðŸ”„ Chamando API:', {
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
                console.log('âœ… Resposta do servidor:', data);
                
                if (data.match) {
                    console.log('ðŸŽ‰ MATCH CONFIRMADO PELO SERVIDOR!');
                }
                
                return data;
            } else {
                const error = await response.json();
                console.error('âŒ Erro do servidor:', error);
                return null;
            }
        } catch (error) {
            console.error('âŒ Erro ao enviar like:', error);
            return null;
        }
    }

    // ========== AGUARDA VIP SYSTEM CARREGAR ==========
    setTimeout(() => {
        if (window.vipSystem) {
            window.vipSystem.updateUI();
            console.log('âœ… Sistema VIP integrado!');
            console.log('ðŸ“Š Stats:', window.vipSystem.getStats());
        } else {
            console.warn('âš ï¸ VIP System nÃ£o encontrado - Funcionando sem limites');
        }
    }, 200);

    // ========== ESCUTA QUANDO OS PERFIS CARREGAREM ==========
    window.addEventListener('profilesLoaded', (event) => {
        console.log('ðŸ“¬ Evento profilesLoaded recebido:', event.detail);
        
        if (event.detail.count > 0) {
            showProfile();
            console.log('âœ… Primeiro perfil carregado');
        } else {
            showNoProfiles();
            console.log('ðŸ”­ Nenhum perfil disponÃ­vel');
        }
    });

    // ========== MOSTRA LOADING INICIAL ==========
    showLoading();

    console.log('âœ… app.js carregado com sucesso!');
});

console.log('ðŸ“„ app.js script carregado (aguardando DOM)');
