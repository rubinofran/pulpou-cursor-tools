// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controlsSection = document.getElementById('controlsSection');
const resultsSection = document.getElementById('resultsSection');
const linksContainer = document.getElementById('linksContainer');
const totalLinksSpan = document.getElementById('totalLinks');
const errorMessage = document.getElementById('errorMessage');
const toggleConfigBtn = document.getElementById('toggleConfigBtn');
const sqlConfigForm = document.getElementById('sqlConfigForm');
const generateQueriesBtn = document.getElementById('generateQueriesBtn');
const copyQueriesBtn = document.getElementById('copyQueriesBtn');
const downloadQueriesBtn = document.getElementById('downloadQueriesBtn');
const queriesSection = document.getElementById('queriesSection');
const queriesContainer = document.getElementById('queriesContainer');
const queriesCount = document.getElementById('queriesCount');
const csvPreview = document.getElementById('csvPreview');

let csvData = [];
let headers = [];
let selectedColumn = null;
let links = [];
let generatedQueries = [];
let generatedQueriesFormatted = '';
let tableConfig = null;
let tagsConfig = null;

// Load table configuration
async function loadTableConfig() {
    try {
        const response = await fetch('config.json');
        tableConfig = await response.json();
        
        // Load tags configuration
        try {
            const tagsResponse = await fetch('tags-config.json');
            tagsConfig = await tagsResponse.json();
        } catch (error) {
            console.warn('tags-config.json not found, tags feature will be disabled');
            tagsConfig = { columnMappings: [] };
        }
        
        initializeForms();
    } catch (error) {
        console.error('Error loading config.json:', error);
        showError('Error al cargar la configuración. Por favor, asegúrate de que config.json existe.');
    }
}

// Initialize forms based on config
function initializeForms() {
    if (!tableConfig) return;
    
    // Generate global form
    generateGlobalForm();
}

// Generate global form dynamically
function generateGlobalForm() {
    const formGrid = document.getElementById('globalFormGrid');
    if (!formGrid || !tableConfig) return;
    
    formGrid.innerHTML = '';
    
    // First, add the options checkbox at the beginning
    const optionsField = tableConfig.fields.find(f => f.name === 'options');
    if (optionsField && optionsField.editable && !optionsField.fromCSV) {
        // Create checkbox for "con etiquetas" at the start
        const checkboxGroup = document.createElement('div');
        checkboxGroup.className = 'form-group options-checkbox-group';
        
        const checkboxLabel = document.createElement('label');
        checkboxLabel.className = 'checkbox-label';
        checkboxLabel.setAttribute('for', `sqlOptionsWithTags`);
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `sqlOptionsWithTags`;
        checkbox.className = 'options-checkbox';
        checkbox.checked = false; // Default: sin etiquetas
        
        checkboxLabel.appendChild(checkbox);
        const checkboxText = document.createTextNode(' Campo options con etiquetas');
        checkboxLabel.appendChild(checkboxText);
        
        checkboxGroup.appendChild(checkboxLabel);
        formGrid.appendChild(checkboxGroup);
        
        // Add checkbox for "Campo options completo"
        const fullOptionsCheckboxGroup = document.createElement('div');
        fullOptionsCheckboxGroup.className = 'form-group options-checkbox-group';
        
        const fullOptionsCheckboxLabel = document.createElement('label');
        fullOptionsCheckboxLabel.className = 'checkbox-label';
        fullOptionsCheckboxLabel.setAttribute('for', 'sqlOptionsFull');
        
        const fullOptionsCheckbox = document.createElement('input');
        fullOptionsCheckbox.type = 'checkbox';
        fullOptionsCheckbox.id = 'sqlOptionsFull';
        fullOptionsCheckbox.className = 'options-checkbox';
        fullOptionsCheckbox.checked = false; // Default: desactivado
        
        fullOptionsCheckboxLabel.appendChild(fullOptionsCheckbox);
        const fullOptionsCheckboxText = document.createTextNode(' Campo options completo');
        fullOptionsCheckboxLabel.appendChild(fullOptionsCheckboxText);
        
        fullOptionsCheckboxGroup.appendChild(fullOptionsCheckboxLabel);
        formGrid.appendChild(fullOptionsCheckboxGroup);
    }
    
    tableConfig.fields.forEach(field => {
        // Skip fields that are not editable or come from CSV
        if (!field.editable || field.fromCSV) return;
        
        // Special handling for options field: input as normal field
        if (field.name === 'options') {
            // Create input field for JSON adicionales as a normal field
            const inputGroup = document.createElement('div');
            inputGroup.className = 'form-group';
            
            const inputLabel = document.createElement('label');
            inputLabel.setAttribute('for', 'sqlOptionsExtra');
            inputLabel.textContent = 'options:';
            
            const extraInput = document.createElement('input');
            extraInput.type = 'text';
            extraInput.id = 'sqlOptionsExtra';
            extraInput.className = 'global-field';
            extraInput.placeholder = 'Ej: "codigoPostal":"02006"';
            extraInput.title = 'Ingresa campos JSON adicionales separados por comas. Ejemplo: "codigoPostal":"02006", "otroCampo":"valor"';
            
            inputGroup.appendChild(inputLabel);
            inputGroup.appendChild(extraInput);
            formGrid.appendChild(inputGroup);
            
            return; // Skip normal processing for options
        }
        
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        const fieldId = `sql${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`;
        label.setAttribute('for', fieldId);
        label.textContent = `${field.label}:`;
        
        let input;
        
        if (field.type === 'select') {
            input = document.createElement('select');
            input.id = fieldId;
            input.className = 'global-field';
            
            if (field.options) {
                field.options.forEach(option => {
                    const opt = document.createElement('option');
                    opt.value = option.value;
                    opt.textContent = option.label;
                    if (option.value === field.default) {
                        opt.selected = true;
                    }
                    input.appendChild(opt);
                });
            }
        } else {
            input = document.createElement('input');
            input.type = field.type || 'text';
            input.id = fieldId;
            input.className = 'global-field';
            if (field.placeholder) {
                input.placeholder = field.placeholder;
            }
            if (field.default !== undefined && field.default !== '') {
                input.value = field.default;
            }
        }
        
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        formGrid.appendChild(formGroup);
    });
}

// Event Listeners
if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => {
        if (fileInput) {
            fileInput.click();
        }
    });
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    fileInput.addEventListener('change', handleFileSelect);
}

if (toggleConfigBtn) {
    toggleConfigBtn.addEventListener('click', toggleConfigForm);
}
if (generateQueriesBtn) {
    generateQueriesBtn.addEventListener('click', generateSQLQueries);
}
if (copyQueriesBtn) {
    copyQueriesBtn.addEventListener('click', copyAllQueries);
}
if (downloadQueriesBtn) {
    downloadQueriesBtn.addEventListener('click', downloadQueriesAsTxt);
}

// Drag and Drop handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            processFile(file);
        } else {
            showError('Por favor, selecciona un archivo CSV o XLSX válido');
        }
    }
}

// File selection handler
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

// Process file (CSV or XLSX)
function processFile(file) {
    hideError();
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Process XLSX file
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                
                if (jsonData.length === 0) {
                    showError('El archivo Excel está vacío');
                    return;
                }
                
                // Parse as CSV-like structure
                parseExcelData(jsonData);
            } catch (error) {
                showError('Error al leer el archivo Excel: ' + error.message);
            }
        };
        
        reader.onerror = function() {
            showError('Error al leer el archivo Excel');
        };
        
        reader.readAsArrayBuffer(file);
    } else {
        // Process CSV file
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                parseCSV(text);
            } catch (error) {
                showError('Error al leer el archivo: ' + error.message);
            }
        };
        
        reader.onerror = function() {
            showError('Error al leer el archivo');
        };
        
        reader.readAsText(file);
    }
}

// Parse Excel data (similar to CSV parsing)
function parseExcelData(jsonData) {
    if (jsonData.length === 0) {
        showError('El archivo está vacío');
        return;
    }
    
    // First row is headers
    headers = jsonData[0].map(h => String(h || '').trim());
    
    // Rest are data rows
    csvData = [];
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i].map(cell => String(cell || '').trim());
        if (row.some(cell => cell !== '')) {
            // Pad with empty strings if row has fewer columns than headers
            while (row.length < headers.length) {
                row.push('');
            }
            csvData.push(row);
        }
    }
    
    // Find and validate "url" column
    const urlColumnIndex = findUrlColumn();
    if (urlColumnIndex === -1) {
        showError('El archivo Excel debe contener una columna llamada "url"');
        return;
    }
    
    selectedColumn = urlColumnIndex;
    
    // Show CSV preview
    displayCSVPreview();
    
    // Extract and display links
    extractLinks();
    displayLinks();
    
    controlsSection.style.display = 'block';
    resultsSection.style.display = 'block';
}

// Parse CSV text
function parseCSV(text) {
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
        showError('El archivo CSV está vacío');
        return;
    }
    
    // Detect delimiter (comma or semicolon)
    // Count occurrences in first line, ignoring those inside quotes
    const firstLine = lines[0];
    let commaCount = 0;
    let semicolonCount = 0;
    let inQuotes = false;
    
    for (let i = 0; i < firstLine.length; i++) {
        if (firstLine[i] === '"') {
            // Check for escaped quote
            if (inQuotes && i + 1 < firstLine.length && firstLine[i + 1] === '"') {
                i++; // Skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (!inQuotes) {
            // Only count delimiters outside quotes
            if (firstLine[i] === ',') commaCount++;
            if (firstLine[i] === ';') semicolonCount++;
        }
    }
    
    const delimiter = semicolonCount > commaCount ? ';' : ',';
    
    // Parse headers
    headers = parseCSVLine(lines[0], delimiter);
    
    // Validate headers
    if (headers.length === 0) {
        showError('No se pudieron leer los encabezados del CSV');
        return;
    }
    
    // Parse data rows
    csvData = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i], delimiter);
        // Only add rows that have at least some data
        if (values.length > 0 && values.some(v => v.trim() !== '')) {
            // Pad with empty strings if row has fewer columns than headers
            while (values.length < headers.length) {
                values.push('');
            }
            csvData.push(values);
        }
    }
    
    // Find and validate "url" column
    const urlColumnIndex = findUrlColumn();
    if (urlColumnIndex === -1) {
        showError('El archivo CSV debe contener una columna llamada "url"');
        return;
    }
    
    selectedColumn = urlColumnIndex;
    
    // Show CSV preview
    displayCSVPreview();
    
    // Extract and display links
    extractLinks();
    displayLinks();
    
    controlsSection.style.display = 'block';
    resultsSection.style.display = 'block';
}

// Find URL column index
function findUrlColumn() {
    for (let i = 0; i < headers.length; i++) {
        if (headers[i].toLowerCase().trim() === 'url') {
            return i;
        }
    }
    return -1;
}

// Find cantEspeculada column index (case-insensitive, handles camelCase, snake_case, etc.)
function findCantEspeculadaColumn() {
    for (let i = 0; i < headers.length; i++) {
        const normalizedHeader = headers[i].toLowerCase().trim().replace(/[_-]/g, '');
        if (normalizedHeader === 'cantespeculada' || normalizedHeader === 'cant especulada') {
            return i;
        }
    }
    return -1;
}

// Parse a single CSV line (handles quoted values with commas inside)
function parseCSVLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    // Trim only leading/trailing whitespace from the entire line
    line = line.trim();
    
    while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes) {
                // Check if this is an escaped quote (double quote)
                if (i + 1 < line.length && line[i + 1] === '"') {
                    // Escaped quote inside quoted field
                    current += '"';
                    i += 2;
                    continue;
                } else if (i + 1 < line.length && line[i + 1] === delimiter) {
                    // End of quoted field, followed by delimiter
                    inQuotes = false;
                    i += 2;
                    result.push(current);
                    current = '';
                    continue;
                } else if (i + 1 >= line.length || line[i + 1] === '\n' || line[i + 1] === '\r') {
                    // End of quoted field at end of line
                    inQuotes = false;
                    i++;
                    break;
                } else {
                    // This might be a malformed CSV, but we'll treat it as end of quotes
                    inQuotes = false;
                }
            } else {
                // Start of quoted field
                inQuotes = true;
            }
            i++;
        } else if (char === delimiter && !inQuotes) {
            // Found delimiter outside quotes - end of field
            result.push(current);
            current = '';
            i++;
        } else {
            // Regular character
            current += char;
            i++;
        }
    }
    
    // Add the last field (if any)
    if (current.length > 0 || !inQuotes) {
        result.push(current);
    } else if (inQuotes) {
        // Field was not properly closed, but add it anyway
        result.push(current);
    }
    
    // Clean up fields: remove surrounding quotes if present, but preserve content
    return result.map(field => {
        // Remove surrounding quotes if the field starts and ends with them
        if (field.length >= 2 && field[0] === '"' && field[field.length - 1] === '"') {
            field = field.slice(1, -1);
        }
        // Replace escaped quotes (double quotes) with single quotes
        field = field.replace(/""/g, '"');
        // Trim whitespace, but preserve internal spaces
        return field.trim();
    });
}

// Display CSV preview
// Check if a column name is configured as a tag in tags-config.json
function isTagColumn(columnName) {
    if (!tagsConfig || !tagsConfig.columnMappings) return false;
    
    const normalizedColumn = columnName.toLowerCase().trim();
    return tagsConfig.columnMappings.some(mapping => 
        mapping.csvColumn.toLowerCase().trim() === normalizedColumn
    );
}

// Check if a column is cantEspeculada (used for default value)
function isCantEspeculadaColumn(columnName) {
    const normalizedColumn = columnName.toLowerCase().trim().replace(/[_-]/g, '').replace(/\s+/g, '');
    return normalizedColumn === 'cantespeculada';
}

function displayCSVPreview() {
    if (!csvPreview) return;
    
    // Show first 2 rows as preview
    const previewRows = Math.min(2, csvData.length);
    
    let previewHTML = '<table class="preview-table"><thead><tr>';
    
    // Headers
    headers.forEach((header, index) => {
        const headerText = header || `Columna ${index + 1}`;
        const isTag = isTagColumn(header);
        const isCantEspeculada = isCantEspeculadaColumn(header);
        const tagIcon = isTag ? ' <span class="tag-indicator" title="Esta columna se usa para generar etiquetas">🏷️</span>' : '';
        const cantEspeculadaIcon = isCantEspeculada ? ' <span class="tag-indicator" title="Esta columna se usa como valor por defecto para cant_especulada">🔢</span>' : '';
        previewHTML += `<th>${headerText}${tagIcon}${cantEspeculadaIcon}</th>`;
    });
    previewHTML += '</tr></thead><tbody>';
    
    // Data rows
    for (let i = 0; i < previewRows; i++) {
        previewHTML += '<tr>';
        headers.forEach((_, colIndex) => {
            const value = csvData[i] && csvData[i][colIndex] ? csvData[i][colIndex] : '';
            const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
            previewHTML += `<td title="${value}">${displayValue || '-'}</td>`;
        });
        previewHTML += '</tr>';
    }
    
    previewHTML += '</tbody></table>';
    
    if (csvData.length > previewRows) {
        previewHTML += `<p class="preview-note">Mostrando ${previewRows} de ${csvData.length} filas</p>`;
    }
    
    csvPreview.innerHTML = previewHTML;
}

// Validate URL
function isValidURL(str) {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        // Also check for URLs without protocol
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
        return urlPattern.test(str);
    }
}

// Extract links from selected column
function extractLinks() {
    links = [];
    
    // Find cantEspeculada column if it exists
    const cantEspeculadaColumnIndex = findCantEspeculadaColumn();
    
    csvData.forEach((row, rowIndex) => {
        const value = row[selectedColumn];
        if (value && value.trim() !== '') {
            let url = value.trim();
            
            // Only normalize if it looks like a URL (has domain-like structure)
            // Check if it's already a full URL
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                // Check if it looks like a domain (has dots and looks like a URL)
                // Pattern: contains dots, has alphanumeric characters, might have slashes
                const looksLikeDomain = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(url) || 
                                       /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/.test(url);
                
                if (looksLikeDomain) {
                    url = 'https://' + url;
                }
                // If it doesn't look like a domain, keep it as is (could be a number, text, etc.)
            }
            
            const linkData = {
                url: url,
                original: value.trim(),
                rowIndex: rowIndex + 2, // +2 because of header and 0-index (for display)
                csvRowIndex: rowIndex // Actual index in csvData array
            };
            
            // Add cantEspeculada value if column exists
            if (cantEspeculadaColumnIndex !== -1 && row[cantEspeculadaColumnIndex] && row[cantEspeculadaColumnIndex].trim() !== '') {
                linkData.cantEspeculada = row[cantEspeculadaColumnIndex].trim();
            }
            
            links.push(linkData);
        }
    });
    
    // No remove duplicates - each CSV row should generate a separate SQL record
    // even if URLs are the same, as they may have different values in other columns
    
    totalLinksSpan.textContent = `${links.length} link${links.length !== 1 ? 's' : ''} encontrado${links.length !== 1 ? 's' : ''}`;
}

// Display links in the container
function displayLinks() {
    linksContainer.innerHTML = '';
    
    if (links.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 3;
        cell.textContent = 'No se encontraron links en la columna seleccionada';
        cell.className = 'no-links';
        row.appendChild(cell);
        linksContainer.appendChild(row);
        resultsSection.style.display = 'none';
        return;
    }
    
    resultsSection.style.display = 'block';
    
    links.forEach((link, index) => {
        const linkFragment = createLinkElement(link, index);
        // Append all nodes from fragment
        while (linkFragment.firstChild) {
            linksContainer.appendChild(linkFragment.firstChild);
        }
    });
}

// Create a link element
function createLinkElement(link, index) {
    const row = document.createElement('tr');
    row.className = 'link-row';
    row.id = `link-${index}`;
    
    // Fila column
    const filaCell = document.createElement('td');
    filaCell.className = 'fila-cell';
    filaCell.textContent = link.rowIndex;
    
    // Links column
    const linkCell = document.createElement('td');
    linkCell.className = 'link-cell';
    
    // Check if it's a valid URL to create a link, otherwise just show text
    const isURL = isValidURL(link.url) || link.url.startsWith('http://') || link.url.startsWith('https://');
    
    if (isURL) {
        const linkAnchor = document.createElement('a');
        linkAnchor.href = link.url;
        linkAnchor.target = '_blank';
        linkAnchor.rel = 'noopener noreferrer';
        linkAnchor.textContent = link.url;
        linkAnchor.className = 'link-url';
        linkAnchor.title = link.url; // Tooltip con URL completa
        linkCell.appendChild(linkAnchor);
    } else {
        // Just show as plain text
        const textSpan = document.createElement('span');
        textSpan.textContent = link.original || link.url;
        textSpan.className = 'link-text';
        linkCell.appendChild(textSpan);
    }
    
    // Acción column
    const actionCell = document.createElement('td');
    actionCell.className = 'action-cell';
    
    const configBtn = document.createElement('button');
    configBtn.className = 'btn-config-link';
    configBtn.textContent = '⚙️ Configurar';
    configBtn.title = 'Configurar valores individuales';
    configBtn.onclick = () => toggleLinkConfig(index);
    
    actionCell.appendChild(configBtn);
    
    row.appendChild(filaCell);
    row.appendChild(linkCell);
    row.appendChild(actionCell);
    
    // Individual config form row (hidden by default)
    const configFormRow = document.createElement('tr');
    configFormRow.className = 'link-config-row';
    configFormRow.id = `link-config-${index}`;
    configFormRow.style.display = 'none';
    
    const configFormCell = document.createElement('td');
    configFormCell.colSpan = 3;
    configFormCell.className = 'link-config-cell';
    
    const configForm = document.createElement('div');
    configForm.className = 'link-config-form';
    
    const formGrid = document.createElement('div');
    formGrid.className = 'form-grid link-form-grid';

    // Generate fields dynamically from config
    if (tableConfig) {
        tableConfig.fields.forEach(field => {
            // Skip fields that are not editable or come from CSV
            if (!field.editable || field.fromCSV) return;
            
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.textContent = `${field.label}:`;
            label.setAttribute('for', `link-${index}-${field.name}`);
            
            let input;
            if (field.type === 'select') {
                // Create select
                input = document.createElement('select');
                input.id = `link-${index}-${field.name}`;
                input.className = 'link-field';
                input.dataset.field = field.name;
                input.dataset.linkIndex = index;
                
                // Add "use global" option
                const optionGlobal = document.createElement('option');
                optionGlobal.value = '';
                optionGlobal.textContent = 'Usar valor global';
                optionGlobal.selected = true;
                input.appendChild(optionGlobal);
                
                // Add field options
                if (field.options) {
                    field.options.forEach(option => {
                        const opt = document.createElement('option');
                        opt.value = option.value;
                        opt.textContent = option.label;
                        input.appendChild(opt);
                    });
                }
            } else {
                // Create regular input
                input = document.createElement('input');
                input.type = field.type || 'text';
                input.id = `link-${index}-${field.name}`;
                input.className = 'link-field';
                input.dataset.field = field.name;
                input.dataset.linkIndex = index;
                input.placeholder = 'Usar valor global';
                
                // Set specific placeholders if defined
                if (field.placeholder) {
                    input.placeholder = `${field.placeholder} o usar valor global`;
                }
            }
            
            formGroup.appendChild(label);
            formGroup.appendChild(input);
            formGrid.appendChild(formGroup);
        });
    }
    
    const hint = document.createElement('p');
    hint.className = 'link-config-hint';
    hint.textContent = 'Deja los campos vacíos para usar los valores globales. Solo completa los campos que quieras personalizar para este link.';
    
    configForm.appendChild(hint);
    configForm.appendChild(formGrid);
    
    configFormCell.appendChild(configForm);
    configFormRow.appendChild(configFormCell);
    
    // Initialize link config object
    if (!link.config) {
        link.config = {};
    }
    
    // Return both rows (main row and config row)
    const fragment = document.createDocumentFragment();
    fragment.appendChild(row);
    fragment.appendChild(configFormRow);
    
    return fragment;
}

// Toggle link individual config
function toggleLinkConfig(index) {
    const configFormRow = document.getElementById(`link-config-${index}`);
    const linkRow = document.getElementById(`link-${index}`);
    const configBtn = linkRow.querySelector('.btn-config-link');
    
    if (configFormRow.style.display === 'none') {
        configFormRow.style.display = 'table-row';
        configBtn.textContent = '⬆️ Ocultar';
    } else {
        configFormRow.style.display = 'none';
        configBtn.textContent = '⚙️ Configurar';
    }
}

// Copy single link to clipboard
function copyLink(url, button) {
    navigator.clipboard.writeText(url).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ Copiado';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        showError('Error al copiar: ' + err.message);
    });
}


// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    setTimeout(() => {
        hideError();
    }, 5000);
}

// Hide error message
function hideError() {
    errorMessage.style.display = 'none';
}

// Toggle SQL config form
function toggleConfigForm() {
    if (sqlConfigForm.style.display === 'none') {
        sqlConfigForm.style.display = 'block';
        toggleConfigBtn.textContent = '⬆️ Ocultar';
    } else {
        sqlConfigForm.style.display = 'none';
        toggleConfigBtn.textContent = '⚙️ Configurar';
    }
}

// Generate SQL queries
function generateSQLQueries() {
    if (links.length === 0) {
        showError('No hay links en la columna seleccionada. Por favor, selecciona una columna que contenga datos.');
        return;
    }

    if (!tableConfig) {
        showError('Error: Configuración de tabla no cargada');
        return;
    }

    // Get global form values dynamically from config
    const globalValues = {};
    tableConfig.fields.forEach(field => {
        if (!field.fromCSV) {
            // Special handling for options field
            if (field.name === 'options') {
                globalValues[field.name] = getOptionsValue();
            } else {
                const fieldId = `sql${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`;
                let value = getGlobalFormValue(fieldId);
                
                // Apply defaults if empty
                if (value === '' && field.default !== undefined && field.default !== '') {
                    value = field.default;
                }
                
                globalValues[field.name] = value;
            }
        }
    });

    // Generate VALUES for each link
    const valuesArray = [];
    links.forEach((link, index) => {
        // Get individual values for this link
        const individualValues = getLinkFormValues(index);
        
        // Merge: individual values override global values
        const mergedValues = { ...globalValues };
        Object.keys(individualValues).forEach(key => {
            if (individualValues[key] !== null && individualValues[key] !== '') {
                mergedValues[key] = individualValues[key];
            }
        });
        
        // Handle options field: combine tags (if applicable) with extra JSON fields
        const optionsField = tableConfig.fields.find(f => f.name === 'options');
        if (optionsField) {
            const extraOptions = getExtraOptionsValue();
            const fullOptionsCheckbox = document.getElementById('sqlOptionsFull');
            const useFullOptions = fullOptionsCheckbox ? fullOptionsCheckbox.checked : false;
            
            let optionsObj = {};
            
            // If "Campo options completo" is checked, add all CSV columns first
            if (useFullOptions) {
                const csvColumns = getAllCSVColumnsForRow(link.csvRowIndex);
                Object.assign(optionsObj, csvColumns);
            }
            
            if (mergedValues.options === '{"tags":[]}') {
                // "Con etiquetas": generate tags from CSV + merge with extra fields
                const tags = generateTagsFromCSV(link.csvRowIndex);
                optionsObj = { ...optionsObj, tags: tags, ...extraOptions };
            } else if (mergedValues.options === '{}') {
                // "Sin etiquetas": merge with extra fields (or keep CSV columns if full options is enabled)
                Object.assign(optionsObj, extraOptions);
            } else {
                // Custom value: try to parse and merge
                try {
                    const parsedOptions = JSON.parse(mergedValues.options);
                    Object.assign(optionsObj, parsedOptions);
                    Object.assign(optionsObj, extraOptions);
                } catch (e) {
                    Object.assign(optionsObj, extraOptions);
                }
            }
            
            mergedValues.options = JSON.stringify(optionsObj);
        }
        
        // Ensure defaults are applied from config
        tableConfig.fields.forEach(field => {
            if (!field.fromCSV && mergedValues[field.name] === '' && field.default !== undefined && field.default !== '') {
                mergedValues[field.name] = field.default;
            }
        });
        
        // Handle URL field (from CSV)
        const urlField = tableConfig.fields.find(f => f.fromCSV && f.isURL);
        if (urlField) {
            mergedValues[urlField.name] = link.url;
        }
        
        // Handle cant_especulada field (from CSV if exists, otherwise use default)
        const cantEspeculadaField = tableConfig.fields.find(f => f.name === 'cant_especulada');
        if (cantEspeculadaField && link.cantEspeculada !== undefined) {
            // Use value from CSV if available
            mergedValues[cantEspeculadaField.name] = link.cantEspeculada;
        }
        
        // Build VALUES string for this link
        const valuesString = buildValuesString(mergedValues);
        valuesArray.push(valuesString);
    });

    // Generate column names dynamically
    const columnNames = tableConfig.fields.map(f => `\`${f.name}\``).join(', ');
    
    // Generate single query with all VALUES
    const allValues = valuesArray.join(',\n    ');
    const query = `INSERT INTO \`${tableConfig.tableName}\`(${columnNames}) VALUES\n    ${allValues};`;
    
    generatedQueries = [query];
    
    // Store formatted query for download (each VALUE on a new line)
    generatedQueriesFormatted = formatQueryForDownload(query, valuesArray);
    
    // Display queries
    displayQueries();
    
    // Show copy and download buttons
    copyQueriesBtn.style.display = 'inline-block';
    if (downloadQueriesBtn) {
        downloadQueriesBtn.style.display = 'inline-block';
    }
    
    // Scroll to queries section
    queriesSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Parse extra JSON fields from input string
function parseExtraOptionsInput(inputText) {
    if (!inputText || inputText.trim() === '') {
        return {};
    }
    
    const trimmed = inputText.trim();
    
    // If it's already a valid JSON object, parse it directly
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
            return JSON.parse(trimmed);
        } catch (e) {
            console.warn('Error parsing JSON object:', e);
            return {};
        }
    }
    
    // Otherwise, wrap it in braces to make it valid JSON
    // User can enter: "codigoPostal":"02006" or codigoPostal:02006
    try {
        const jsonStr = `{${trimmed}}`;
        return JSON.parse(jsonStr);
    } catch (e) {
        // If parsing fails, try to parse key-value pairs manually
        try {
            const result = {};
            // Split by comma, but be careful with commas inside quoted values
            const pairs = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < trimmed.length; i++) {
                const char = trimmed[i];
                if (char === '"' && (i === 0 || trimmed[i-1] !== '\\')) {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    pairs.push(current.trim());
                    current = '';
                    continue;
                }
                current += char;
            }
            if (current) pairs.push(current.trim());
            
            pairs.forEach(pair => {
                // Match: "key":"value" or key:"value" or "key":value
                const match = pair.match(/^"?([^"]+)"?\s*:\s*"?([^"]*)"?$/);
                if (match) {
                    const key = match[1].trim().replace(/^"|"$/g, '');
                    const value = match[2].trim().replace(/^"|"$/g, '');
                    result[key] = value;
                }
            });
            
            return result;
        } catch (e2) {
            console.warn('Error parsing extra options:', e2);
            return {};
        }
    }
}

// Get extra options input value
function getExtraOptionsValue() {
    const extraInput = document.getElementById('sqlOptionsExtra');
    if (!extraInput) return {};
    return parseExtraOptionsInput(extraInput.value.trim());
}

// Get options value (combines checkbox and extra input)
function getOptionsValue() {
    const withTagsCheckbox = document.getElementById('sqlOptionsWithTags');
    const extraInput = document.getElementById('sqlOptionsExtra');
    
    const withTags = withTagsCheckbox ? withTagsCheckbox.checked : false;
    const extraOptions = extraInput ? parseExtraOptionsInput(extraInput.value.trim()) : {};
    
    if (withTags) {
        // Will be filled with tags from CSV later
        return '{"tags":[]}';
    } else {
        // Sin etiquetas: only extra fields
        return Object.keys(extraOptions).length > 0 ? JSON.stringify(extraOptions) : '{}';
    }
}

// Generate tags from CSV columns based on tags-config.json
function generateTagsFromCSV(csvRowIndex) {
    if (!tagsConfig || !tagsConfig.columnMappings || tagsConfig.columnMappings.length === 0) {
        return [];
    }
    
    if (csvRowIndex < 0 || csvRowIndex >= csvData.length) {
        return [];
    }
    
    const row = csvData[csvRowIndex];
    const tags = [];
    
    tagsConfig.columnMappings.forEach(mapping => {
        // Find the column index in headers
        const columnIndex = headers.findIndex(h => h.toLowerCase().trim() === mapping.csvColumn.toLowerCase().trim());
        
        if (columnIndex !== -1 && row[columnIndex] && row[columnIndex].trim() !== '') {
            const value = row[columnIndex].trim();
            const tag = `${mapping.tagPrefix}: ${value}`;
            tags.push(tag);
        }
    });
    
    return tags;
}

// Get all CSV columns (except "url", tag columns, and cantEspeculada) for a specific row as an object
function getAllCSVColumnsForRow(csvRowIndex) {
    if (csvRowIndex < 0 || csvRowIndex >= csvData.length) {
        return {};
    }
    
    const row = csvData[csvRowIndex];
    const columnsObj = {};
    
    headers.forEach((header, index) => {
        // Skip "url" column
        if (header.toLowerCase().trim() === 'url') {
            return;
        }
        
        // Skip columns that are configured as tags in tags-config.json
        if (isTagColumn(header)) {
            return;
        }
        
        // Skip cantEspeculada column (it's used for the cant_especulada field, not for options)
        if (isCantEspeculadaColumn(header)) {
            return;
        }
        
        // Add column if it has a value
        if (row[index] && row[index].trim() !== '') {
            columnsObj[header] = row[index].trim();
        }
    });
    
    return columnsObj;
}

// Get global form value (returns empty string if empty, not NULL)
function getGlobalFormValue(id) {
    const input = document.getElementById(id);
    if (!input) return '';
    
    // Handle select elements
    if (input.tagName === 'SELECT') {
        return input.value;
    }
    
    return input.value.trim();
}

// Get individual link form values
function getLinkFormValues(linkIndex) {
    if (!tableConfig) return {};
    
    const values = {};
    tableConfig.fields.forEach(field => {
        // Skip fields that are not editable or come from CSV
        if (!field.editable || field.fromCSV) return;
        
        const input = document.getElementById(`link-${linkIndex}-${field.name}`);
        if (input) {
            // Handle select elements
            if (input.tagName === 'SELECT') {
                const value = input.value;
                // Empty string means "use global value"
                if (value !== '') {
                    values[field.name] = value;
                }
            } else {
                const value = input.value.trim();
                // Empty string means "use global value"
                if (value !== '') {
                    values[field.name] = value;
                }
            }
        }
    });
    
    return values;
}

// Build VALUES string for a single row
function buildValuesString(values) {
    if (!tableConfig) return '';
    
    // Format values for SQL
    const formatValue = (val, field) => {
        // Handle NULL explicitly
        if (val === 'NULL' || val === null) {
            return 'NULL';
        }
        
        // Handle empty string - return NULL (description can be empty string, handled by field config if needed)
        if (val === '') {
            // Check if field allows empty strings (could add allowEmpty property to config if needed)
            if (field.name === 'description') {
                return "''";
            }
            return 'NULL';
        }
        
        // Handle options field (JSON) - escape both single and double quotes
        if (field.name === 'options') {
            // Escape single quotes for SQL (JSON may contain single quotes in strings)
            const escaped = val.replace(/'/g, "''");
            return `'${escaped}'`;
        }
        
        // Handle select fields (like activo)
        if (field.type === 'select') {
            const escaped = val.replace(/'/g, "''");
            return `'${escaped}'`;
        }
        
        // If it's a number, return as is
        if (/^\d+$/.test(val)) {
            return val;
        }
        
        // Escape single quotes for SQL
        const escaped = val.replace(/'/g, "''");
        return `'${escaped}'`;
    };

    // Build values in the order defined in config
    const valueParts = tableConfig.fields.map(field => {
        if (field.name === 'id') {
            return 'NULL';
        }
        const value = values[field.name] || '';
        return formatValue(value, field);
    });

    return `(${valueParts.join(', ')})`;
}

// Display generated queries
function displayQueries() {
    queriesContainer.innerHTML = '';
    queriesCount.textContent = `1 query generada con ${links.length} registro${links.length !== 1 ? 's' : ''}`;

    if (generatedQueries.length === 0) {
        queriesContainer.innerHTML = '<p class="no-links">No hay queries para mostrar</p>';
        queriesSection.style.display = 'none';
        return;
    }

    queriesSection.style.display = 'block';

    // There's only one query now
    const queryElement = createQueryElement(generatedQueries[0], 0);
    queriesContainer.appendChild(queryElement);
}

// Create query element
function createQueryElement(query, index) {
    const div = document.createElement('div');
    div.className = 'query-item';

    const queryText = document.createElement('pre');
    queryText.textContent = query;
    queryText.style.margin = '0';
    queryText.style.whiteSpace = 'pre-wrap';
    queryText.style.wordBreak = 'break-word';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'query-copy-btn';
    copyBtn.textContent = '📋 Copiar';
    copyBtn.title = 'Copiar query';
    copyBtn.onclick = () => copyQuery(query, copyBtn);

    div.appendChild(queryText);
    div.appendChild(copyBtn);

    return div;
}

// Copy single query to clipboard
function copyQuery(query, button) {
    navigator.clipboard.writeText(query).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ Copiado';
        button.classList.add('copied');

        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        showError('Error al copiar: ' + err.message);
    });
}

// Copy all queries to clipboard
function copyAllQueries() {
    // Use the formatted version (same as .txt) for copying
    const queryToCopy = generatedQueriesFormatted || generatedQueries[0] || '';

    navigator.clipboard.writeText(queryToCopy).then(() => {
        const originalText = copyQueriesBtn.textContent;
        copyQueriesBtn.textContent = '✓ Copiado';
        copyQueriesBtn.classList.add('copied');

        setTimeout(() => {
            copyQueriesBtn.textContent = originalText;
            copyQueriesBtn.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        showError('Error al copiar: ' + err.message);
    });
}

// Format query for download with each VALUE on a new line
function formatQueryForDownload(query, valuesArray) {
    const insertPart = query.split('VALUES')[0].trim();
    const formattedValues = valuesArray.map((value, index) => {
        // Each value on its own line with comma (except last one)
        return `${value}${index < valuesArray.length - 1 ? ',' : ''}`;
    }).join('\n');
    
    return `${insertPart}\nVALUES\n${formattedValues};`;
}

// Download queries as .txt file
function downloadQueriesAsTxt() {
    if (!generatedQueriesFormatted) {
        showError('No hay queries para descargar');
        return;
    }
    
    const blob = new Blob([generatedQueriesFormatted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'queries_insert.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Load config on page load
loadTableConfig();
