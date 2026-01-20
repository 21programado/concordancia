/* app.js - Lógica principal de la PWA */

// ⚙️ CONFIGURACIÓN - CAMBIA ESTA URL POR LA DE TU APPS SCRIPT
const API_ENDPOINT = '';

// Mapeo de orden bíblico
const BIBLE_ORDER_MAP = {
    "Mateo": 40, "Marcos": 41, "Lucas": 42, "Juan": 43, "Hechos": 44, "Romanos": 45,
    "Primera de Corintios": 46, "Segunda de Corintios": 47, "Gálatas": 48, "Efesios": 49,
    "Filipenses": 50, "Colosenses": 51, "Primera de Tesalonicenses": 52, "Segunda de Tesalonicenses": 53,
    "Primera a Timoteo": 54, "Segunda a Timoteo": 55, "Tito": 56, "Filemón": 57, "Hebreos": 58,
    "Santiago": 59, "Primera de Pedro": 60, "Segunda de Pedro": 61, "Primera de Juan": 62,
    "Segunda de Juan": 63, "Tercera de Juan": 64, "Judas": 65, "Apocalipsis": 66
};

// Elementos del DOM
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsTitle = document.getElementById('results-title');
const totalResults = document.getElementById('total-results');
const concordanceList = document.getElementById('concordance-list');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');
const offlineIndicator = document.getElementById('offline-indicator');

// Estado de la app
let isOnline = navigator.onLine;

// 🔄 Inicialización
window.addEventListener('load', () => {
    initPWA();
    setupEventListeners();
    updateOnlineStatus();
});

// 📱 Funcionalidad PWA
function initPWA() {
    // Registrar service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('✅ Service Worker registrado:', reg.scope))
            .catch(err => console.error('❌ Error registrando SW:', err));
    }

    // Detectar si ya está instalada
    let installPromptEvent;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        installPromptEvent = e;
        showInstallPrompt(installPromptEvent);
    });

    // Ocultar prompt si ya está instalada
    window.addEventListener('appinstalled', () => {
        hideInstallPrompt();
        console.log('✅ PWA instalada');
    });
}

function showInstallPrompt(promptEvent) {
    const installPrompt = document.getElementById('install-prompt');
    const installButton = document.getElementById('install-button');
    const dismissButton = document.getElementById('dismiss-install');

    installPrompt.classList.remove('hidden');

    installButton.onclick = async () => {
        promptEvent.prompt();
        const result = await promptEvent.userChoice;
        if (result.outcome === 'accepted') {
            hideInstallPrompt();
        }
    };

    dismissButton.onclick = () => {
        hideInstallPrompt();
    };
}

function hideInstallPrompt() {
    const installPrompt = document.getElementById('install-prompt');
    installPrompt.classList.add('hidden');
}

// 🌐 Monitoreo de conexión
function setupEventListeners() {
    searchButton.addEventListener('click', executeSearch);
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            executeSearch();
        }
    });

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}

function updateOnlineStatus() {
    isOnline = navigator.onLine;
    offlineIndicator.classList.toggle('hidden', isOnline);
}

// 🔍 Búsqueda
async function executeSearch() {
    const searchWord = searchInput.value.trim();

    if (!searchWord) {
        resetResults();
        concordanceList.innerHTML = `<p class="text-secondary-light/50 mt-8">Por favor, escribe una palabra para buscar.</p>`;
        return;
    }

    if (!isOnline) {
        displayError('No hay conexión a internet. Por favor, conéctate e intenta de nuevo.');
        return;
    }

    await searchConcordance(searchWord);
}

async function searchConcordance(searchWord) {
    showLoading(true);
    resultsTitle.textContent = `Buscando: ${searchWord}...`;

    try {
        const url = `${API_ENDPOINT}?word=${encodeURIComponent(searchWord)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Error desconocido del servidor');
        }

        const sortedResults = sortConcordanceResults(data.results || []);
        renderConcordanceList(searchWord, data.totalOccurrences || 0, sortedResults);

    } catch (error) {
        console.error('Error en búsqueda:', error);
        displayError(error.message);
    } finally {
        showLoading(false);
    }
}

// 📊 Renderizado
function renderConcordanceList(searchWord, totalOccurrences, results) {
    concordanceList.innerHTML = '';
    
    resultsTitle.innerHTML = `Resultados para: <span class="font-greek text-accent-blue">${searchWord}</span>`;
    totalResults.textContent = `Se encontraron ${results.length} versículos, con un total de ${totalOccurrences} ocurrencias.`;

    if (results.length === 0) {
        concordanceList.innerHTML = `<p class="text-secondary-light/50 mt-8">No se encontró la palabra '${searchWord}' en el Nuevo Testamento griego.</p>`;
    } else {
        const ul = document.createElement('ul');
        ul.className = 'divide-y divide-secondary-light/10';

        results.forEach(item => {
            const li = document.createElement('li');
            li.className = 'concordance-entry flex justify-between items-center';
            
            const location = document.createElement('span');
            location.className = 'text-lg font-medium text-secondary-light flex-grow text-left';
            location.textContent = item.passage;
            
            const countBadge = document.createElement('span');
            countBadge.className = 'ml-4 px-3 py-1 bg-accent-blue text-white text-sm font-semibold rounded-full shadow-md whitespace-nowrap';
            countBadge.textContent = `Ocurrencias: ${item.count}`;
            
            li.appendChild(location);
            li.appendChild(countBadge);
            ul.appendChild(li);
        });

        concordanceList.appendChild(ul);
    }
}

// 🛠️ Utilidades UI
function showLoading(show) {
    loadingIndicator.classList.toggle('hidden', !show);
    searchButton.disabled = show;
    searchInput.disabled = show;
    
    if (show) {
        errorMessage.classList.add('hidden');
        totalResults.textContent = '';
    }
}

function displayError(message) {
    showLoading(false);
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    concordanceList.innerHTML = `<p class="text-red-400 font-medium mt-8">${message}</p>`;
    resultsTitle.innerHTML = `<span class="text-red-400">Error</span>`;
}

function resetResults() {
    resultsTitle.innerHTML = `<span class="text-secondary-light/50">Resultados de la Concordancia</span>`;
    totalResults.textContent = '';
    errorMessage.classList.add('hidden');
}

// 📖 Ordenamiento bíblico
function getBookNameFromPassage(passage) {
    const match = passage.match(/^([^\d]+)/);
    return match ? match[1].trim() : passage.split(' ')[0];
}

function sortConcordanceResults(results) {
    return results.sort((a, b) => {
        const partsA = a.passage.split(':').map(s => s.trim());
        const partsB = b.passage.split(':').map(s => s.trim());

        if (partsA.length < 2 || partsB.length < 2) return 0;

        const [bookAndChapA, verseA] = partsA;
        const [bookAndChapB, verseB] = partsB;
        
        const bookNameA = getBookNameFromPassage(bookAndChapA);
        const bookNameB = getBookNameFromPassage(bookAndChapB);
        
        const chapMatchA = bookAndChapA.match(/\d+$/);
        const chapMatchB = bookAndChapB.match(/\d+$/);
        
        const chapA = chapMatchA ? parseInt(chapMatchA[0]) : 0;
        const chapB = chapMatchB ? parseInt(chapMatchB[0]) : 0;
        
        const orderA = BIBLE_ORDER_MAP[bookNameA] || 999;
        const orderB = BIBLE_ORDER_MAP[bookNameB] || 999;

        if (orderA !== orderB) return orderA - orderB;
        if (chapA !== chapB) return chapA - chapB;
        
        return parseInt(verseA) - parseInt(verseB);
    });

}


