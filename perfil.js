// Elementos do HTML
const btnEdit = document.getElementById('btn-edit');
const btnLogout = document.getElementById('btn-logout');

// Dados do usuário (depois vem do Telegram/Backend)
const userData = {
    name: "João Silva",
    age: 28,
    photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300",
    bio: "Desenvolvedor apaixonado por tecnologia 💻 | Amo viajar e conhecer novas culturas ✈️ | Viciado em café ☕",
    location: "São Paulo, SP",
    job: "Desenvolvedor Full Stack",
    education: "Ciência da Computação - USP",
    stats: {
        likes: 156,
        matches: 42,
        superLikes: 8
    }
};

// Carrega dados do usuário na tela
function loadUserProfile() {
    document.getElementById('user-name').textContent = userData.name;
    document.getElementById('user-age').textContent = `${userData.age} anos`;
    document.getElementById('user-photo').src = userData.photo;
    document.getElementById('user-bio').textContent = userData.bio;
    document.getElementById('user-location').textContent = userData.location;
    document.getElementById('user-job').textContent = userData.job;
    document.getElementById('user-education').textContent = userData.education;
}

// Botão editar perfil
btnEdit.addEventListener('click', () => {
    alert('🔧 Função de editar perfil em desenvolvimento!\n\nEm breve você poderá:\n- Trocar foto\n- Editar bio\n- Atualizar informações');
});

// Botão sair
btnLogout.addEventListener('click', () => {
    const confirmLogout = confirm('Tem certeza que deseja sair?');
    if (confirmLogout) {
        alert('👋 Você saiu da conta!');
        // Aqui depois vai limpar dados e redirecionar
        window.location.href = 'index.html';
    }
});

// Inicializa
loadUserProfile();