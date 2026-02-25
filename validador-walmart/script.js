// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const infoSection = document.getElementById('infoSection');
const rulesSection = document.getElementById('rulesSection');
const resultsSection = document.getElementById('resultsSection');
const resultsWithRulesSection = document.getElementById('resultsWithRulesSection');
const categoriasCount = document.getElementById('categoriasCount');
const tomaCount = document.getElementById('tomaCount');
const faltantesCount = document.getElementById('faltantesCount');
const foundCount = document.getElementById('foundCount');
const missingCount = document.getElementById('missingCount');
const foundTableBody = document.getElementById('foundTableBody');
const missingTableBody = document.getElementById('missingTableBody');
const downloadFoundBtn = document.getElementById('downloadFoundBtn');
const downloadMissingBtn = document.getElementById('downloadMissingBtn');
const matchingRuleInput = document.getElementById('matchingRule');
const applyRuleBtn = document.getElementById('applyRuleBtn');
const foundWithRulesCount = document.getElementById('foundWithRulesCount');
const missingWithRulesCount = document.getElementById('missingWithRulesCount');
const foundWithRulesTableBody = document.getElementById('foundWithRulesTableBody');
const missingWithRulesTableBody = document.getElementById('missingWithRulesTableBody');
const downloadFoundWithRulesBtn = document.getElementById('downloadFoundWithRulesBtn');
const downloadMissingWithRulesBtn = document.getElementById('downloadMissingWithRulesBtn');

// Data storage
let categoriasData = [];
let tomaData = [];
let faltantesData = [];
let foundMatches = [];
let missingLinks = [];
let foundMatchesWithRules = [];
let missingLinksWithRules = [];
let currentMatchingRule = '';

// Tab functionality
const tabButtons = document.querySelectorAll('.tab-button[data-tab]');
const tabPanes = document.querySelectorAll('.tab-pane[id^="tab-"]:not([id*="rules"])');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        if (!targetTab) return;
        
        // Remove active class from all buttons and panes in this section
        const section = button.closest('.results-section');
        section.querySelectorAll('.tab-button[data-tab]').forEach(btn => btn.classList.remove('active'));
        section.querySelectorAll('.tab-pane[id^="tab-"]:not([id*="rules"])').forEach(pane => pane.classList.remove('active'));
        
        // Add active class to clicked button and corresponding pane
        button.classList.add('active');
        document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
});

// Tab functionality for rules section
const tabButtonsRules = document.querySelectorAll('.tab-button[data-tab-rules]');
const tabPanesRules = document.querySelectorAll('.tab-pane[id*="rules"]');

tabButtonsRules.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab-rules');
        if (!targetTab) return;
        
        // Remove active class from all buttons and panes in this section
        const section = button.closest('.results-section');
        section.querySelectorAll('.tab-button[data-tab-rules]').forEach(btn => btn.classList.remove('active'));
        section.querySelectorAll('.tab-pane[id*="rules"]').forEach(pane => pane.classList.remove('active'));
        
        // Add active class to clicked button and corresponding pane
        button.classList.add('active');
        document.getElementById(`tab-${targetTab}-rules`).classList.add('active');
    });
});

// File input event
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
});

// Drag and drop events
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        fileInput.files = e.dataTransfer.files;
        processFile(file);
    } else {
        alert('Por favor, selecciona un archivo XLSX válido');
    }
});

// Process file
function processFile(file) {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        processExcelFile(file);
    } else {
        alert('Por favor, selecciona un archivo XLSX válido con 3 hojas: Categorias, Toma, Faltantes');
    }
}

// Process Excel file
function processExcelFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get sheet names
            const sheetNames = workbook.SheetNames;
            
            // Find required sheets (case-insensitive, handle accents)
            const categoriasSheet = sheetNames.find(name => {
                const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return normalized.includes('categoria') || normalized === 'categorias';
            });
            const tomaSheet = sheetNames.find(name => {
                const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return normalized.includes('toma') || normalized === 'toma';
            });
            const faltantesSheet = sheetNames.find(name => {
                const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return normalized.includes('faltante') || normalized === 'faltantes';
            });
            
            if (!tomaSheet || !faltantesSheet) {
                alert('El archivo debe contener las hojas "Toma" y "Faltantes". Hojas encontradas: ' + sheetNames.join(', '));
                return;
            }
            
            // Read sheets
            if (categoriasSheet) {
                const categoriasWS = workbook.Sheets[categoriasSheet];
                categoriasData = XLSX.utils.sheet_to_json(categoriasWS, { header: 1, defval: '' });
            }
            
            const tomaWS = workbook.Sheets[tomaSheet];
            tomaData = XLSX.utils.sheet_to_json(tomaWS, { header: 1, defval: '' });
            
            const faltantesWS = workbook.Sheets[faltantesSheet];
            faltantesData = XLSX.utils.sheet_to_json(faltantesWS, { header: 1, defval: '' });
            
            // Process data
            processData();
            
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error al procesar el archivo: ' + error.message);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Check if a string is a valid URL
function isValidURL(str) {
    if (!str || typeof str !== 'string') return false;
    str = str.trim();
    if (str === '') return false;
    
    // Check if it looks like a URL (has http/https or looks like a domain)
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    const hasProtocol = /^https?:\/\//i.test(str);
    const looksLikeDomain = /^([\da-z\.-]+)\.([a-z\.]{2,6})/i.test(str);
    
    return hasProtocol || looksLikeDomain || urlPattern.test(str);
}

// Process data and find matches
function processData() {
    // Find column indices
    const tomaHeaders = tomaData[0] || [];
    const faltantesHeaders = faltantesData[0] || [];
    
    const linkConsultaIndex = findColumnIndex(tomaHeaders, 'LINK_DE_CONSULTA');
    const linkFaltanteIndex = findColumnIndex(faltantesHeaders, 'LINK_FALTANTE');
    
    if (linkConsultaIndex === -1) {
        alert('No se encontró la columna "LINK_DE_CONSULTA" en la hoja Toma');
        return;
    }
    
    if (linkFaltanteIndex === -1) {
        alert('No se encontró la columna "LINK_FALTANTE" en la hoja Faltantes');
        return;
    }
    
    // Extract valid links from Toma (skip header row, only rows with valid URLs)
    const tomaLinks = new Set();
    const tomaLinksMap = new Map(); // Map normalized URL to original URL
    for (let i = 1; i < tomaData.length; i++) {
        const link = tomaData[i][linkConsultaIndex];
        if (link && typeof link === 'string' && link.trim() !== '') {
            const trimmedLink = link.trim();
            if (isValidURL(trimmedLink)) {
                const normalized = normalizeURL(trimmedLink);
                tomaLinks.add(normalized);
                if (!tomaLinksMap.has(normalized)) {
                    tomaLinksMap.set(normalized, trimmedLink);
                }
            }
        }
    }
    
    // Process Faltantes and find matches (only rows with valid URLs)
    foundMatches = [];
    missingLinks = [];
    
    for (let i = 1; i < faltantesData.length; i++) {
        const linkFaltante = faltantesData[i][linkFaltanteIndex];
        if (!linkFaltante || (typeof linkFaltante === 'string' && linkFaltante.trim() === '')) {
            continue; // Skip empty rows
        }
        
        const linkFaltanteStr = typeof linkFaltante === 'string' ? linkFaltante.trim() : String(linkFaltante);
        
        // Only process if it's a valid URL
        if (!isValidURL(linkFaltanteStr)) {
            continue; // Skip rows without valid URLs
        }
        
        const normalizedFaltante = normalizeURL(linkFaltanteStr);
        
        // Find matching link in Toma
        let matchedLink = null;
        if (tomaLinks.has(normalizedFaltante)) {
            matchedLink = tomaLinksMap.get(normalizedFaltante);
        }
        
        const rowData = {
            rowIndex: i + 1, // Excel row number (1-indexed, +1 for header)
            linkFaltante: linkFaltanteStr,
            matchedLink: matchedLink,
            fullRow: faltantesData[i]
        };
        
        if (matchedLink) {
            foundMatches.push(rowData);
        } else {
            missingLinks.push(rowData);
        }
    }
    
    // Update UI
    updateInfo();
    displayResults();
    
    // Show rules section if data is loaded
    if (tomaData.length > 0 && faltantesData.length > 0) {
        rulesSection.style.display = 'block';
    }
}

// Extract pattern from URL based on regex rule
function extractPatternFromRule(url, regexRule) {
    if (!url || !regexRule) return null;
    
    try {
        // Create regex from the rule string
        // Remove quotes if present
        let ruleStr = regexRule.trim().replace(/^["']|["']$/g, '');
        
        // Try to create regex
        const regex = new RegExp(ruleStr, 'i'); // case-insensitive
        
        // Find match in URL
        const match = url.match(regex);
        
        if (match && match[0]) {
            return match[0]; // Return the matched string
        }
        
        return null;
    } catch (error) {
        console.error('Error parsing regex:', error);
        return null;
    }
}

// Process data with matching rule
function processDataWithRule(rule) {
    if (!rule || rule.trim() === '') {
        alert('Por favor, ingresa una expresión regular (regex) de matcheo');
        return;
    }
    
    // Validate regex
    try {
        let ruleStr = rule.trim().replace(/^["']|["']$/g, '');
        new RegExp(ruleStr, 'i'); // Test if regex is valid
    } catch (error) {
        alert('La expresión regular no es válida. Por favor, verifica el formato.\nEjemplo: \\/id\\/[0-9a-zA-Z\\-]+');
        return;
    }
    
    currentMatchingRule = rule.trim();
    
    // Find column indices
    const tomaHeaders = tomaData[0] || [];
    const faltantesHeaders = faltantesData[0] || [];
    
    const linkConsultaIndex = findColumnIndex(tomaHeaders, 'LINK_DE_CONSULTA');
    const linkFaltanteIndex = findColumnIndex(faltantesHeaders, 'LINK_FALTANTE');
    
    if (linkConsultaIndex === -1 || linkFaltanteIndex === -1) {
        alert('No se encontraron las columnas necesarias');
        return;
    }
    
    // Extract patterns from Toma (only rows with valid URLs)
    // Store all URLs with their extracted patterns for contains search
    const tomaUrlsWithPatterns = [];
    for (let i = 1; i < tomaData.length; i++) {
        const link = tomaData[i][linkConsultaIndex];
        if (link && typeof link === 'string' && link.trim() !== '') {
            const trimmedLink = link.trim();
            if (isValidURL(trimmedLink)) {
                const pattern = extractPatternFromRule(trimmedLink, rule);
                tomaUrlsWithPatterns.push({
                    url: trimmedLink,
                    pattern: pattern
                });
            }
        }
    }
    
    // Process Faltantes and find matches with rule
    foundMatchesWithRules = [];
    missingLinksWithRules = [];
    
    for (let i = 1; i < faltantesData.length; i++) {
        const linkFaltante = faltantesData[i][linkFaltanteIndex];
        if (!linkFaltante || (typeof linkFaltante === 'string' && linkFaltante.trim() === '')) {
            continue;
        }
        
        const linkFaltanteStr = typeof linkFaltante === 'string' ? linkFaltante.trim() : String(linkFaltante);
        
        if (!isValidURL(linkFaltanteStr)) {
            continue;
        }
        
        // Extract pattern from Faltante URL
        const patternFaltante = extractPatternFromRule(linkFaltanteStr, rule);
        
        if (!patternFaltante) {
            // No pattern found, add to missing
            missingLinksWithRules.push({
                rowIndex: i + 1,
                linkFaltante: linkFaltanteStr,
                matchedLink: null,
                matchedPattern: null,
                fullRow: faltantesData[i]
            });
            continue;
        }
        
        // Search for pattern in Toma URLs (contains check)
        // Check if any Toma URL contains the extracted pattern
        let matchedLink = null;
        for (const tomaItem of tomaUrlsWithPatterns) {
            // Option 1: Check if Toma URL contains the pattern extracted from Faltante
            if (tomaItem.url.includes(patternFaltante)) {
                matchedLink = tomaItem.url;
                break;
            }
            // Option 2: Check if Toma has the same pattern extracted
            if (tomaItem.pattern && patternFaltante && 
                tomaItem.pattern.toLowerCase() === patternFaltante.toLowerCase()) {
                matchedLink = tomaItem.url;
                break;
            }
        }
        
        const rowData = {
            rowIndex: i + 1,
            linkFaltante: linkFaltanteStr,
            matchedLink: matchedLink,
            matchedPattern: patternFaltante,
            fullRow: faltantesData[i]
        };
        
        if (matchedLink) {
            foundMatchesWithRules.push(rowData);
        } else {
            missingLinksWithRules.push(rowData);
        }
    }
    
    // Update UI
    displayResultsWithRules();
}

// Find column index (case-insensitive)
function findColumnIndex(headers, columnName) {
    const normalizedName = columnName.toLowerCase().trim();
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (header && typeof header === 'string' && header.toLowerCase().trim() === normalizedName) {
            return i;
        }
    }
    return -1;
}

// Normalize URL for comparison
function normalizeURL(url) {
    if (!url) return '';
    
    // Remove trailing slashes
    url = url.replace(/\/+$/, '');
    
    // Convert to lowercase
    url = url.toLowerCase();
    
    // Remove protocol for comparison (optional)
    url = url.replace(/^https?:\/\//, '');
    
    return url.trim();
}

// Update info section
function updateInfo() {
    // Count categorias rows (all rows except header)
    const categoriasRows = categoriasData.length > 0 ? categoriasData.length - 1 : 0;
    
    // Count Toma rows with valid URLs
    const tomaHeaders = tomaData[0] || [];
    const linkConsultaIndex = findColumnIndex(tomaHeaders, 'LINK_DE_CONSULTA');
    let tomaRowsWithURLs = 0;
    if (linkConsultaIndex !== -1) {
        for (let i = 1; i < tomaData.length; i++) {
            const link = tomaData[i][linkConsultaIndex];
            if (link && typeof link === 'string' && link.trim() !== '') {
                if (isValidURL(link.trim())) {
                    tomaRowsWithURLs++;
                }
            }
        }
    }
    
    // Count Faltantes rows with valid URLs
    const faltantesHeaders = faltantesData[0] || [];
    const linkFaltanteIndex = findColumnIndex(faltantesHeaders, 'LINK_FALTANTE');
    let faltantesRowsWithURLs = 0;
    if (linkFaltanteIndex !== -1) {
        for (let i = 1; i < faltantesData.length; i++) {
            const link = faltantesData[i][linkFaltanteIndex];
            if (link && typeof link === 'string' && link.trim() !== '') {
                if (isValidURL(link.trim())) {
                    faltantesRowsWithURLs++;
                }
            }
        }
    }
    
    categoriasCount.textContent = categoriasRows > 0 ? `${categoriasRows} filas` : 'No encontrada';
    tomaCount.textContent = `${tomaRowsWithURLs} filas con URLs`;
    faltantesCount.textContent = `${faltantesRowsWithURLs} filas con URLs`;
    
    infoSection.style.display = 'block';
}

// Display results
function displayResults() {
    foundCount.textContent = foundMatches.length;
    missingCount.textContent = missingLinks.length;
    
    // Display found matches
    foundTableBody.innerHTML = '';
    foundMatches.forEach((match, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><a href="${match.linkFaltante}" target="_blank">${match.linkFaltante}</a></td>
            <td><a href="${match.matchedLink}" target="_blank">${match.matchedLink}</a></td>
            <td>${match.rowIndex}</td>
        `;
        foundTableBody.appendChild(row);
    });
    
    // Display missing links
    missingTableBody.innerHTML = '';
    missingLinks.forEach((link, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><a href="${link.linkFaltante}" target="_blank">${link.linkFaltante}</a></td>
            <td>${link.rowIndex}</td>
        `;
        missingTableBody.appendChild(row);
    });
    
    resultsSection.style.display = 'block';
}

// Display results with rules
function displayResultsWithRules() {
    foundWithRulesCount.textContent = foundMatchesWithRules.length;
    missingWithRulesCount.textContent = missingLinksWithRules.length;
    
    // Display found matches with rules
    foundWithRulesTableBody.innerHTML = '';
    foundMatchesWithRules.forEach((match, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><a href="${match.linkFaltante}" target="_blank">${match.linkFaltante}</a></td>
            <td><a href="${match.matchedLink}" target="_blank">${match.matchedLink}</a></td>
            <td><code>${match.matchedPattern || '-'}</code></td>
            <td>${match.rowIndex}</td>
        `;
        foundWithRulesTableBody.appendChild(row);
    });
    
    // Display missing links with rules
    missingWithRulesTableBody.innerHTML = '';
    missingLinksWithRules.forEach((link, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><a href="${link.linkFaltante}" target="_blank">${link.linkFaltante}</a></td>
            <td>${link.rowIndex}</td>
        `;
        missingWithRulesTableBody.appendChild(row);
    });
    
    resultsWithRulesSection.style.display = 'block';
}

// Apply rule button event
applyRuleBtn.addEventListener('click', () => {
    const rule = matchingRuleInput.value.trim();
    if (!rule) {
        alert('Por favor, ingresa una regla de matcheo');
        return;
    }
    processDataWithRule(rule);
});

// Allow Enter key to apply rule
matchingRuleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        applyRuleBtn.click();
    }
});

// Download functions
downloadFoundBtn.addEventListener('click', () => {
    downloadCSV(foundMatches, 'disponibles_en_toma.csv', true);
});

downloadMissingBtn.addEventListener('click', () => {
    downloadCSV(missingLinks, 'no_disponibles.csv', false);
});

downloadFoundWithRulesBtn.addEventListener('click', () => {
    downloadCSVWithRules(foundMatchesWithRules, 'disponibles_en_toma_con_regla.csv', true);
});

downloadMissingWithRulesBtn.addEventListener('click', () => {
    downloadCSVWithRules(missingLinksWithRules, 'no_disponibles_con_regla.csv', false);
});

function downloadCSV(data, filename, includeMatch) {
    if (data.length === 0) {
        alert('No hay datos para descargar');
        return;
    }
    
    // Get headers from Faltantes sheet
    const faltantesHeaders = faltantesData[0] || [];
    
    // Create CSV content
    let csvContent = '';
    
    // Add headers
    const headers = [...faltantesHeaders];
    if (includeMatch) {
        headers.push('LINK_DE_CONSULTA_MATCH');
    }
    csvContent += headers.map(h => escapeCSV(String(h || ''))).join(',') + '\n';
    
    // Add data rows
    data.forEach(item => {
        const row = [...item.fullRow];
        if (includeMatch && item.matchedLink) {
            row.push(item.matchedLink);
        } else if (includeMatch) {
            row.push('');
        }
        csvContent += row.map(cell => escapeCSV(String(cell || ''))).join(',') + '\n';
    });
    
    // Create download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function escapeCSV(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

function downloadCSVWithRules(data, filename, includeMatch) {
    if (data.length === 0) {
        alert('No hay datos para descargar');
        return;
    }
    
    // Get headers from Faltantes sheet
    const faltantesHeaders = faltantesData[0] || [];
    
    // Create CSV content
    let csvContent = '';
    
    // Add headers
    const headers = [...faltantesHeaders];
    if (includeMatch) {
        headers.push('LINK_DE_CONSULTA_MATCH');
        headers.push('PATRON_MATCHEADO');
    }
    csvContent += headers.map(h => escapeCSV(String(h || ''))).join(',') + '\n';
    
    // Add data rows
    data.forEach(item => {
        const row = [...item.fullRow];
        if (includeMatch) {
            row.push(item.matchedLink || '');
            row.push(item.matchedPattern || '');
        }
        csvContent += row.map(cell => escapeCSV(String(cell || ''))).join(',') + '\n';
    });
    
    // Create download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
