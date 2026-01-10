// ========== SISTEMA VIP COMPLETO ==========

// ========== CONFIGURAÇÕES ==========
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

// ========== CLASSE PRINCIPAL DO SISTEMA VIP ==========
class VIPSystem {
    constructor() {
        this.userPlan = this.loadUserPlan();
        this.dailyLimits = this.loadDailyLimits();
        this.weeklyLimits = this.loadWeeklyLimits();
        this.checkAndResetLimits();
        
        console.log('✅ Sistema VIP inicializado');
        console.log('📊 Plano atual:', this.userPlan);
        console.log('💎 Limites diários:', this.dailyLimits);
    }

    // ========== CARREGAR PLANO DO USUÁRIO ==========
    loadUserPlan() {
        const saved = localStorage.getItem('sparkUserPlan');
        return saved || 'FREE';
    }

    // ========== SALVAR PLANO DO USUÁRIO ==========
    saveUserPlan(plan) {
        this.userPlan = plan;
        localStorage.setItem('sparkUserPlan', plan);
        console.log('💾 Plano salvo:', plan);
    }

    // ========== CARREGAR LIMITES DIÁRIOS ==========
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

    // ========== SALVAR LIMITES DIÁRIOS ==========
    saveDailyLimits() {
        localStorage.setItem('sparkDailyLimits', JSON.stringify(this.dailyLimits));
    }

    // ========== CARREGAR LIMITES SEMANAIS ==========
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

    // ========== SALVAR LIMITES SEMANAIS ==========
    saveWeeklyLimits() {
        localStorage.setItem('sparkWeeklyLimits', JSON.stringify(this.weeklyLimits));
    }

    // ========== PEGAR INÍCIO DA SEMANA ==========
    getWeekStart() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Segunda-feira
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString();
    }

    // ========== VERIFICAR E RESETAR LIMITES ==========
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

    // ========== VERIFICAR SE É VIP ==========
    isPremium() {
        return this.userPlan === 'PREMIUM';
    }

    // ========== ATIVAR PREMIUM ==========
    activatePremium() {
        this.saveUserPlan('PREMIUM');
        this.updateUI();
        console.log('🎉 Premium ativado!');
        return true;
    }

    // ========== DESATIVAR PREMIUM (para testes) ==========
    deactivatePremium() {
        this.saveUserPlan('FREE');
        this.updateUI();
        console.log('📉 Premium desativado');
        return true;
    }

    // ========== PODE DAR LIKE? ==========
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

    // ========== REGISTRAR LIKE ==========
    registerLike() {
        const check = this.canLike();
        
        if (!check.allowed) {
            this.showUpgradeModal('likes');
            return false;
        }

        if (!this.isPremium()) {
            this.dailyLimits.likes++;
            this.saveDailyLimits();
        }

        console.log('❤️ Like registrado. Restantes:', this.canLike().remaining);
        this.updateUI();
        return true;
    }

    // ========== PODE DAR SUPER LIKE? ==========
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

    // ========== REGISTRAR SUPER LIKE ==========
    registerSuperLike() {
        const check = this.canSuperLike();
        
        if (check.isPremiumFeature) {
            this.showUpgradeModal('superLikes');
            return false;
        }

        if (!check.allowed) {
            this.showLimitReachedModal('Super Likes', check.limit);
            return false;
        }

        this.dailyLimits.superLikes++;
        this.saveDailyLimits();

        console.log('⭐ Super Like registrado. Restantes:', this.canSuperLike().remaining);
        this.updateUI();
        return true;
    }

    // ========== PODE DAR BOOST? ==========
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

    // ========== REGISTRAR BOOST ==========
    registerBoost() {
        const check = this.canBoost();
        
        if (check.isPremiumFeature) {
            this.showUpgradeModal('boost');
            return false;
        }

        if (!check.allowed) {
            this.showLimitReachedModal('Boosts', check.limit, 'semanais');
            return false;
        }

        this.weeklyLimits.boosts++;
        this.saveWeeklyLimits();

        console.log('⚡ Boost registrado. Restantes:', this.canBoost().remaining);
        this.updateUI();
        
        // Ativa boost por 1 hora
        this.activateBoost();
        return true;
    }

    // ========== ATIVAR BOOST ==========
    activateBoost() {
        const endTime = Date.now() + (60 * 60 * 1000); // 1 hora
        localStorage.setItem('sparkBoostActive', endTime);
        
        this.showToast('⚡ Boost ativado por 1 hora!', 'success');
        
        // Verifica se ainda está ativo
        setTimeout(() => {
            this.checkBoostStatus();
        }, 60 * 60 * 1000);
    }

    // ========== VERIFICAR STATUS DO BOOST ==========
    checkBoostStatus() {
        const boostEnd = localStorage.getItem('sparkBoostActive');
        if (boostEnd && Date.now() < parseInt(boostEnd)) {
            return true;
        }
        localStorage.removeItem('sparkBoostActive');
        return false;
    }

    // ========== PODE VER QUEM DEU LIKE? ==========
    canSeeLikes() {
        const config = VIP_CONFIG[this.userPlan];
        return config.canSeeLikes;
    }

    // ========== MOSTRAR MODAL DE UPGRADE ==========
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

        // Eventos
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

    // ========== MOSTRAR MODAL DE LIMITE ATINGIDO ==========
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
                    <p class="text-sm text-gray-500 mb-6">Volte amanhã ou assine o Premium para ter acesso ilimitado!</p>
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

    // ========== ABRIR MODAL PREMIUM ==========
    openPremiumModal() {
        const existingModal = document.getElementById('modal-premium');
        if (existingModal) {
            existingModal.classList.remove('hidden');
        }
    }

    // ========== ATUALIZAR UI ==========
    updateUI() {
        // Atualiza contador de likes
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

        // Atualiza badge de plano
        const planBadge = document.getElementById('user-plan');
        if (planBadge) {
            planBadge.textContent = VIP_CONFIG[this.userPlan].name;
        }

        // Atualiza badge verificado
        const verifiedBadge = document.getElementById('verified-badge');
        if (verifiedBadge) {
            verifiedBadge.style.display = this.isPremium() ? 'inline' : 'none';
        }
    }

    // ========== MOSTRAR TOAST ==========
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

    // ========== OBTER ESTATÍSTICAS ==========
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

// ========== INSTÂNCIA GLOBAL ==========
window.vipSystem = new VIPSystem();

// ========== EXPOR FUNÇÕES ÚTEIS ==========
window.activatePremium = () => window.vipSystem.activatePremium();
window.deactivatePremium = () => window.vipSystem.deactivatePremium();
window.getVIPStats = () => window.vipSystem.getStats();

console.log('✅ vip.js carregado com sucesso!');
console.log('💡 Use no console: activatePremium() ou deactivatePremium()');
console.log('📊 Ver stats: getVIPStats()');
