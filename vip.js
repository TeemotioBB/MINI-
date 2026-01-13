// ========== SISTEMA SIMPLIFICADO - TUDO FREE E ILIMITADO ==========

const API_BASE_URL = 'https://mini-production-cf60.up.railway.app/api';

class VIPSystem {
    constructor() {
        this.telegramId = this.getTelegramId();
        console.log('✅ Sistema inicializado - Tudo ilimitado!');
    }

    getTelegramId() {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
            return window.Telegram.WebApp.initDataUnsafe.user.id;
        }
        return localStorage.getItem('testTelegramId') || '123456789';
    }

    // Sempre permite likes
    canLike() {
        return { 
            allowed: true, 
            remaining: Infinity,
            limit: Infinity,
            used: 0
        };
    }

    // Sempre permite super likes
    canSuperLike() {
        return { 
            allowed: true, 
            remaining: Infinity,
            limit: Infinity,
            used: 0
        };
    }

    // Sempre permite boosts
    canBoost() {
        return { 
            allowed: true, 
            remaining: Infinity,
            limit: Infinity,
            used: 0
        };
    }

    // Sempre pode ver likes
    canSeeLikes() {
        return true;
    }

    // Sempre é "premium" (mas não mostra no layout)
    isPremium() {
        return true;
    }

    // Registra like sem restrições
    registerLike() {
        return true;
    }

    // Registra super like sem restrições
    registerSuperLike() {
        return true;
    }

    // Registra boost sem restrições
    registerBoost() {
        this.activateBoost();
        return true;
    }

    activateBoost() {
        const endTime = Date.now() + (60 * 60 * 1000);
        localStorage.setItem('sparkBoostActive', endTime);
        this.showToast('⚡ Boost ativado por 1 hora!', 'success');
    }

    checkBoostStatus() {
        const boostEnd = localStorage.getItem('sparkBoostActive');
        if (boostEnd && Date.now() < parseInt(boostEnd)) {
            return true;
        }
        localStorage.removeItem('sparkBoostActive');
        return false;
    }

    // Não mostra mais badges/contadores VIP
    updateUI() {
        // Remove qualquer badge de plano
        const planBadge = document.getElementById('user-plan');
        if (planBadge) {
            planBadge.remove();
        }

        // Remove badge de verificado
        const verifiedBadge = document.getElementById('verified-badge');
        if (verifiedBadge) {
            verifiedBadge.remove();
        }

        // Remove contador de likes
        const likesCounter = document.getElementById('likes-counter');
        if (likesCounter) {
            likesCounter.remove();
        }

        // Habilita super like (sem restrição)
        const btnStar = document.getElementById('btn-star');
        if (btnStar) {
            btnStar.classList.remove('opacity-50');
            btnStar.title = 'Super Like';
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
            plan: 'FREE',
            isPremium: true, // Internamente sim, mas não mostra
            telegramId: this.telegramId,
            likes: { allowed: true, remaining: Infinity },
            superLikes: { allowed: true, remaining: Infinity },
            boosts: { allowed: true, remaining: Infinity },
            canSeeLikes: true,
            unlimited: true
        };
    }
}

// Inicializa o sistema
if (!window.vipSystem) {
    window.vipSystem = new VIPSystem();
    console.log('✅ Sistema carregado - Tudo ilimitado para todos!');
} else {
    console.log('ℹ️ Sistema já existe');
}

// Funções globais
window.getVIPStats = () => window.vipSystem.getStats();

console.log('✅ Sistema simplificado carregado!');
console.log('💡 Likes ilimitados para todos! 🎉');
