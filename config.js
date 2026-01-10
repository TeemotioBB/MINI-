// ========== CONFIGURAÇÃO DO USUÁRIO ==========
// Configuração personalizada para o usuário ID: 1293602874

const USER_CONFIG = {
    id: 1293602874,  // Seu ID do Telegram
    name: "Você",  // Será substituído pelo nome real do Telegram se disponível
    photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300"  // Foto padrão
};

// ========== CONFIGURAÇÃO DE LIKES RECEBIDOS ==========
// Estes perfis "deram like" em você
// Quando você der like neles → MATCH! 🎉

const LIKES_RECEBIDOS_CONFIG = [
    // ✅ Perfis configurados para dar MATCH:
    { 
        userId: 2,  // Lucas
        userName: "Lucas", 
        userPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300" 
    },
    { 
        userId: 4,  // Rafael
        userName: "Rafael", 
        userPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300" 
    },
    { 
        userId: 7,  // Camila
        userName: "Camila", 
        userPhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300" 
    }
    
    // 💡 QUER MAIS MATCHES? Adicione aqui:
    // Veja os IDs em profiles.js e copie o formato acima
    
    // Exemplo para adicionar Brenda (ID: 1):
    /*
    ,{
        userId: 1,
        userName: "Brenda",
        userPhoto: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=500"
    }
    */
    
    // Exemplo para adicionar Júlia (ID: 5):
    /*
    ,{
        userId: 5,
        userName: "Júlia",
        userPhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=500"
    }
    */
];

// ========== COMO FUNCIONA ==========
/*

🎯 SISTEMA DE MATCH:

1. Você dá LIKE em um perfil
2. Sistema verifica se esse perfil está em LIKES_RECEBIDOS_CONFIG
3. Se SIM → MATCH! 🎉
4. Se NÃO → Like normal

📋 PERFIS DISPONÍVEIS (de profiles.js):

ID | Nome    | Gênero
---|---------|--------
1  | Brenda  | F
2  | Lucas   | M ✅ (vai dar match!)
3  | Amanda  | F
4  | Rafael  | M ✅ (vai dar match!)
5  | Júlia   | F
6  | Felipe  | M
7  | Camila  | F ✅ (vai dar match!)
8  | Pedro   | M

✅ = Configurado para dar match

🔧 PARA ADICIONAR MAIS MATCHES:
   Copie um dos blocos comentados acima e descomente!

*/
