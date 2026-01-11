// ========== PERFIS PARA O APP (VERSÃO CORRIGIDA) ==========

let profiles = [];
let currentProfileIndex = 0;

// ========== BUSCAR PERFIS DO BACKEND (COM FILTRO DE JÁ VISTOS) ==========
async function loadProfiles() {
    console.log('🔄 Carregando perfis do servidor...');
    
    try {
        // Pega o ID do usuário do Telegram
        let telegramId = null;
        
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
            telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
            console.log('📱 Telegram ID detectado:', telegramId);
        } else {
            // ID de teste para desenvolvimento no navegador
            telegramId = localStorage.getItem('testTelegramId') || '123456789';
            console.log('🧪 Usando ID de teste:', telegramId);
        }
        
        // ✅ BUSCA PERFIS EXCLUINDO OS QUE JÁ FORAM VISTOS
        const response = await fetch(`https://mini-production-cf60.up.railway.app/api/users/${telegramId}/discover?limit=20`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
            // ✅ FILTRA OS PERFIS QUE JÁ FORAM VISTOS (SALVOS NO LOCALSTORAGE)
            const seenProfiles = getSeenProfiles();
            
            profiles = data
                .filter(user => !seenProfiles.includes(user.telegram_id))
                .map(user => ({
                    id: user.id,
                    telegram_id: user.telegram_id,
                    name: user.name,
                    age: user.age,
                    gender: user.gender,
                    photo: user.photo_url || user.photos?.[0] || 'https://via.placeholder.com/500x600?text=Sem+Foto',
                    photos: user.photos || [],
                    bio: user.bio || '',
                    city: user.city || '',
                    verified: user.is_premium || false
                }));
            
            console.log('✅ Perfis carregados:', profiles.length);
            console.log('🚫 Perfis já vistos filtrados:', seenProfiles.length);
            console.log('👥 Perfis disponíveis:', profiles.map(p => p.name));
        } else {
            console.log('🔭 Nenhum perfil disponível no momento');
            profiles = [];
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar perfis:', error);
        profiles = [];
    }
    
    // Reseta o índice
    currentProfileIndex = 0;
    
    // Dispara evento para o app.js saber que carregou
    window.dispatchEvent(new CustomEvent('profilesLoaded', { 
        detail: { count: profiles.length } 
    }));
    
    return profiles;
}

// ========== GERENCIAR PERFIS JÁ VISTOS ==========

// Pegar lista de perfis já vistos
function getSeenProfiles() {
    const saved = localStorage.getItem('sparkSeenProfiles');
    if (!saved) return [];
    
    try {
        return JSON.parse(saved);
    } catch (e) {
        return [];
    }
}

// ✅ MARCAR PERFIL COMO VISTO (CHAME ISSO QUANDO DER LIKE/DISLIKE)
function markProfileAsSeen(telegramId) {
    const seen = getSeenProfiles();
    
    if (!seen.includes(telegramId)) {
        seen.push(telegramId);
        localStorage.setItem('sparkSeenProfiles', JSON.stringify(seen));
        console.log('✅ Perfil marcado como visto:', telegramId);
    }
}

// Limpar perfis vistos (útil para testar)
function clearSeenProfiles() {
    localStorage.removeItem('sparkSeenProfiles');
    console.log('🧹 Perfis vistos limpos!');
}

// ✅ EXPOR FUNÇÕES GLOBALMENTE
window.markProfileAsSeen = markProfileAsSeen;
window.clearSeenProfiles = clearSeenProfiles;

// ========== CARREGAR MAIS PERFIS ==========
async function loadMoreProfiles() {
    console.log('🔄 Carregando mais perfis...');
    
    const previousCount = profiles.length;
    await loadProfiles();
    
    const newCount = profiles.length;
    console.log(`📊 Perfis: ${previousCount} → ${newCount}`);
    
    return newCount > 0;
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 profiles.js iniciando...');
    
    // Pequeno delay para garantir que o Telegram WebApp inicializou
    setTimeout(() => {
        loadProfiles();
    }, 100);
});

console.log('✅ profiles.js carregado!');
console.log('💡 Para limpar perfis vistos no console: clearSeenProfiles()');
