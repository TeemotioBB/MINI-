// ========== PERFIS PARA O APP ==========
// Os perfis serão carregados do banco de dados via API

let profiles = [];
let currentProfileIndex = 0;

// ========== BUSCAR PERFIS DO BACKEND ==========
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
        
        // Busca perfis da API
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
            // Mapeia os dados do banco para o formato do app
            profiles = data.map(user => ({
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
            console.log('👥 Perfis:', profiles.map(p => p.name));
        } else {
            console.log('📭 Nenhum perfil disponível no momento');
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
// Carrega perfis quando a página abre
document.addEventListener('DOMContentLoaded', () => {
    console.log('📝 profiles.js iniciando...');
    
    // Pequeno delay para garantir que o Telegram WebApp inicializou
    setTimeout(() => {
        loadProfiles();
    }, 100);
});

console.log('✅ profiles.js carregado!');
