const authTabs = document.querySelectorAll('.auth-tab');
const authPanels = document.querySelectorAll('.auth-panel');
const authStatus = document.querySelector('#auth-status');
const accountSection = document.querySelector('#account');
const logoutButton = document.querySelector('#logout-button');
const protectedLinks = document.querySelectorAll('.nav-links a:not([href="#account"])');
const protectedSections = document.querySelectorAll('main > section:not(.hero):not(#account)');
const accountStorageKey = 'galaxy-account';
const playerNameStorageKey = 'galaxy-player-name';
const coinStorageKey = 'galaxy-coins';
const inventoryStorageKey = 'galaxy-inventory';
const avatarStorageKey = 'galaxy-avatar';
const playedGamesStorageKey = 'galaxy-played-games';
const completedMissionsStorageKey = 'galaxy-missions';
const demoAccount = {
    name: 'Galaxy Guest',
    email: 'guest@galaxy.com',
    password: 'galaxy123'
};

const getStoredAccount = () => {
    try {
        const account = JSON.parse(localStorage.getItem(accountStorageKey) || 'null');
        if (!account || typeof account.name !== 'string' || typeof account.email !== 'string' || typeof account.password !== 'string') {
            localStorage.removeItem(accountStorageKey);
            return null;
        }
        if (typeof account.playerName !== 'string' || !account.playerName.trim()) {
            account.playerName = account.name.trim();
            localStorage.setItem(accountStorageKey, JSON.stringify(account));
        }
        account.email = account.email.trim().toLowerCase();
        return account;
    } catch {
        localStorage.removeItem(accountStorageKey);
        return null;
    }
};

const getStoredAccounts = () => {
    const accounts = [];
    const addAccount = (account) => {
        if (!account || typeof account.name !== 'string' || typeof account.email !== 'string' || typeof account.password !== 'string') return;
        const normalized = {
            ...account,
            name: account.name.trim(),
            playerName: typeof account.playerName === 'string' && account.playerName.trim()
                ? account.playerName.trim()
                : account.name.trim(),
            email: account.email.trim().toLowerCase()
        };
        if (!accounts.some((storedAccount) => (
            storedAccount.email === normalized.email && storedAccount.password === normalized.password
        ))) accounts.push(normalized);
    };

    addAccount(getStoredAccount());
    try {
        const savedAccounts = JSON.parse(localStorage.getItem('galaxy-accounts') || '[]');
        if (Array.isArray(savedAccounts)) savedAccounts.forEach(addAccount);
    } catch {
        localStorage.removeItem('galaxy-accounts');
    }
    return accounts;
};

const saveStoredAccount = (account) => {
    const normalized = {
        ...account,
        playerName: typeof account.playerName === 'string' && account.playerName.trim()
            ? account.playerName.trim()
            : account.name.trim(),
        email: account.email.trim().toLowerCase()
    };
    const accounts = getStoredAccounts().filter((savedAccount) => savedAccount.email !== normalized.email);
    accounts.push(normalized);
    localStorage.setItem(accountStorageKey, JSON.stringify(normalized));
    localStorage.setItem('galaxy-accounts', JSON.stringify(accounts));
    localStorage.setItem('galaxy-active-account', normalized.email);
};

const getDisplayName = (account) => (account?.playerName || account?.name || 'Player').trim();

const setAuthStatus = (message, isError = false) => {
    if (!authStatus) return;
    authStatus.textContent = message;
    authStatus.dataset.state = isError ? 'error' : 'success';
};

const getAuthenticatedAccount = (identifier, password) => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const storedAccount = getStoredAccounts().find((account) => (
        (account.email === normalizedIdentifier || account.playerName.toLowerCase() === normalizedIdentifier)
        && account.password === password
    ));
    if (storedAccount) {
        return storedAccount;
    }
    if (normalizedIdentifier === demoAccount.email && password === demoAccount.password) {
        return demoAccount;
    }
    return null;
};

const getPlayedGames = () => {
    try {
        return JSON.parse(localStorage.getItem(playedGamesStorageKey) || '[]');
    } catch {
        return [];
    }
};

const getCompletedMissions = () => {
    try {
        return JSON.parse(localStorage.getItem(completedMissionsStorageKey) || '[]');
    } catch {
        return [];
    }
};

const updateMissionButtons = () => {
    const playedGames = new Set(getPlayedGames());
    const completedMissions = new Set(getCompletedMissions());
    const isAuthenticated = document.body.classList.contains('authenticated');

    document.querySelectorAll('.quest-button').forEach((button) => {
        const game = button.dataset.game;
        const isClaimed = completedMissions.has(game);
        const isUnlocked = isAuthenticated && playedGames.has(game) && !isClaimed;

        button.disabled = !isUnlocked;
        button.textContent = isClaimed
            ? 'Claimed'
            : isUnlocked
                ? `Claim ${button.dataset.reward} coins`
                : 'Play game to unlock';
    });
};

const unlockSite = (message, account = null) => {
    document.body.classList.add('authenticated');
    document.body.classList.remove('auth-locked');
    const playerName = getDisplayName(account || getStoredAccount() || demoAccount);
    sessionStorage.setItem('galaxy-authenticated', 'true');
    sessionStorage.setItem(playerNameStorageKey, playerName);
    setAuthStatus(message || `Welcome, ${playerName}. You are connected to the website.`);
    updateMissionButtons();
};

logoutButton?.addEventListener('click', () => {
    document.body.classList.remove('authenticated');
    document.body.classList.add('auth-locked');
    sessionStorage.removeItem('galaxy-authenticated');
    sessionStorage.removeItem(playerNameStorageKey);
    setAuthStatus('You have been logged out. Sign up or log in to continue.');
    updateMissionButtons();
    showAuthTab(document.querySelector('#login-tab') || authTabs[0]);
    accountSection?.scrollIntoView({ behavior: 'smooth' });
});

updateMissionButtons();

const showAuthTab = (tab) => {
    const panelId = tab.getAttribute('aria-controls');
    authTabs.forEach((currentTab) => {
        const isActive = currentTab === tab;
        currentTab.classList.toggle('active', isActive);
        currentTab.setAttribute('aria-selected', String(isActive));
    });
    authPanels.forEach((panel) => {
        panel.hidden = panel.id !== panelId;
    });
};

authTabs.forEach((tab) => {
    tab.addEventListener('click', () => showAuthTab(tab));
});

protectedSections.forEach((section) => section.classList.add('protected-section'));

protectedLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        if (document.body.classList.contains('authenticated')) return;
        event.preventDefault();
        setAuthStatus('Please sign up or log in before accessing this area.', true);
        accountSection?.scrollIntoView({ behavior: 'smooth' });
    });
});

document.querySelector('#signup-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.querySelector('#full-name')?.value.trim();
    const playerName = form.querySelector('#player-name')?.value.trim();
    const email = form.querySelector('#signup-email')?.value.trim().toLowerCase();
    const password = form.querySelector('#signup-password')?.value;

    if (!name || !playerName || !email || !password) {
        setAuthStatus('Please complete every sign-up field, including your player name.', true);
        return;
    }
    if (password.length < 6) {
        setAuthStatus('Your password must be at least 6 characters.', true);
        return;
    }

    const account = { name, playerName, email, password };
    try {
        saveStoredAccount(account);
    } catch {
        setAuthStatus('Your account could not be saved in this browser. Check storage settings and try again.', true);
        return;
    }
    form.reset();
    unlockSite(`Account created for ${playerName}. You are connected to Galaxy.`, account);
});

document.querySelector('#login-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const identifier = form.querySelector('#login-identifier, #login-email')?.value.trim();
    const password = form.querySelector('#login-password')?.value;

    if (!identifier || !password) {
        setAuthStatus('Please enter your email or player name and password.', true);
        return;
    }

    const account = getAuthenticatedAccount(identifier, password);
    if (!account) {
        const hasSavedAccounts = getStoredAccounts().length > 0;
        if (!hasSavedAccounts) {
            const signupForm = document.querySelector('#signup-form');
            const emailInput = signupForm?.querySelector('#signup-email');
            const passwordInput = signupForm?.querySelector('#signup-password');
            const fullNameInput = signupForm?.querySelector('#full-name');
            const playerNameInput = signupForm?.querySelector('#player-name');
            const email = identifier.includes('@') ? identifier : '';
            const suggestedName = email ? email.split('@')[0].replace(/[._-]+/g, ' ').trim() : '';

            if (emailInput && email) emailInput.value = email;
            if (passwordInput) passwordInput.value = password;
            if (fullNameInput && !fullNameInput.value && suggestedName) fullNameInput.value = suggestedName;
            if (playerNameInput && !playerNameInput.value && suggestedName) {
                playerNameInput.value = suggestedName.replace(/\s+/g, '');
            }

            setAuthStatus('No local profile is saved at this website address. Your email and password are ready in Sign Up so you can create a local profile here. Previous profile data cannot be recovered.', true);
            showAuthTab(document.querySelector('#signup-tab'));
            return;
        }
        setAuthStatus('The email/player name or password is incorrect. Try guest@galaxy.com / galaxy123 for the demo account.', true);
        return;
    }

    try { saveStoredAccount(account); } catch {}

    form.reset();
    unlockSite(`Welcome back, ${getDisplayName(account)}. You are logged in.`, account);
});

document.querySelector('#newsletter-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = document.querySelector('#newsletter-status');
    if (status) status.textContent = 'Thanks! You are subscribed to Galaxy updates.';
    event.currentTarget.reset();
});

const getAlexanderReply = (message) => {
    const question = message.toLowerCase();
    if (question.includes('recommend')) {
        return 'For competitive matches, try Valorant or Fortnite. For building, try Minecraft. For an adventure, try Genshin Impact or Honkai: Star Rail.';
    }
    if (question.includes('tip')) {
        return 'Warm up before competitive play, adjust your sensitivity gradually, communicate with teammates, and take regular breaks.';
    }
    if (question.includes('mission') || question.includes('coin')) {
        return 'Open Game Missions, play a listed game to unlock its reward, then claim the coins. Your balance is shown in the header.';
    }
    if (question.includes('teammate') || question.includes('friend')) {
        return 'Open the Friends & Messages drawer to connect with friends and find teammates.';
    }
    return 'Thanks for your question! Try one of the suggested topics, or ask about games, missions, coins, or teammates.';
};

document.querySelector('#chat-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.querySelector('#chat-input');
    const messages = document.querySelector('#chat-messages');
    const message = input?.value.trim();
    if (!message || !messages) return;

    const userMessage = document.createElement('p');
    userMessage.innerHTML = `<strong>You:</strong> ${message.replace(/[<>&"']/g, '')}`;
    messages.appendChild(userMessage);

    const reply = document.createElement('p');
    reply.innerHTML = `<strong>Alexander:</strong> ${getAlexanderReply(message).replace(/[<>&"']/g, '')}`;
    messages.appendChild(reply);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;
});

document.querySelectorAll('#chat .chat-prompt').forEach((button) => {
    button.addEventListener('click', () => {
        const form = document.querySelector('#chat-form');
        const input = form?.querySelector('#chat-input');
        if (!form || !input) return;
        input.value = button.dataset.prompt || button.textContent.trim();
        form.requestSubmit();
    });
});

// Coin balance
const coinBalance = document.querySelector('#coin-balance');
let coins = Number.parseInt(localStorage.getItem(coinStorageKey) || coinBalance?.textContent || '0', 10);
if (!Number.isFinite(coins)) coins = 0;
const renderCoins = () => {
    if (coinBalance) coinBalance.textContent = String(coins);
    localStorage.setItem(coinStorageKey, String(coins));
};
renderCoins();

// Mission claim buttons
document.querySelectorAll('.quest-button').forEach((button) => {
    button.addEventListener('click', () => {
        if (button.disabled) return;
        const reward = Number.parseInt(button.dataset.reward || '0', 10);
        const game = button.dataset.game;
        const completedMissions = getCompletedMissions();
        if (!completedMissions.includes(game)) {
            completedMissions.push(game);
            localStorage.setItem(completedMissionsStorageKey, JSON.stringify(completedMissions));
        }
        coins += reward;
        button.disabled = true;
        button.textContent = 'Claimed';
        renderCoins();
        const status = document.querySelector('#quest-status');
        if (status) status.textContent = `${game} mission claimed. +${reward} coins added.`;
        updateMissionButtons();
    });
});

// Game launch links
document.querySelectorAll('.game-launch-link').forEach((link) => {
    link.addEventListener('click', () => {
        const status = document.querySelector('#launcher-status');
        if (status) status.textContent = `Opening ${link.dataset.game}. If nothing happens, install the official launcher first.`;
    });
});

// Inventory
const inventoryList = document.querySelector('#inventory-list');
const inventory = JSON.parse(localStorage.getItem(inventoryStorageKey) || '[]');
const gameUrls = {
    Fortnite: 'https://www.fortnite.com/',
    Valorant: 'https://playvalorant.com/',
    Minecraft: 'https://www.minecraft.net/',
    PUBG: 'https://pubg.com/',
    FIFA: 'https://www.ea.com/games/ea-sports-fc',
    'Genshin Impact': 'https://genshin.hoyoverse.com/',
    'Wuthering Waves': 'https://wutheringwaves.kurogames.com/',
};
const renderInventory = () => {
    if (!inventoryList) return;
    inventoryList.replaceChildren();
    if (!inventory.length) {
        inventoryList.textContent = 'Your collection is empty.';
        return;
    }
    inventory.forEach(({ item, game }) => {
        const entry = document.createElement('span');
        entry.className = 'inventory-entry';
        entry.textContent = `${game}: ${item}`;
        inventoryList.append(entry);
        const url = gameUrls[game];
        if (url) {
            const link = document.createElement('a');
            link.className = 'inventory-link';
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Open game';
            inventoryList.append(link);
        }
        inventoryList.append(' | ');
    });
    inventoryList.lastChild?.remove();
};
renderInventory();

// Store buy buttons
document.querySelectorAll('.store-buy').forEach((button) => {
    button.addEventListener('click', () => {
        const price = Number.parseInt(button.dataset.price || '0', 10);
        const item = button.dataset.item || 'Item';
        const game = button.dataset.game || 'Galaxy';
        const status = document.querySelector('#store-status');
        if (coins < price) {
            if (status) status.textContent = `You need ${price - coins} more coins to buy ${item}.`;
            return;
        }
        coins -= price;
        inventory.push({ item, game });
        localStorage.setItem(inventoryStorageKey, JSON.stringify(inventory));
        button.disabled = true;
        button.textContent = 'Owned';
        renderCoins();
        renderInventory();
        if (status) status.textContent = `${item} added to your collection.`;
    });
});

// Avatar studio
const avatarForm = document.querySelector('#avatar-form');
let avatarData = null;
try {
    avatarData = JSON.parse(localStorage.getItem(avatarStorageKey) || 'null');
} catch {
    localStorage.removeItem(avatarStorageKey);
}
const avatarUsername = document.querySelector('#avatar-name-input');
const defaultAvatarUsername = sessionStorage.getItem(playerNameStorageKey) || getDisplayName(getStoredAccount() || demoAccount);
if (avatarUsername && !avatarData?.name) avatarUsername.value = defaultAvatarUsername;
const avatarOptions = {
    skin: { sunrise: '#f6c7a2', honey: '#c98b5b', cocoa: '#7b4b35', moon: '#ead8d0' },
    hair: { nebula: 'hair-nebula', flare: 'hair-flare', comet: 'hair-comet', visor: 'hair-visor' },
    outfit: { neon: 'outfit-neon', royal: 'outfit-royal', cyber: 'outfit-cyber', cosmic: 'outfit-cosmic' },
    accessory: { none: '', crown: 'accessory-crown', headset: 'accessory-headset', visor: 'accessory-visor' },
    background: { aurora: '', sunset: 'backdrop-sunset', ocean: 'backdrop-ocean', royal: 'backdrop-royal' },
};
const applyAvatar = (data) => {
    const preview = document.querySelector('#avatar-preview');
    const name = document.querySelector('#avatar-name');
    const head = document.querySelector('#avatar-head');
    const hair = document.querySelector('#avatar-hair-preview');
    const body = document.querySelector('#avatar-body');
    const accessory = document.querySelector('#avatar-accessory-preview');
    if (!preview || !name || !head || !hair || !body || !accessory) return;
    name.textContent = data.name || 'Galaxy Player';
    head.style.backgroundColor = avatarOptions.skin[data.skin] || avatarOptions.skin.sunrise;
    hair.className = `avatar-hair ${avatarOptions.hair[data.hair] || avatarOptions.hair.nebula}`;
    body.className = `avatar-body ${avatarOptions.outfit[data.outfit] || avatarOptions.outfit.neon}`;
    accessory.className = `avatar-accessory ${avatarOptions.accessory[data.accessory] || ''}`;
    preview.className = `avatar-preview ${avatarOptions.background[data.background] || ''}`;
};
if (avatarData) {
    Object.entries(avatarData).forEach(([key, value]) => {
        const field = document.querySelector(`#avatar-${key}-input, #avatar-${key}`);
        if (field) field.value = value;
    });
    applyAvatar(avatarData);
} else {
    applyAvatar({
        name: defaultAvatarUsername,
        skin: 'sunrise',
        hair: 'nebula',
        outfit: 'neon',
        accessory: 'none',
        background: 'ocean',
    });
}
const readAvatarForm = () => ({
    name: document.querySelector('#avatar-name-input')?.value.trim() || defaultAvatarUsername,
    skin: document.querySelector('#avatar-skin')?.value || 'sunrise',
    hair: document.querySelector('#avatar-hair')?.value || 'nebula',
    outfit: document.querySelector('#avatar-outfit')?.value || 'neon',
    accessory: document.querySelector('#avatar-accessory')?.value || 'none',
    background: document.querySelector('#avatar-background')?.value || 'aurora',
});

avatarForm?.querySelectorAll('input, select').forEach((field) => {
    field.addEventListener('input', () => applyAvatar(readAvatarForm()));
    field.addEventListener('change', () => applyAvatar(readAvatarForm()));
});

avatarForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = readAvatarForm();
    localStorage.setItem(avatarStorageKey, JSON.stringify(data));
    applyAvatar(data);
    const status = document.querySelector('#avatar-form-status');
    if (status) status.textContent = 'Avatar saved to your Galaxy profile.';
});

// Gamer community chat
document.querySelector('#gamer-chat-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.querySelector('#gamer-name')?.value.trim();
    const message = form.querySelector('#gamer-message')?.value.trim();
    const messages = document.querySelector('#gamer-messages');
    if (!name || !message || !messages) return;
    const post = document.createElement('p');
    post.innerHTML = `<strong>${name.replace(/[<>&"']/g, '')}:</strong> ${message.replace(/[<>&"']/g, '')}`;
    messages.append(post);
    form.reset();
    messages.scrollTop = messages.scrollHeight;
});

// ── Game catalog — deep links + official sites ────────────────────────────
// deepLink: custom URL scheme registered by the game client (works if installed).
// site:     official website linked separately on each game card.
const GAME_CATALOG = {
    valorant:     { deepLink: 'riotclient://launch-product=valorant&launch-patchline=live', site: 'https://playvalorant.com/' },
    roblox:       { deepLink: 'roblox-player://0+launchmode:play',      site: 'https://www.roblox.com/' },
    genshin:      { deepLink: 'hyp-global://launchgame?gamebiz=hk4e_global', site: 'https://genshin.hoyoverse.com/' },
    starrail:     { deepLink: 'hyp-global://launchgame?gamebiz=hkrpg_global', site: 'https://hsr.hoyoverse.com/' },
    wuthering:    { deepLink: 'wutheringwaves://launch',                 site: 'https://wutheringwaves.kurogames.com/' },
    zenless:      { deepLink: 'hyp-global://launchgame?gamebiz=nap_global', site: 'https://zenless.hoyoverse.com/' },
    honkai3:      { deepLink: 'hyp-global://launchgame?gamebiz=bh3_global', site: 'https://honkaiimpact3.hoyoverse.com/' },
    mlbb:         { deepLink: 'mobilelegends://',                       site: 'https://m.mobilelegends.com/' },
    minecraft:    { deepLink: 'minecraft://',                           site: 'https://www.minecraft.net/' },
    fortnite:     { deepLink: 'com.epicgames.launcher://apps/Fortnite?action=launch&silent=true', site: 'https://www.fortnite.com/' },
    pubg:         { deepLink: 'steam://rungameid/578080',               site: 'https://pubg.com/' },
    easportsfc:   { deepLink: 'origin2://game/launch?offerIds=Origin.OFR.50.0003340', site: 'https://www.ea.com/games/ea-sports-fc' },
    fifa:         { deepLink: 'eaapp://',                               site: 'https://www.ea.com/games/ea-sports-fc' },
    'wuthering-waves': { deepLink: 'wutheringwaves://launch',           site: 'https://wutheringwaves.kurogames.com/en/' },
    'honkai-impact-3rd': { deepLink: 'hyp-global://launchgame?gamebiz=bh3_global', site: 'https://honkaiimpact3.hoyoverse.com/' },
    'honkai-star-rail': { deepLink: 'hyp-global://launchgame?gamebiz=hkrpg_global', site: 'https://hsr.hoyoverse.com/' },
    'zenless-zone-zero': { deepLink: 'hyp-global://launchgame?gamebiz=nap_global', site: 'https://zenless.hoyoverse.com/' },
    // name-based keys used by .launch-btn data-game attributes
    'Valorant':           { deepLink: 'riotclient://launch-product=valorant&launch-patchline=live', site: 'https://playvalorant.com/' },
    'Roblox':             { deepLink: 'roblox-player://0+launchmode:play', site: 'https://www.roblox.com/' },
    'Honkai: Star Rail':  { deepLink: 'hyp-global://launchgame?gamebiz=hkrpg_global', site: 'https://hsr.hoyoverse.com/' },
    'Honkai Impact 3rd':  { deepLink: 'hyp-global://launchgame?gamebiz=bh3_global', site: 'https://honkaiimpact3.hoyoverse.com/' },
    'Mobile Legends':     { deepLink: 'mobilelegends://',               site: 'https://m.mobilelegends.com/' },
    'Genshin Impact':     { deepLink: 'hyp-global://launchgame?gamebiz=hk4e_global', site: 'https://genshin.hoyoverse.com/' },
    'Wuthering Waves':    { deepLink: 'wutheringwaves://launch',        site: 'https://wutheringwaves.kurogames.com/' },
    'Zenless Zone Zero':  { deepLink: 'hyp-global://launchgame?gamebiz=nap_global', site: 'https://zenless.hoyoverse.com/' },
    'Minecraft':          { deepLink: 'minecraft://',                   site: 'https://www.minecraft.net/' },
};

const HOYOPLAY_GAME_NAMES = {
    genshin: 'Genshin Impact',
    'honkai-impact-3rd': 'Honkai Impact 3rd',
    'honkai-star-rail': 'Honkai: Star Rail',
    'zenless-zone-zero': 'Zenless Zone Zero'
};

/** Open only the app protocol; website links are separate controls. */
function launchGameProtocol(key) {
    const entry = GAME_CATALOG[key];
    if (!entry?.deepLink) {
        const status = document.querySelector('#game-launch-status');
        if (status) status.textContent = 'No app link is configured for this game. Use Official Website to visit its website.';
        return;
    }

    window.location.assign(entry.deepLink);
}

// Wire up any .launch-btn links already in the HTML
document.querySelectorAll('.launch-btn').forEach((btn) => {
    // Only intercept if it's a button; <a> tags already have href set
    if (btn.tagName === 'BUTTON') {
        btn.addEventListener('click', () => launchGameProtocol(btn.dataset.game || btn.textContent.trim()));
    }
});

// Wire up .play-btn buttons (older markup)
document.querySelectorAll('.play-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
        const gameId = btn.dataset.game || '';
        const hoyoplayGameName = HOYOPLAY_GAME_NAMES[gameId];
        const status = document.querySelector('#game-launch-status');

        try {
            const response = await fetch('/api/launch-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId })
            });
            const result = await response.json();
            if (!response.ok || !result.ok) {
                if (status) status.textContent = result.message || 'The installed game app could not be opened. Use Official Website to visit the game website.';
                return;
            }
            if (status) status.textContent = hoyoplayGameName
                ? `Opening ${hoyoplayGameName} in HoYoPlay. Press Launch there to start the game.`
                : result.launcherOnly
                ? 'Opening Wuthering Waves launcher. Press Launch there to start the game.'
                : result.fallback
                ? 'The game app could not be opened. Use Official Website to visit the game website.'
                : 'Opening the installed game app.';
        } catch {
            if (status) status.textContent = hoyoplayGameName
                ? `Local launcher unavailable; opening the ${hoyoplayGameName} page in HoYoPlay.`
                : 'Local launcher unavailable; trying the direct app link.';
            launchGameProtocol(gameId);
        }
    });
});

// Legacy openApp() kept for any inline onclick="openApp(...)" calls
function openApp(key) {
    launchGameProtocol(key);
}

// Payment selection
let selectedPayment = null;

function selectPayment(method) {
    selectedPayment = method;
    document.querySelectorAll('.payment-option').forEach((option) => {
        option.classList.remove('selected');
    });
    const selected = document.querySelector(`[data-payment="${method}"]`);
    if (selected) selected.classList.add('selected');
    const label = document.getElementById('selectedPayment');
    if (label) label.textContent = '✅ Selected: ' + method;
}

async function startPayment(productId, productName, amount) {
    if (!selectedPayment) {
        alert('Please select a payment method first (GCash, Maya, or Card).');
        return;
    }

    const progress = document.getElementById('paymentProgress');
    const statusEl = document.getElementById('paymentStatus');
    const bar = document.getElementById('progressBar');

    if (progress) progress.style.display = 'block';

    // Step 1
    if (statusEl) statusEl.textContent = '🔄 Creating your order...';
    if (bar) bar.style.width = '20%';
    await new Promise(r => setTimeout(r, 700));

    // Step 2
    if (statusEl) statusEl.textContent = '🔒 Connecting to ' + selectedPayment + '...';
    if (bar) bar.style.width = '50%';
    await new Promise(r => setTimeout(r, 800));

    // Step 3
    if (statusEl) statusEl.textContent = '✅ Opening secure checkout...';
    if (bar) bar.style.width = '80%';
    await new Promise(r => setTimeout(r, 600));

    // Step 4 — done
    if (bar) bar.style.width = '100%';
    if (statusEl) statusEl.textContent = '🎉 Payment ready! Redirecting to ' + selectedPayment + '...';

    // Redirect to payment provider after a short delay
    await new Promise(r => setTimeout(r, 800));
    const urls = {
        GCash: 'https://www.gcash.com/',
        Maya: 'https://www.maya.ph/',
        Card: 'https://www.visa.com/',
    };
    window.open(urls[selectedPayment] || '#', '_blank');

    // Reset progress after redirect
    setTimeout(() => {
        if (progress) progress.style.display = 'none';
        if (bar) bar.style.width = '0%';
        if (statusEl) statusEl.textContent = 'Preparing payment...';
    }, 2000);
}

const dollCartStorageKey = 'galaxy-doll-cart';
const dollCartItems = document.querySelector('#doll-cart-items');
const dollCartCount = document.querySelector('#doll-cart-count');
const dollCartTotal = document.querySelector('#doll-cart-total-value');
const dollCartEmpty = document.querySelector('#doll-cart-empty');
const dollCartStatus = document.querySelector('#doll-cart-status');
const paymentDollLists = ['#payment-doll-items', '#payment-bag-items']
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);
const pesoFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
let dollCart = [];

try {
    const savedDollCart = JSON.parse(localStorage.getItem(dollCartStorageKey) || '[]');
    if (Array.isArray(savedDollCart)) {
        dollCart = savedDollCart.filter((item) => item && typeof item.id === 'string'
            && typeof item.name === 'string' && Number.isFinite(item.price)
            && Number.isFinite(item.quantity) && item.quantity > 0);
    }
} catch {
    localStorage.removeItem(dollCartStorageKey);
}

const saveDollCart = () => {
    try {
        localStorage.setItem(dollCartStorageKey, JSON.stringify(dollCart));
    } catch {
        if (dollCartStatus) dollCartStatus.textContent = 'Your bag could not be saved on this device.';
    }
};

const renderDollCart = () => {
    if (!dollCartItems) return;
    dollCartItems.replaceChildren();
    const itemCount = dollCart.reduce((total, item) => total + item.quantity, 0);
    const total = dollCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (dollCartCount) dollCartCount.textContent = String(itemCount);
    if (dollCartTotal) dollCartTotal.textContent = pesoFormatter.format(total);
    ['paymentOrderTotal', 'payment-subtotal', 'payment-total'].forEach((id) => {
        const element = document.querySelector(`#${id}`);
        if (element) element.textContent = pesoFormatter.format(total);
    });
    const paymentAmount = document.querySelector('#payment-amount');
    if (paymentAmount && total > 0) paymentAmount.value = String(total);
    if (dollCartEmpty) dollCartEmpty.hidden = dollCart.length > 0;

    paymentDollLists.forEach((list) => {
        list.replaceChildren();
        if (!dollCart.length) {
            const emptyRow = document.createElement('li');
            emptyRow.textContent = 'No dolls added yet.';
            list.append(emptyRow);
            return;
        }

        dollCart.forEach((item) => {
            const row = document.createElement('li');
            row.append(document.createTextNode(`${item.name} x${item.quantity}`));
            const price = document.createElement('strong');
            price.textContent = pesoFormatter.format(item.price * item.quantity);
            row.append(price);
            list.append(row);
        });
    });

    dollCart.forEach((item, index) => {
        const row = document.createElement('li');
        row.className = 'doll-cart-item';
        const details = document.createElement('span');
        details.textContent = `${item.name} x${item.quantity} - ${pesoFormatter.format(item.price * item.quantity)}`;
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'doll-remove';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => {
            dollCart.splice(index, 1);
            saveDollCart();
            renderDollCart();
            if (dollCartStatus) dollCartStatus.textContent = `${item.name} removed from your bag.`;
        });
        row.append(details, removeButton);
        dollCartItems.append(row);
    });
};

const addDollToCart = (item) => {
    if (!item.id || !item.name || !Number.isFinite(item.price) || item.price <= 0) return;
    const existingItem = dollCart.find((cartItem) => cartItem.id === item.id);
    if (existingItem) existingItem.quantity += 1;
    else dollCart.push({ ...item, quantity: 1 });
    saveDollCart();
    renderDollCart();
    if (dollCartStatus) dollCartStatus.textContent = `${item.name} added to your bag.`;
};

document.querySelectorAll('.doll-add, .personal-merch-add').forEach((button) => {
    button.addEventListener('click', () => {
        const personalization = document.querySelector('#merch-personalization-name')?.value.trim();
        const baseName = button.dataset.dollName || button.dataset.merchName || 'Galaxy merchandise';
        const name = button.classList.contains('personal-merch-add') && personalization
            ? `${baseName} (${personalization})`
            : baseName;
        const id = button.classList.contains('personal-merch-add') && personalization
            ? `${button.dataset.merchId}-${personalization.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            : button.dataset.dollId;
        addDollToCart({ id, name, price: Number(button.dataset.price) });
    });
});

const customDollForm = document.querySelector('#doll-custom-form');
const customDollName = document.querySelector('#doll-name');
const customDollPalette = document.querySelector('#doll-palette');
const customDollPreview = document.querySelector('#doll-preview');
const updateCustomDollPreview = () => {
    if (!customDollPreview || !customDollName || !customDollPalette) return;
    customDollPreview.dataset.palette = customDollPalette.value;
    customDollPreview.textContent = `Doll: ${customDollName.value.trim() || 'Your doll'}`;
};
customDollName?.addEventListener('input', updateCustomDollPreview);
customDollPalette?.addEventListener('change', updateCustomDollPreview);
customDollForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = customDollName?.value.trim();
    const palette = customDollPalette?.value || 'aurora';
    if (!name) return;
    addDollToCart({
        id: `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${palette}`,
        name: `${name} (custom ${palette} colorway)`,
        price: 999
    });
});
updateCustomDollPreview();
renderDollCart();

document.querySelector('#doll-checkout')?.addEventListener('click', () => {
    if (!dollCart.length) {
        if (dollCartStatus) dollCartStatus.textContent = 'Add at least one item before checkout.';
        return;
    }
    if (dollCartStatus) dollCartStatus.textContent = 'Your bag is ready. Choose a payment method below.';
    document.querySelector('#payments')?.scrollIntoView({ behavior: 'smooth' });
});

document.querySelector('#checkout-button')?.addEventListener('click', () => {
    const status = document.querySelector('#paymentStatus');
    const amountInput = document.querySelector('#payment-amount');
    if (!dollCart.length) {
        if (status) status.textContent = 'Add at least one item before checkout.';
        document.querySelector('#merchandise')?.scrollIntoView({ behavior: 'smooth' });
        return;
    }
    if (!selectedPayment) {
        if (status) status.textContent = 'Choose a payment method before continuing.';
        document.querySelector('.payment-option')?.focus();
        return;
    }
    const amount = Number(amountInput?.value);
    if (!Number.isFinite(amount) || amount <= 0) {
        if (status) status.textContent = 'Enter a valid order amount before continuing.';
        amountInput?.focus();
        return;
    }
    const orderName = dollCart.map((item) => `${item.name} x${item.quantity}`).join(', ');
    startPayment('doll-order', orderName, amount);
});

// Slide the community panels in from the left while keeping each drawer independent.
const setupCommunityDrawer = (openId, drawerId, closeId) => {
    const openButton = document.querySelector(`#${openId}`);
    const drawer = document.querySelector(`#${drawerId}`);
    const closeButton = document.querySelector(`#${closeId}`);
    if (!openButton || !drawer) return;

    const openDrawer = () => {
        if (!drawer.open) drawer.show();
        openButton.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => drawer.classList.add('drawer-visible'));
        closeButton?.focus();
    };

    const closeDrawer = () => {
        drawer.classList.remove('drawer-visible');
        window.setTimeout(() => {
            if (drawer.open) drawer.close();
        }, 280);
        openButton.setAttribute('aria-expanded', 'false');
        openButton.focus();
    };

    openButton.addEventListener('click', openDrawer);
    closeButton?.addEventListener('click', closeDrawer);
    drawer.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeDrawer();
    });
    document.addEventListener('click', (event) => {
        if (drawer.open && !drawer.contains(event.target) && event.target !== openButton) closeDrawer();
    });
    document.addEventListener('keydown', (event) => {
        if (drawer.open && event.key === 'Escape') closeDrawer();
    });
    drawer.addEventListener('close', () => {
        drawer.classList.remove('drawer-visible');
        openButton.setAttribute('aria-expanded', 'false');
    });
};

setupCommunityDrawer('highlights-drawer-open', 'highlights-drawer', 'highlights-drawer-close');
setupCommunityDrawer('community-drawer-open', 'community-drawer', 'community-drawer-close');

