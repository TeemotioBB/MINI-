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

class VIPSystem {
    constructor() {
        this.userPlan = this.loadUserPlan();
        this.dailyLimits = this.loadDailyLimits();
        this.weeklyLimits = this.loadWeeklyLimits();
        this.checkAndResetLimits();
        
        // ✅ BUSCA LIMITES DO BACKEND AO INICIAR
        this.syncWithBackend();
        
        console.log('✅ Sistema VIP inicializado');
        console.log('📊 Plano atual:', this.userPlan);
        console.log('💎 Limites diários:', this.dailyLimits);
    }

    // ✅ FUNÇÃO CORRIGIDA - SINCRONIZA COM BACKEND
    async syncWithBackend() {
        try {
            // Pega telegram_id
            let telegramId = null;
            
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
                telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
            } else {
                telegramId = localStorage.getItem('testTelegramId') || '123456789';
            }
            
            console.log('🔄 Sincronizando com backend para:', telegramId);
            
            // ✅ CORRIGIDO - Usando backticks (template literals)
            const url = `https://mini-production-cf60.up.railway.app/api/debug/check-limits/${telegramId}`;
            console.log('🌐 URL da requisição:', url);
            
            // Busca limites do backend
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                
                console.log('📥 Dados do backend:', data);
                
                // ✅ ATUALIZA LIMITES COM OS DADOS DO BACKEND
                this.dailyLimits = {
                    likes: data.limits.daily_likes.used,
                    superLikes: data.limits.daily_super_likes.used,
                    lastReset: new Date().toDateString()
                };
                
                // ✅ ATUALIZA PLANO (SE FOR PREMIUM NO BACKEND)
                if (data.user.is_premium) {
                    this.userPlan = 'PREMIUM';
                    this.saveUserPlan('PREMIUM');
                }
                
                // Salva no localStorage
                this.saveDailyLimits();
                
                console.log('✅ Sincronizado com backend!', {
                    likes_usados: this.dailyLimits.likes,
                    likes_restantes: data.limits.daily_likes.remaining,
                    is_premium: data.user.is_premium
                });
                
                // Atualiza UI
                this.updateUI();
            } else {
                console.warn('⚠️ Não foi possível sincronizar com backend, usando localStorage');
            }
        } catch (error) {
            console.error('❌ Erro ao sincronizar com backend:', error);
            console.log('ℹ️ Continuando com localStorage');
        }
    }

    loadUserPlan() {
        const saved = localStorage.getItem('sparkUserPlan');
        if (!saved) {
            console.log('🆕 Novo usuário detectado, iniciando como FREE');
            localStorage.setItem('sparkUserPlan', 'FREE');
            return 'FREE';
        }
        return saved;
    }

    saveUserPlan(plan) {
        this.userPlan = plan;
        localStorage.setItem('sparkUserPlan', plan);
        console.log('💾 Plano salvo:', plan);
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

        // Reset diário
        if (this.dailyLimits.lastReset !== today) {
            console.log('🔄 Resetando limites diários');
            this.dailyLimits = {
                likes: 0,
                superLikes: 0,
                lastReset: today
            };
            this.saveDailyLimits();
        }

        // Reset semanal
        if (this.weeklyLimits.lastReset !== weekStart) {
            console.log('🔄 Resetando limites semanais');
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

    activatePremium() {
        this.saveUserPlan('PREMIUM');
        this.updateUI();
        this.showToast('🎉 Premium ativado com sucesso!', 'success');
        console.log('🎉 Premium ativado!');
        return true;
    }

    deactivatePremium() {
        this.saveUserPlan('FREE');
        this.updateUI();
        this.showToast('📉 Voltou para o plano FREE', 'info');
        console.log('📉 Premium desativado');
        return true;
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
        console.log('🔍 Verificando permissão para dar like...');
        const check = this.canLike();
        
        console.log('📊 Status:', check);
        
        if (!check.allowed) {
            console.log('❌ Limite de likes atingido!');
            this.showUpgradeModal('likes');
            return false;
        }

        if (!this.isPremium()) {
            this.dailyLimits.likes++;
            this.saveDailyLimits();
        }

        console.log('✅ Like permitido! Restantes:', this.canLike().remaining);
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
        console.log('🔍 Verificando permissão para Super Like...');
        const check = this.canSuperLike();
        
        console.log('📊 Status:', check);
        
        if (check.isPremiumFeature) {
            console.log('❌ Super Like é recurso Premium!');
            this.showUpgradeModal('superLikes');
            return false;
        }

        if (!check.allowed) {
            console.log('❌ Limite de Super Likes atingido!');
            this.showLimitReachedModal('Super Likes', check.limit);
            return false;
        }

        this.dailyLimits.superLikes++;
        this.saveDailyLimits();

        console.log('✅ Super Like permitido! Restantes:', this.canSuperLike().remaining);
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
        console.log('🔍 Verificando permissão para Boost...');
        const check = this.canBoost();
        
        console.log('📊 Status:', check);
        
        if (check.isPremiumFeature) {
            console.log('❌ Boost é recurso Premium!');
            this.showUpgradeModal('boost');
            return false;
        }

        if (!check.allowed) {
            console.log('❌ Limite de Boosts atingido!');
            this.showLimitReachedModal('Boosts', check.limit, 'semanais');
            return false;
        }

        this.weeklyLimits.boosts++;
        this.saveWeeklyLimits();

        console.log('✅ Boost permitido! Restantes:', this.canBoost().remaining);
        this.updateUI();
        
        this.activateBoost();
        return true;
    }

    activateBoost() {
        const endTime = Date.now() + (60 * 60 * 1000);
        localStorage.setItem('sparkBoostActive', endTime);
        
        this.showToast('⚡ Boost ativado por 1 hora!', 'success');
        
        setTimeout(() => {
            this.checkBoostStatus();
        }, 60 * 60 * 1000);
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
        const config = VIP_CONFIG[this.userPlan];
        return config.canSeeLikes;
    }

    showUpgradeModal(feature) {
        const messages = {
            likes: {
                title: '❤️ Likes Esgotados!',
                text: 'Você usou seus 10 likes diários gratuitos.',
                benefit: 'Premium tem likes ILIMITADOS!'
            },
            superLikes: {
                title: '⭐ Super Like Premium',
                text: 'Super Likes são exclusivos para membros Premium.',
                benefit: 'Ganhe 5 Super Likes por dia!'
            },
            boost: {
                title: '⚡ Boost Premium',
                text: 'Boost é exclusivo para membros Premium.',
                benefit: 'Ganhe 1 Boost grátis por semana!'
            },
            viewLikes: {
                title: '👁️ Recurso Premium',
                text: 'Ver quem te deu like é exclusivo para Premium.',
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
                        <p class="text-sm font-bold text-orange-600">✨ ${msg.benefit}</p>
                    </div>
                    <button id="upgrade-now" class="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg mb-3">
                        Assinar Premium - R$ 29,90/mês
                    </button>
                    <button id="close-upgrade" class="w-full text-gray-500 font-medium py-2">
                        Agora não
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

    showLimitReachedModal(type, limit, period = 'diários') {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl max-w-sm w-full p-6 animate-slide-up">
                <div class="text-center">
                    <div class="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-clock text-4xl text-orange-500"></i>
                    </div>
                    <h2 class="text-2xl font-black text-gray-800 mb-2">Limite Atingido</h2>
                    <p class="text-gray-600 mb-4">Você já usou seus ${limit} ${type} ${period}.</p>
                    <p class="text-sm text-gray-500 mb-6">Volte amanhã ou assine o Premium!</p>
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
        const existingModal = document.getElementById('modal-premium');
        if (existingModal) {
            existingModal.classList.remove('hidden');
        }
    }

    updateUI() {
        const likesCounter = document.getElementById('likes-counter');
        if (likesCounter) {
            const check = this.canLike();
            if (this.isPremium()) {
                likesCounter.innerHTML = `
                    <p class="text-[10px] uppercase font-bold opacity-90">Likes hoje</p>
                    <p class="text-xl font-black">∞ Ilimitados</p>
                `;
            } else {
                likesCounter.innerHTML = `
                    <p class="text-[10px] uppercase font-bold opacity-90">Likes restantes hoje</p>
                    <p class="text-xl font-black">${check.remaining} de ${check.limit}</p>
                `;
            }
        }

        const planBadge = document.getElementById('user-plan');
        if (planBadge) {
            planBadge.textContent = VIP_CONFIG[this.userPlan].name;
        }

        const verifiedBadge = document.getElementById('verified-badge');
        if (verifiedBadge) {
            verifiedBadge.style.display = this.isPremium() ? 'inline' : 'none';
        }
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
            likes: this.canLike(),
            superLikes: this.canSuperLike(),
            boosts: this.canBoost(),
            canSeeLikes: this.canSeeLikes()
        };
    }
}

// ✅ Inicializa o sistema VIP
if (!window.vipSystem) {
    window.vipSystem = new VIPSystem();
    console.log('✅ vipSystem criado pela primeira vez');
} else {
    console.log('ℹ️ vipSystem já existe, não será recriado');
}

// ✅ Funções globais de conveniência
window.activatePremium = () => window.vipSystem.activatePremium();
window.deactivatePremium = () => window.vipSystem.deactivatePremium();
window.getVIPStats = () => window.vipSystem.getStats();

console.log('✅ vip.js carregado com sucesso!');
console.log('💡 Use no console: activatePremium() ou deactivatePremium()');
console.log('📊 Ver stats: getVIPStats()');
