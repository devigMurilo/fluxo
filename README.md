
# 💸 Fluxo - Aplicativo de Finanças Pessoais (MVP v1.0)

O **Fluxo** é um aplicativo moderno de finanças pessoais desenvolvido com **React Native (Expo SDK 58)** e **Django REST Framework**. Ele permite registrar receitas e despesas com poucos toques, categorizar movimentações, visualizar métricas financeiras através de gráficos, acompanhar faturas com lembretes automáticos e explorar investimentos com simulações e taxas oficiais do Banco Central do Brasil.

---

## 🚀 Arquitetura & Tecnologias

- **Frontend Mobile**: React Native (Expo SDK 58) com TypeScript e Expo Router (rotas baseadas em arquivos em `src/app`).
- **Banco de Dados Local**: SQLite (`expo-sqlite`) com chaveamento estrito por `user_id` e armazenamento monetário em **centavos inteiros** para precisão contábil.
- **Backend API**: Django 5 + Django REST Framework com autenticação JWT (`djangorestframework-simplejwt`), tokens de acesso de 15 minutos e refresh tokens de 7 dias armazenados com criptografia via `expo-secure-store`.
- **Notificações**: `expo-notifications` locais agendadas para 2 dias antes do vencimento de faturas cadastradas.
- **Taxas de Mercado**: Integração direta com a API SGS do Banco Central do Brasil (Série 432 Selic e Série 4389 CDI) com modo de contingência offline.
- **Simulador de Juros Compostos**: Aportes mensais, prazos e taxas anuais com cálculo de patrimônio futuro e marcos temporais.
- **Aviso Regulatório Obrigatório**: Selo permanente na tela de investimentos: *"Conteúdo educativo. Não é recomendação de investimento."*

---

## 📁 Estrutura do Projeto

```
fluxo/
├── backend/
│   ├── authentication/     # Models (User customizado), Serializers, Views JWT
│   ├── core/               # Settings, URLs, SimpleJWT config
│   ├── db.sqlite3          # Banco de dados de autenticação
│   ├── manage.py
│   └── venv/               # Ambiente virtual Python configurado
└── frontend/
    ├── app.json
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── (auth)/     # Telas de Login e Cadastro
        │   ├── (app)/      # Abas: Início, Transações, Faturas, Investimentos, Perfil e Categorias
        │   └── _layout.tsx # Porteiro de navegação com AuthProvider e FinanceProvider
        ├── components/     # SummaryCard, CategoryPieChart, WeeklyBarChart, Modais
        ├── constants/      # Paleta de cores esmeralda/dark e ícones
        ├── context/        # AuthContext e FinanceContext reativo
        ├── db/             # database.ts (SQLite) e queries.ts (CRUD isolado por user_id)
        ├── services/       # api.ts (Axios + interceptors), auth.ts, bcb.ts, notifications.ts
        └── utils/          # formatCurrency.ts (centavos <-> BRL) e dates.ts
```

---

## ⚡ Como Rodar o Projeto

### 1. Iniciar o Backend (Django API)

No terminal:
```bash
cd "/home/igor/Área de trabalho/DEV/fluxo/backend"
# Ative o ambiente virtual e suba o servidor:
./venv/bin/python manage.py runserver 0.0.0.0:8000
```
> O backend estará disponível em `http://localhost:8000` ou no IP da sua rede local (ex: `http://192.168.x.x:8000`).

### 2. Iniciar o Frontend (Expo)

Em outro terminal:
```bash
cd "/home/igor/Área de trabalho/DEV/fluxo/frontend"
npx expo start
```
- Pressione `a` para abrir no emulador Android.
- Pressione `w` para abrir no navegador Web.
- Ou escaneie o QR Code com o aplicativo **Expo Go** no seu celular físico conectado na mesma rede Wi-Fi!

> **Dica para Celular Físico:** Na tela de login ou na tela de Perfil, há um botão de configuração onde você pode informar o endereço IP do seu computador na rede (ex: `http://192.168.1.15:8000`) para que o celular físico alcance o backend sem erros de `localhost`.

---

## ✅ Funcionalidades Implementadas

1. **Autenticação Segura**:
   - Registro de nova conta (Nome, e-mail, senha e confirmação com validadores fortes).
   - Login com e-mail e senha com persistência criptografada de sessão.
   - Renovação silenciosa de token via interceptor Axios.
   - Botão "Sair da Conta" no Perfil.
2. **Dashboard Dinâmico**:
   - Seletor mensal com navegação anterior/seguinte.
   - Cartão com Saldo do mês, total de receitas e total de despesas.
   - Gráfico de pizza/rosca com despesas por categoria e porcentagens.
   - Gráfico de barras com gastos acumulados por semana.
   - Lista das últimas transações com atalho para edição/exclusão.
3. **Gestão de Transações**:
   - CRUD completo de receitas e despesas.
   - Formatação automática de valores em centavos (sem imprecisões de ponto flutuante).
   - Filtros rápidos por tipo (Todos, Despesas, Receitas) e busca por descrição.
4. **Categorias Customizáveis**:
   - Categorias padrão pré-carregadas (Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Outros).
   - Criação e edição com escolha de cor e ícone da biblioteca Ionicons.
5. **Faturas & Lembretes**:
   - Cadastro de faturas com nome, valor e dia de vencimento.
   - Notificação local agendada para 2 dias antes do vencimento.
   - Marcação de fatura como paga/pendente por mês.
6. **Investimentos & Educação Financeira**:
   - Consulta em tempo real de taxas Selic e CDI via API do Banco Central.
   - Simulador de juros compostos com cálculo de aportes, juros e marcos de evolução.
   - Cards educativos completos sobre Tesouro Selic, CDB, Poupança e Fundos DI.
   - Registro manual de ativos na carteira e acompanhamento de patrimônio.
