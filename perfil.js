// Aguarda o DOM carregar completamente
document.addEventListener('DOMContentLoaded', function() {
    console.log('âœ… Iniciando perfil.js completo...');

    // ========== ELEMENTOS DO HTML ==========
    const userName = document.getElementById('user-name');
    const userAge = document.getElementById('user-age');
    const userBio = document.getElementById('user-bio');
    const userBioDisplay = document.getElementById('user-bio-display');
    const userLocationDisplay = document.getElementById('user-location-display');
    const userPlan = document.getElementById('user-plan');
    const verifiedBadge = document.getElementById('verified-badge');
    const userPhotosGrid = document.getElementById('user-photos-grid');

    // BotÃµes principais
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

    // Inputs do modal de ediÃ§Ã£o
    const inputName = document.getElementById('input-name');
    const inputAge = document.getElementById('input-age');
    const inputBio = document.getElementById('input-bio');
    const inputInstagram = document.getElementById('input-instagram');
    const inputCity = document.getElementById('input-city');
    const bioCount = document.getElementById('bio-count');

    // Modal de fotos
    const photosManagerGrid = document.getElementById('photos-manager-grid');
    const btnSavePhotos = document.getElementById('btn-save-photos');

    // BotÃµes de fechar modais
    const btnCloseEdit = document.getElementById('btn-close-edit');
    const btnSave = document.getElementById('btn-save');
    const btnSubscribe = document.getElementById('btn-subscribe');
    const btnBoostOnly = document.getElementById('btn-boost-only');

    // ========== DADOS DO USUÃRIO ==========
    let userData = {
        name: "",
        age: null,
        photos: [],
        bio: "",
        instagram: "",
        city: "",
        plan: "Spark Free",
        verified: false,
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

    // ========== FUNÃ‡Ã•ES PRINCIPAIS ==========

    // Verifica se o perfil estÃ¡ completo
    function isProfileComplete() {
        return userData.name && 
               userData.age && 
               userData.age >= 18 && 
               userData.photos.length > 0;
    }

    // Renderiza fotos do usuÃ¡rio no grid principal
    function renderUserPhotos() {
        if (!userPhotosGrid) return;
        
        userPhotosGrid.innerHTML = '';
        
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
        if (!photosManagerGrid) return;
        
        photosManagerGrid.innerHTML = '';
        
        for (let i = 0; i < 4; i++) {
            const slot = document.createElement('div');
            slot.className = 'relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300';
            slot.dataset.index = i;
            
            if (userData.photos[i]) {
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

    // Seleciona foto da galeria do dispositivo
    function selectPhoto(index) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!file.type.startsWith('image/')) {
                showToast('❌ Por favor, selecione uma imagem', 'error');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                showToast('❌ Imagem muito grande! Máx 5MB', 'error');
                return;
            }
            
            // Mostra loading
            showToast('📤 Enviando foto...', 'info');
            
            try {
                // Pega o telegram_id do usuário
                const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'test_user';
                
                // Faz upload via API
                const photoUrl = await uploadPhotoToCloudinary(file, telegramId);
                
                if (photoUrl) {
                    userData.photos[index] = photoUrl;
                    renderPhotosManager();
                    showToast('📸 Foto enviada com sucesso!', 'success');
                    console.log(`Foto ${index + 1} enviada para Cloudinary:`, photoUrl);
                }
            } catch (error) {
                console.error('Erro no upload:', error);
                showToast('❌ Erro ao enviar foto. Tente novamente.', 'error');
            }
        });
        
        input.click();
    }
    
    // ========== UPLOAD PARA CLOUDINARY VIA API ==========
    async function uploadPhotoToCloudinary(file, telegramId) {
        const API_BASE_URL = 'https://mini-production-cf60.up.railway.app/api';
        
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('telegram_id', telegramId);
        
        // Pega initData do Telegram para autenticação
        const initData = window.Telegram?.WebApp?.initData || '';
        
        try {
            const response = await fetch(`${API_BASE_URL}/upload/photo`, {
                method: 'POST',
                headers: {
                    'X-Telegram-Init-Data': initData
                },
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro no upload');
            }
            
            const result = await response.json();
            console.log('✅ Upload Cloudinary sucesso:', result);
            return result.url;
        } catch (error) {
            console.error('❌ Erro no upload Cloudinary:', error);
            
            // Fallback: salva como base64 local se API falhar
            console.log('⚠️ Usando fallback local (base64)');
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.readAsDataURL(file);
            });
        }
    }

    // Remove foto
    function removePhoto(index) {
        if (index === 0 && userData.photos.length > 1) {
            showToast('âš ï¸ A primeira foto Ã© a principal. Mova as outras antes de remover.', 'warning');
            return;
        }
        
        if (userData.photos.length === 1) {
            showToast('âš ï¸ VocÃª precisa ter pelo menos 1 foto', 'warning');
            return;
        }
        
        userData.photos.splice(index, 1);
        renderPhotosManager();
        showToast('ðŸ—‘ï¸ Foto removida');
    }

    // Salva fotos
    function savePhotos() {
        if (userData.photos.length === 0) {
            showToast('âŒ Adicione pelo menos 1 foto', 'error');
            return;
        }
        
        localStorage.setItem('userData', JSON.stringify(userData));
        
        renderUserPhotos();
        loadUserProfile();
        closeModal(modalPhotos);
        showToast('âœ… Fotos salvas com sucesso!');
        console.log('ðŸ“¸ Fotos salvas:', userData.photos);
    }

    // Carrega dados do usuÃ¡rio
    function loadUserProfile() {
        if (userName) userName.textContent = userData.name || "Seu Nome";
        if (userAge) userAge.textContent = userData.age ? `, ${userData.age}` : "";
        if (userBioDisplay) userBioDisplay.textContent = userData.bio || "Adicione uma bio";
        if (userLocationDisplay) userLocationDisplay.innerHTML = `<i class="fa-solid fa-location-dot text-orange-500"></i> ${userData.city || "Sua Cidade"}`;
        if (userPlan) userPlan.textContent = userData.plan;
        if (verifiedBadge) verifiedBadge.style.display = userData.verified ? 'inline' : 'none';
        
        const userPhotoElement = document.getElementById('user-photo');
        if (userPhotoElement) {
            if (userData.photos.length > 0) {
                userPhotoElement.src = userData.photos[0];
            } else {
                userPhotoElement.src = "https://via.placeholder.com/300x300/e5e7eb/9ca3af?text=Sem+Foto";
            }
        }
        
        renderUserPhotos();
    }

    // Abre modal genÃ©rico
    function openModal(modal) {
        if (!modal) return;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // Fecha modal genÃ©rico
    function closeModal(modal) {
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    // Fecha todos os modais
    function closeAllModals() {
        [modalEdit, modalPhotos, modalPrivacy, modalNotifications, modalPremium, modalHelp].forEach(modal => {
            if (modal) closeModal(modal);
        });
    }

    // Mostra toast (notificaÃ§Ã£o temporÃ¡ria)
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
        if (!bioCount || !inputBio) return;
        bioCount.textContent = inputBio.value.length;
    }

    // ========== EDITAR PERFIL ==========

    function openEditModal() {
        if (inputName) inputName.value = userData.name || "";
        if (inputAge) inputAge.value = userData.age || "";
        if (inputBio) inputBio.value = userData.bio || "";
        if (inputInstagram) inputInstagram.value = userData.instagram || "";
        if (inputCity) inputCity.value = userData.city || "";
        updateBioCount();
        openModal(modalEdit);
    }

    function saveProfile() {
        if (!inputName || !inputName.value.trim()) {
            showToast('âŒ Nome nÃ£o pode estar vazio', 'error');
            return;
        }
        
        if (!inputAge || inputAge.value < 18 || inputAge.value > 99) {
            showToast('âŒ Idade deve estar entre 18 e 99', 'error');
            return;
        }
        
        userData.name = inputName.value.trim();
        userData.age = parseInt(inputAge.value);
        if (inputBio) userData.bio = inputBio.value.trim();
        if (inputInstagram) userData.instagram = inputInstagram.value.trim();
        if (inputCity) userData.city = inputCity.value.trim();
        
        localStorage.setItem('userData', JSON.stringify(userData));
        
        loadUserProfile();
        closeModal(modalEdit);
        showToast('âœ… Perfil atualizado com sucesso!');
        
        console.log('ðŸ“ Dados salvos:', userData);
    }

    // ========== TROCAR FOTO ==========

    const btnCameraIcon = document.getElementById('btn-change-photo');
    const userPhotoClick = document.getElementById('user-photo');
    
    function openPhotoManager(e) {
        if (e) e.preventDefault();
        console.log('ðŸ“¸ Abrindo gerenciador de fotos!');
        renderPhotosManager();
        openModal(modalPhotos);
    }
    
    if (btnCameraIcon) {
        btnCameraIcon.addEventListener('click', openPhotoManager);
    }
    
    if (userPhotoClick) {
        userPhotoClick.style.cursor = 'pointer';
        userPhotoClick.addEventListener('click', openPhotoManager);
    }

    // ========== PRIVACIDADE ==========

    function loadPrivacySettings() {
        const toggleAge = document.getElementById('toggle-age');
        const toggleInstagram = document.getElementById('toggle-instagram');
        const toggleDiscovery = document.getElementById('toggle-discovery');
        const togglePrivate = document.getElementById('toggle-private');
        
        if (toggleAge) toggleAge.checked = userData.privacy.showAge;
        if (toggleInstagram) toggleInstagram.checked = userData.privacy.showInstagram;
        if (toggleDiscovery) toggleDiscovery.checked = userData.privacy.discoverable;
        if (togglePrivate) togglePrivate.checked = userData.privacy.privateProfile;
    }

    function savePrivacySettings() {
        const toggleAge = document.getElementById('toggle-age');
        const toggleInstagram = document.getElementById('toggle-instagram');
        const toggleDiscovery = document.getElementById('toggle-discovery');
        const togglePrivate = document.getElementById('toggle-private');
        
        userData.privacy = {
            showAge: toggleAge ? toggleAge.checked : true,
            showInstagram: toggleInstagram ? toggleInstagram.checked : true,
            discoverable: toggleDiscovery ? toggleDiscovery.checked : true,
            privateProfile: togglePrivate ? togglePrivate.checked : false
        };
        
        console.log('ðŸ”’ Privacidade salva:', userData.privacy);
        showToast('ðŸ”’ ConfiguraÃ§Ãµes de privacidade salvas!');
    }

    // ========== NOTIFICAÃ‡Ã•ES ==========

    function loadNotificationSettings() {
        const notifLikes = document.getElementById('notif-likes');
        const notifMatches = document.getElementById('notif-matches');
        const notifMessages = document.getElementById('notif-messages');
        const notifSuperlikes = document.getElementById('notif-superlikes');
        const notifPromo = document.getElementById('notif-promo');
        
        if (notifLikes) notifLikes.checked = userData.notifications.likes;
        if (notifMatches) notifMatches.checked = userData.notifications.matches;
        if (notifMessages) notifMessages.checked = userData.notifications.messages;
        if (notifSuperlikes) notifSuperlikes.checked = userData.notifications.superLikes;
        if (notifPromo) notifPromo.checked = userData.notifications.promo;
    }

    function saveNotificationSettings() {
        const notifLikes = document.getElementById('notif-likes');
        const notifMatches = document.getElementById('notif-matches');
        const notifMessages = document.getElementById('notif-messages');
        const notifSuperlikes = document.getElementById('notif-superlikes');
        const notifPromo = document.getElementById('notif-promo');
        
        userData.notifications = {
            likes: notifLikes ? notifLikes.checked : true,
            matches: notifMatches ? notifMatches.checked : true,
            messages: notifMessages ? notifMessages.checked : true,
            superLikes: notifSuperlikes ? notifSuperlikes.checked : true,
            promo: notifPromo ? notifPromo.checked : false
        };
        
        console.log('ðŸ”” NotificaÃ§Ãµes salvas:', userData.notifications);
        showToast('ðŸ”” PreferÃªncias de notificaÃ§Ã£o salvas!');
    }

    // ========== EVENT LISTENERS ==========

    if (btnManagePhotos) {
        btnManagePhotos.addEventListener('click', () => {
            renderPhotosManager();
            openModal(modalPhotos);
        });
    }

    if (btnSavePhotos) {
        btnSavePhotos.addEventListener('click', savePhotos);
    }

    if (btnEditProfile) btnEditProfile.addEventListener('click', openEditModal);
    if (btnCloseEdit) btnCloseEdit.addEventListener('click', () => closeModal(modalEdit));
    if (btnSave) btnSave.addEventListener('click', saveProfile);
    if (inputBio) inputBio.addEventListener('input', updateBioCount);

    if (btnPrivacy) {
        btnPrivacy.addEventListener('click', () => {
            loadPrivacySettings();
            openModal(modalPrivacy);
        });
    }

    document.querySelectorAll('#modal-privacy .toggle-switch').forEach(toggle => {
        toggle.addEventListener('change', savePrivacySettings);
    });

    if (btnNotifications) {
        btnNotifications.addEventListener('click', () => {
            loadNotificationSettings();
            openModal(modalNotifications);
        });
    }

    document.querySelectorAll('#modal-notifications .toggle-switch').forEach(toggle => {
        toggle.addEventListener('change', saveNotificationSettings);
    });

    if (btnPremium) btnPremium.addEventListener('click', () => openModal(modalPremium));
    if (btnUpgrade) btnUpgrade.addEventListener('click', () => openModal(modalPremium));

    if (btnSubscribe) {
        btnSubscribe.addEventListener('click', () => {
            if (confirm('ðŸ’Ž Confirmar assinatura Spark Premium por R$ 29,90/mÃªs?')) {
                showToast('ðŸŽ‰ Processando pagamento...', 'info');
                setTimeout(() => {
                    userData.plan = 'Spark Premium';
                    loadUserProfile();
                    closeModal(modalPremium);
                    showToast('ðŸ‘‘ Bem-vindo ao Spark Premium!', 'success');
                }, 2000);
            }
        });
    }

    if (btnBoostOnly) {
        btnBoostOnly.addEventListener('click', () => {
            if (confirm('âš¡ Comprar 1 Boost de 1 hora por R$ 4,90?')) {
                showToast('âš¡ Boost ativado por 1 hora!', 'success');
                closeModal(modalPremium);
            }
        });
    }

    if (btnHelp) btnHelp.addEventListener('click', () => openModal(modalHelp));

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm('ðŸšª Tem certeza que deseja sair da conta?')) {
                showToast('ðŸ‘‹ Saindo...', 'info');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        });
    }

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    [modalEdit, modalPhotos, modalPrivacy, modalNotifications, modalPremium, modalHelp].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal);
                }
            });
        }
    });

    // ========== INICIALIZAÃ‡ÃƒO ==========
    
    const savedData = localStorage.getItem('userData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            userData = { ...userData, ...parsedData };
            console.log('âœ… Dados carregados do localStorage:', userData);
        } catch (e) {
            console.error('âŒ Erro ao carregar dados:', e);
        }
    }
    
    loadUserProfile();
    console.log('ðŸŽ‰ perfil.js carregado com sucesso!');

    // ========== CSS PARA TOGGLES E ANIMAÃ‡Ã•ES ==========
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
        
        .line-clamp-1 {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    `;
    document.head.appendChild(style);
});
