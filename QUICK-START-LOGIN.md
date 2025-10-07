# 🚀 INÍCIO RÁPIDO - Sistema de Login

## ⚡ Configure em 5 minutos!

### 1️⃣ Ativar Firebase Authentication

```
https://console.firebase.google.com/project/tatuagem-c68be/authentication
↓
Clique em "Começar"
↓
Ative "Email/Password"
↓
Salvar
```

### 2️⃣ Criar Seu Usuário

```
Authentication > Users > Add user
↓
E-mail: seu@email.com
Senha: MinhaSenh@123
↓
Add user
```

### 3️⃣ Atualizar Regras do Firestore

```
https://console.firebase.google.com/project/tatuagem-c68be/firestore/rules
```

Cole isto:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /appointments/{appointmentId} {
      allow read, write: if request.auth != null;
    }
  }
}
```
Clique em **"Publicar"**

### 4️⃣ Atualizar Regras do Storage

```
https://console.firebase.google.com/project/tatuagem-c68be/storage/rules
```

Cole isto:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /appointments/{appointmentId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```
Clique em **"Publicar"**

### 5️⃣ Testar!

1. Recarregue seu site
2. Verá tela de login
3. Entre com suas credenciais
4. Pronto! 🎉

---

## 🔐 Credenciais Recomendadas

Para seu primeiro acesso, crie:

```
E-mail: admin@maryshmallo.com
Senha: Tattoo2025! (ou sua senha segura)
```

---

## ⚠️ IMPORTANTE

Depois de configurar:
- ✅ Seus dados ficam protegidos
- ✅ Apenas usuários autenticados acessam
- ✅ Você controla quem tem acesso

---

## 📖 Documentação Completa

Para detalhes completos, veja: **LOGIN-SETUP.md**

---

**Tudo pronto em menos de 5 minutos! 🚀**
