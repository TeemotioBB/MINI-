// ========== SISTEMA VIP - SINCRONIZADO COM BACKEND ==========

const VIP_CONFIG = {
    FREE: {
        name: 'Spark Free',
        likesPerDay: 10,
        superLikesPerDay: 0,
        boostsPerWeek: 0,
        canSeeLikes: false,
        unlimited: false
    },
    PREMIUM: {
        name: 'Spark Premium',
        likesPerDay: Infinity,
        superLikesPerDay: 5,
        boostsPerWeek: 1,
        canSeeLikes: true,
        unlimited: true
    }
};

const API_BASE_URL = 'https://mini-production-cf60.up.railway.app/api';

class VIPSystem {
    constructor() {
        this.userPlan = this.loadUserPlan();
        this.dailyLimits = this.loadDailyLimits();
        this.weeklyLimits = this.loadWeeklyLimits();
        this.telegramId = this.getTelegramId();
        this.checkAndResetLimits();
        
        // âœ… BUSCA STATUS DO BACKEND AO INICIAR
        this.syncWithBackend();
        
        console.log('âœ… Sistema VIP inicializado');
        console.log('ðŸ“Š Plano atual:', this.userPlan);
        console.log('ðŸ’Ž Limites diÃ¡rios:', this.dailyLimits);
    }

    getTelegramId() {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
            return window.Telegram.WebApp.initDataUnsafe.user.id;
        }
        return localStorage.getItem('testTelegramId') || '123456789';
    }

    // âœ… SINCRONIZA COM BACKEND
    async syncWithBackend() {
        try {
            console.log('ðŸ”„ Sincronizando VIP com backend para:', this.telegramId);
            
            const url = `${API_BASE_URL}/users/${this.telegramId}/premium`;
            console.log('ðŸŒ URL:', url);
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                console.log('ðŸ“¥ Status Premium do backend:', data);
                
                // âœ… ATUALIZA PLANO COM O STATUS DO BANCO
                if (data.premium.is_active) {
                    this.userPlan = 'PREMIUM';
                    this.saveUserPlan('PREMIUM');
                    console.log('ðŸ‘‘ UsuÃ¡rio Ã© PREMIUM!');
                } else {
                    this.userPlan = 'FREE';
                    this.saveUserPlan('FREE');
                    console.log('ðŸ“¦ UsuÃ¡rio Ã© FREE');
                }
                
                // âœ… ATUALIZA LIMITES
                if (data.limits) {
                    this.dailyLimits = {
                        likes: data.limits.likes.used || 0,
                        superLikes: data.limits.super_likes?.used || 0,
                        lastReset: new Date().toDateString()
                    };
                    this.saveDailyLimits();
                }
                
                console.log('âœ… Sincronizado com backend!', {
                    plano: this.userPlan,
                    is_premium: data.premium.is_active,
                    expires: data.premium.expires_at
                });
                
                // Atualiza UI
                this.updateUI();
                
                return data;
            } else {
                console.warn('âš ï¸ NÃ£o foi possÃ­vel sincronizar (status', response.status, ')');
                return null;
            }
        } catch (error) {
            console.error('âŒ Erro ao sincronizar com backend:', error);
            return null;
        }
    }

    loadUserPlan() {
        const saved = localStorage.getItem('sparkUserPlan');
        if (!saved) {
            localStorage.setItem('sparkUserPlan', 'FREE');
            return 'FREE';
        }
        return saved;
    }

    saveUserPlan(plan) {
        this.userPlan = plan;
        localStorage.setItem('sparkUserPlan', plan);
        console.log('ðŸ’¾ Plano salvo localmente:', plan);
    }

    loadDailyLimits() {
        const saved = localStorage.getItem('sparkDailyLimits');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            likes: 0,
            superLikes: 0,
            lastReset: new Date().toDateString()
        };
    }

    saveDailyLimits() {
        localStorage.setItem('sparkDailyLimits', JSON.stringify(this.dailyLimits));
    }

    loadWeeklyLimits() {
        const saved = localStorage.getItem('sparkWeeklyLimits');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            boosts: 0,
            lastReset: this.getWeekStart()
        };
    }

    saveWeeklyLimits() {
        localStorage.setItem('sparkWeeklyLimits', JSON.stringify(this.weeklyLimits));
    }

    getWeekStart() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString();
    }

    checkAndResetLimits() {
        const today = new Date().toDateString();
        const weekStart = this.getWeekStart();

        if (this.dailyLimits.lastReset !== today) {
            console.log('ðŸ”„ Resetando limites diÃ¡rios');
            this.dailyLimits = {
                likes: 0,
                superLikes: 0,
                lastReset: today
            };
            this.saveDailyLimits();
        }

        if (this.weeklyLimits.lastReset !== weekStart) {
            console.log('ðŸ”„ Resetando limites semanais');
            this.weeklyLimits = {
                boosts: 0,
                lastReset: weekStart
            };
            this.saveWeeklyLimits();
        }
    }

    isPremium() {
        return this.userPlan === 'PREMIUM';
    }

    // âœ… ATIVAR PREMIUM - AGORA SINCRONIZA COM BACKEND!
    async activatePremium(secret = null) {
        try {
            console.log('ðŸ’Ž Ativando Premium no backend...');
            
            const response = await fetch(`${API_BASE_URL}/users/${this.telegramId}/premium`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
                },
                body: JSON.stringify({
                    action: 'activate',
                    duration_days: 30,
                    secret: secret || 'spark_admin_2024' // Em produÃ§Ã£o, remova isso!
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('âœ… Premium ativado no backend:', data);
                
                // Atualiza local
                this.saveUserPlan('PREMIUM');
                this.dailyLimits.likes = 0;
                this.dailyLimits.superLikes = 0;
                this.saveDailyLimits();
                
                this.updateUI();
                this.showToast('ðŸŽ‰ Premium ativado com sucesso!', 'success');
                
                return true;
            } else {
                const error = await response.json();
                console.error('âŒ Erro ao ativar premium:', error);
                this.showToast('âŒ Erro ao ativar Premium', 'error');
                return false;
            }
        } catch (error) {
            console.error('âŒ Erro:', error);
            this.showToast('âŒ Erro de conexÃ£o', 'error');
            return false;
        }
    }

    // âœ… DESATIVAR PREMIUM - SINCRONIZA COM BACKEND
    async deactivatePremium(secret = null) {
        try {
            console.log('ðŸ“‰ Desativando Premium no backend...');
            
            const response = await fetch(`${API_BASE_URL}/users/${this.telegramId}/premium`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
                },
                body: JSON.stringify({
                    action: 'deactivate',
                    secret: secret || 'spark_admin_2024'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('ðŸ“‰ Premium desativado:', data);
                
                this.saveUserPlan('FREE');
                this.updateUI();
                this.showToast('ðŸ“‰ Voltou para o plano FREE', 'info');
                
                return true;
            } else {
                console.error('âŒ Erro ao desativar premium');
                return false;
            }
        } catch (error) {
            console.error('âŒ Erro:', error);
            return false;
        }
    }

    // âœ… ATIVAR VIA DEBUG (mais fÃ¡cil para testes)
    async activatePremiumDebug() {
        try {
            console.log('ðŸ§ª Ativando Premium via DEBUG...');
            
            const response = await fetch(`${API_BASE_URL}/debug/activate-premium/${this.telegramId}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('âœ… Premium ativado (DEBUG):', data);
                
                this.saveUserPlan('PREMIUM');
                this.dailyLimits.likes = 0;
                this.dailyLimits.superLikes = 0;
                this.saveDailyLimits();
                
                this.updateUI();
                this.showToast('ðŸŽ‰ Premium ativado (DEBUG)!', 'success');
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('âŒ Erro:', error);
            return false;
        }
    }

    // âœ… DESATIVAR VIA DEBUG
    async deactivatePremiumDebug() {
        try {
            console.log('ðŸ§ª Desativando Premium via DEBUG...');
            
            const response = await fetch(`${API_BASE_URL}/debug/deactivate-premium/${this.telegramId}`);
            
            if (response.ok) {
                this.saveUserPlan('FREE');
                this.updateUI();
                this.showToast('ðŸ“‰ Premium desativado (DEBUG)', 'info');
                return true;
            }
            return false;
        } catch (error) {
            console.error('âŒ Erro:', error);
            return false;
        }
    }

    canLike() {
        const config = VIP_CONFIG[this.userPlan];
        
        if (config.unlimited) {
            return { allowed: true, remaining: Infinity };
        }

        const used = this.dailyLimits.likes;
        const limit = config.likesPerDay;
        const remaining = limit - used;

        return {
            allowed: remaining > 0,
            remaining: remaining,
            limit: limit,
            used: used
        };
    }

    registerLike() {
        console.log('ðŸ” Verificando permissÃ£o para like...');
        const check = this.canLike();
        
        if (!check.allowed) {
            console.log('âŒ Limite de likes atingido!');
            this.showUpgradeModal('likes');
            return false;
        }

        // SÃ³ incrementa se nÃ£o for premium (backend controla para premium)
        if (!this.isPremium()) {
            this.dailyLimits.likes++;
            this.saveDailyLimits();
        }

        console.log('âœ… Like permitido! Restantes:', this.canLike().remaining);
        this.updateUI();
        return true;
    }

    canSuperLike() {
        const config = VIP_CONFIG[this.userPlan];
        
        if (config.superLikesPerDay === 0) {
            return { allowed: false, remaining: 0, isPremiumFeature: true };
        }

        const used = this.dailyLimits.superLikes;
        const limit = config.superLikesPerDay;
        const remaining = limit - used;

        return {
            allowed: remaining > 0,
            remaining: remaining,
            limit: limit,
            used: used,
            isPremiumFeature: false
        };
    }

    registerSuperLike() {
        console.log('ðŸ” Verificando permissÃ£o para Super Like...');
        const check = this.canSuperLike();
        
        if (check.isPremiumFeature) {
            console.log('âŒ Super Like Ã© recurso Premium!');
            this.showUpgradeModal('superLikes');
            return false;
        }

        if (!check.allowed) {
            console.log('âŒ Limite de Super Likes atingido!');
            this.showLimitReachedModal('Super Likes', check.limit);
            return false;
        }

        this.dailyLimits.superLikes++;
        this.saveDailyLimits();

        console.log('âœ… Super Like permitido! Restantes:', this.canSuperLike().remaining);
        this.updateUI();
        return true;
    }

    canBoost() {
        const config = VIP_CONFIG[this.userPlan];
        
        if (config.boostsPerWeek === 0) {
            return { allowed: false, remaining: 0, isPremiumFeature: true };
        }

        const used = this.weeklyLimits.boosts;
        const limit = config.boostsPerWeek;
        const remaining = limit - used;

        return {
            allowed: remaining > 0,
            remaining: remaining,
            limit: limit,
            used: used,
            isPremiumFeature: false
        };
    }

    registerBoost() {
        console.log('ðŸ” Verificando permissÃ£o para Boost...');
        const check = this.canBoost();
        
        if (check.isPremiumFeature) {
            console.log('âŒ Boost Ã© recurso Premium!');
            this.showUpgradeModal('boost');
            return false;
        }

        if (!check.allowed) {
            console.log('âŒ Limite de Boosts atingido!');
            this.showLimitReachedModal('Boosts', check.limit, 'semanais');
            return false;
        }

        this.weeklyLimits.boosts++;
        this.saveWeeklyLimits();

        console.log('âœ… Boost permitido!');
        this.updateUI();
        
        this.activateBoost();
        return true;
    }

    activateBoost() {
        const endTime = Date.now() + (60 * 60 * 1000);
        localStorage.setItem('sparkBoostActive', endTime);
        this.showToast('âš¡ Boost ativado por 1 hora!', 'success');
    }

    checkBoostStatus() {
        const boostEnd = localStorage.getItem('sparkBoostActive');
        if (boostEnd && Date.now() < parseInt(boostEnd)) {
            return true;
        }
        localStorage.removeItem('sparkBoostActive');
        return false;
    }

    canSeeLikes() {
        return VIP_CONFIG[this.userPlan].canSeeLikes;
    }

    showUpgradeModal(feature) {
        const messages = {
            likes: {
                title: 'â¤ï¸ Likes Esgotados!',
                text: 'VocÃª usou seus 10 likes diÃ¡rios gratuitos.',
                benefit: 'Premium tem likes ILIMITADOS!'
            },
            superLikes: {
                title: 'â­ Super Like Premium',
                text: 'Super Likes sÃ£o exclusivos para membros Premium.',
                benefit: 'Ganhe 5 Super Likes por dia!'
            },
            boost: {
                title: 'âš¡ Boost Premium',
                text: 'Boost Ã© exclusivo para membros Premium.',
                benefit: 'Ganhe 1 Boost grÃ¡tis por semana!'
            },
            viewLikes: {
                title: 'ðŸ‘ï¸ Recurso Premium',
                text: 'Ver quem te deu like Ã© exclusivo para Premium.',
                benefit: 'Veja todos que te curtiram!'
            }
        };

        const msg = messages[feature];

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl max-w-sm w-full p-6 animate-slide-up">
                <div class="text-center">
                    <div class="w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-crown text-4xl text-white"></i>
                    </div>
                    <h2 class="text-2xl font-black text-gray-800 mb-2">${msg.title}</h2>
                    <p class="text-gray-600 mb-4">${msg.text}</p>
                    <div class="bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl p-4 mb-6">
                        <p class="text-sm font-bold text-orange-600">âœ¨ ${msg.benefit}</p>
                    </div>
                    <button id="upgrade-now" class="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg mb-3">
                        Assinar Premium - R$ 29,90/mÃªs
                    </button>
                    <button id="close-upgrade" class="w-full text-gray-500 font-medium py-2">
                        Agora nÃ£o
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('upgrade-now').addEventListener('click', () => {
            modal.remove();
            this.openPremiumModal();
        });

        document.getElementById('close-upgrade').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    showLimitReachedModal(type, limit, period = 'diÃ¡rios') {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl max-w-sm w-full p-6 animate-slide-up">
                <div class="text-center">
                    <div class="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-clock text-4xl text-orange-500"></i>
                    </div>
                    <h2 class="text-2xl font-black text-gray-800 mb-2">Limite Atingido</h2>
                    <p class="text-gray-600 mb-4">VocÃª jÃ¡ usou seus ${limit} ${type} ${period}.</p>
                    <p class="text-sm text-gray-500 mb-6">Volte amanhÃ£ ou assine o Premium!</p>
                    <button id="close-limit" class="w-full bg-gray-200 text-gray-700 font-bold py-3 rounded-2xl">
                        Entendi
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('close-limit').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    openPremiumModal() {
        // Abre o modal de pagamento (se existir)
        const existingModal = document.getElementById('modal-premium');
        if (existingModal) {
            existingModal.classList.remove('hidden');
        } else {
            // Cria um modal simples se nÃ£o existir
            this.showToast('ðŸ’³ IntegraÃ§Ã£o de pagamento em breve!', 'info');
        }
    }

    updateUI() {
        // Atualiza contador de likes
        const likesCounter = document.getElementById('likes-counter');
        if (likesCounter) {
            const check = this.canLike();
            if (this.isPremium()) {
                likesCounter.innerHTML = `
                    <p class="text-[10px] uppercase font-bold opacity-90">Likes hoje</p>
                    <p class="text-xl font-black">âˆž Ilimitados</p>
                `;
            } else {
                likesCounter.innerHTML = `
                    <p class="text-[10px] uppercase font-bold opacity-90">Likes restantes hoje</p>
                    <p class="text-xl font-black">${check.remaining} de ${check.limit}</p>
                `;
            }
        }

        // Atualiza badge de plano
        const planBadge = document.getElementById('user-plan');
        if (planBadge) {
            planBadge.textContent = VIP_CONFIG[this.userPlan].name;
            planBadge.className = this.isPremium() 
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold'
                : 'bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-bold';
        }

        // Atualiza badge de verificado (sÃ³ premium)
        const verifiedBadge = document.getElementById('verified-badge');
        if (verifiedBadge) {
            verifiedBadge.style.display = this.isPremium() ? 'flex' : 'none';
        }

        // Atualiza botÃ£o de Super Like
        const btnStar = document.getElementById('btn-star');
        if (btnStar) {
            if (this.isPremium()) {
                btnStar.classList.remove('opacity-50');
                btnStar.title = `Super Likes: ${this.canSuperLike().remaining} restantes`;
            } else {
                btnStar.classList.add('opacity-50');
                btnStar.title = 'Super Like Ã© Premium';
            }
        }
        
        // ✅ Dispara evento personalizado para outras partes da UI
        window.dispatchEvent(new CustomEvent("vipStatusUpdated", {
            detail: {
                isPremium: this.isPremium(),
                plan: this.userPlan
            }
        }));
    }

    showToast(message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-orange-500'
        };

        const toast = document.createElement('div');
        toast.className = `fixed top-4 left-1/2 -translate-x-1/2 ${colors[type]} text-white px-6 py-3 rounded-full shadow-lg z-[300] text-sm font-medium transition-all`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    getStats() {
        return {
            plan: this.userPlan,
            isPremium: this.isPremium(),
            telegramId: this.telegramId,
            likes: this.canLike(),
            superLikes: this.canSuperLike(),
            boosts: this.canBoost(),
            canSeeLikes: this.canSeeLikes()
        };
    }
}

// âœ… Inicializa o sistema VIP
if (!window.vipSystem) {
    window.vipSystem = new VIPSystem();
    console.log('âœ… vipSystem criado');
} else {
    console.log('â„¹ï¸ vipSystem jÃ¡ existe');
}

// âœ… FunÃ§Ãµes globais de conveniÃªncia
window.activatePremium = () => window.vipSystem.activatePremiumDebug();
window.deactivatePremium = () => window.vipSystem.deactivatePremiumDebug();
window.getVIPStats = () => window.vipSystem.getStats();
window.syncVIP = () => window.vipSystem.syncWithBackend();

console.log('âœ… vip.js carregado!');
console.log('');
console.log('ðŸ’¡ COMANDOS DO CONSOLE:');
console.log('   activatePremium()   - Ativa Premium (sincroniza com banco)');
console.log('   deactivatePremium() - Desativa Premium');
console.log('   getVIPStats()       - Ver status completo');
console.log('   syncVIP()           - Sincronizar com backend');
console.log('');
