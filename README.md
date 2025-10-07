# Agendador de Tatuagens 📅

Um sistema web completo para gerenciar agendamentos de tatuagens, desenvolvido com Firebase e hospedado no GitHub Pages.

## 🎨 Funcionalidades

- ✅ Criar agendamentos com informações detalhadas
- ✅ Upload de múltiplas imagens de referência
- ✅ Visualização em calendário interativo
- ✅ Lista completa de agendamentos
- ✅ Editar e excluir agendamentos
- ✅ Filtrar e buscar agendamentos
- ✅ Interface responsiva e moderna
- ✅ Armazenamento em nuvem com Firebase

## 🚀 Como Configurar

### 1. Configurar o Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative o **Firestore Database**:
   - Vá em "Firestore Database" no menu lateral
   - Clique em "Criar banco de dados"
   - Escolha o modo de teste (para começar)
   
4. Ative o **Storage**:
   - Vá em "Storage" no menu lateral
   - Clique em "Começar"
   - Use as regras padrão (para começar)

5. Obtenha suas credenciais:
   - Vá em Configurações do Projeto (ícone de engrenagem)
   - Role até "Seus apps"
   - Clique em "Adicionar app" e selecione "Web" (</> ícone)
   - Copie as configurações do Firebase

6. Cole as configurações no arquivo `firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "sua-api-key",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

### 2. Configurar Regras de Segurança

**Firestore Rules** (para começar - modo aberto):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Storage Rules** (para começar - modo aberto):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **IMPORTANTE**: Essas regras são para desenvolvimento. Para produção, configure regras de segurança adequadas!

### 3. Testar Localmente

Você pode testar localmente abrindo o arquivo `index.html` diretamente no navegador ou usando um servidor local:

**Usando Python:**
```bash
python -m http.server 8000
```

**Usando Node.js:**
```bash
npx serve
```

Acesse: `http://localhost:8000`

### 4. Publicar no GitHub Pages

1. Crie um repositório no GitHub
2. Faça push dos arquivos:

```bash
git init
git add .
git commit -m "Initial commit - Agendador de Tatuagens"
git branch -M main
git remote add origin https://github.com/seu-usuario/seu-repositorio.git
git push -u origin main
```

3. Ative o GitHub Pages:
   - Vá em Settings > Pages
   - Em "Source", selecione "main" branch
   - Clique em "Save"
   - Seu site estará disponível em: `https://seu-usuario.github.io/seu-repositorio/`

## 📱 Como Usar

### Criar um Agendamento

1. Clique na aba "Novo Agendamento"
2. Preencha as informações do cliente
3. Adicione a data e horário
4. Descreva a tatuagem desejada
5. Faça upload de imagens de referência (opcional)
6. Clique em "Salvar Agendamento"

### Visualizar no Calendário

1. Na aba "Calendário", navegue pelos meses
2. Dias com agendamentos ficam destacados
3. Clique em um dia para ver os agendamentos
4. Clique em um agendamento para ver detalhes completos

### Gerenciar Agendamentos

1. Use a aba "Lista de Agendamentos" para ver todos
2. Use o filtro de busca para encontrar clientes
3. Filtre por "Próximos" ou "Passados"
4. Clique em qualquer agendamento para ver detalhes
5. Use os botões "Editar" e "Excluir" conforme necessário

## 🛠️ Tecnologias Utilizadas

- HTML5
- CSS3 (com Grid e Flexbox)
- JavaScript (ES6+)
- Firebase Firestore (banco de dados)
- Firebase Storage (armazenamento de imagens)
- GitHub Pages (hospedagem)

## 📦 Estrutura do Projeto

```
agendador/
├── index.html          # Página principal
├── styles.css          # Estilos da aplicação
├── app.js              # Lógica da aplicação
├── firebase-config.js  # Configuração do Firebase
└── README.md           # Este arquivo
```

## 🎨 Personalização

Você pode personalizar as cores editando as variáveis CSS no arquivo `styles.css`:

```css
:root {
    --primary-color: #2c3e50;
    --secondary-color: #e74c3c;
    --accent-color: #3498db;
    /* ... outras cores ... */
}
```

## 📝 Licença

Este projeto é livre para uso pessoal e comercial.

## 🤝 Contribuindo

Sinta-se à vontade para fazer fork, melhorar e enviar pull requests!

## 📧 Suporte

Se tiver dúvidas ou problemas, abra uma issue no repositório.

---

Desenvolvido com ❤️ para tatuadores profissionais
