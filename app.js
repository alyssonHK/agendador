// Estado da aplicação
let currentMonth = new Date();
let currentEditingId = null;
let imageFiles = [];
let existingImages = []; // Imagens já salvas no Firebase

// Elementos do DOM
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const appointmentForm = document.getElementById('appointment-form');
const imageInput = document.getElementById('images');
const imagePreview = document.getElementById('image-preview');
const calendar = document.getElementById('calendar');
const currentMonthEl = document.getElementById('current-month');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const appointmentsList = document.getElementById('appointments-list');
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const dayAppointments = document.getElementById('day-appointments');
const modal = document.getElementById('detail-modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.querySelector('.close');
const cancelBtn = document.getElementById('cancel-btn');
const valueInput = document.getElementById('value');
const statusSelect = document.getElementById('status');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeCalendar();
    loadAppointments();
    setupEventListeners();
});

// Gerenciamento de Tabs
function initializeTabs() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');

            if (targetTab === 'calendario') {
                renderCalendar();
            } else if (targetTab === 'lista') {
                loadAppointmentsList();
            } else if (targetTab === 'dashboard') {
                loadDashboardData();
            }
        });
    });
}

// Event Listeners
function setupEventListeners() {
    appointmentForm.addEventListener('submit', handleFormSubmit);
    imageInput.addEventListener('change', handleImageSelect);
    valueInput.addEventListener('input', formatCurrency);
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    searchInput.addEventListener('input', filterAppointments);
    filterStatus.addEventListener('change', filterAppointments);
    closeModal.addEventListener('click', () => modal.classList.remove('active'));
    cancelBtn.addEventListener('click', resetForm);

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// Formatação de moeda (R$)
function formatCurrency(e) {
    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    value = (value / 100).toFixed(2); // Divide por 100 para ter centavos
    value = value.replace('.', ','); // Troca ponto por vírgula
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); // Adiciona pontos de milhar
    e.target.value = value;
}

// Remover formatação de moeda para salvar
function parseCurrency(value) {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
}

// Manipulação de Imagens
function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    imageFiles = [...imageFiles, ...files];
    renderImagePreview();
}

function renderImagePreview() {
    imagePreview.innerHTML = '';

    // Mostrar imagens existentes (do Firebase)
    existingImages.forEach((url, index) => {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
            <img src="${url}" alt="Imagem existente">
            <button type="button" class="remove-image" onclick="removeExistingImage(${index})" title="Remover imagem">×</button>
            <span class="image-badge">Salva</span>
        `;
        imagePreview.appendChild(div);
    });

    // Mostrar novas imagens (ainda não enviadas)
    imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Nova imagem">
                <button type="button" class="remove-image" onclick="removeNewImage(${index})" title="Remover imagem">×</button>
                <span class="image-badge new">Nova</span>
            `;
            imagePreview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function removeExistingImage(index) {
    if (confirm('Deseja remover esta imagem? Ela será excluída permanentemente ao salvar.')) {
        existingImages.splice(index, 1);
        renderImagePreview();
    }
}

function removeNewImage(index) {
    imageFiles.splice(index, 1);
    renderImagePreview();
}

// Manter compatibilidade com código antigo
function removeImage(index) {
    removeNewImage(index);
}

// Upload de Imagens para Firebase Storage
async function uploadImages(appointmentId) {
    const imageUrls = [];

    for (const file of imageFiles) {
        const filename = `${appointmentId}/${Date.now()}_${file.name}`;
        const storageRef = storage.ref(`appointments/${filename}`);

        try {
            await storageRef.put(file);
            const url = await storageRef.getDownloadURL();
            imageUrls.push(url);
        } catch (error) {
            console.error('Erro ao fazer upload da imagem:', error);
        }
    }

    return imageUrls;
}

// Manipulação do Formulário
async function handleFormSubmit(e) {
    e.preventDefault();

    const newStatus = document.getElementById('status').value;
    const currentUser = getCurrentUser(); // Função do auth.js

    const formData = {
        clientName: document.getElementById('client-name').value || '',
        date: document.getElementById('date').value || '',
        time: document.getElementById('time').value || '',
        description: document.getElementById('description').value || '',
        notes: document.getElementById('notes').value || '',
        phone: document.getElementById('phone').value || '',
        socialMedia: document.getElementById('social-media').value || '',
        value: parseCurrency(document.getElementById('value').value) || 0,
        status: newStatus || 'agendado',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        let docRef;
        let statusHistory = [];

        if (currentEditingId) {
            // Atualizar agendamento existente
            docRef = appointmentsCollection.doc(currentEditingId);

            // Obter dados antigos
            const oldDoc = await docRef.get();
            const oldData = oldDoc.data();
            const oldImages = oldData.images || [];
            const oldStatus = oldData.status || 'agendado';
            statusHistory = oldData.statusHistory || [];

            // Se não há histórico (documento antigo), criar entrada inicial
            if (statusHistory.length === 0) {
                statusHistory.push({
                    from: null,
                    to: oldStatus,
                    changedAt: oldData.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
                    changedBy: oldData.createdBy || 'Sistema'
                });
            }

            // Verificar se o status mudou
            if (oldStatus !== newStatus) {
                // Adicionar ao histórico
                statusHistory.push({
                    from: oldStatus,
                    to: newStatus,
                    changedAt: new Date().toISOString(),
                    changedBy: currentUser?.email || 'Desconhecido'
                });
            }

            // Deletar imagens que foram removidas
            const imagesToDelete = oldImages.filter(url => !existingImages.includes(url));
            for (const imageUrl of imagesToDelete) {
                try {
                    const imageRef = storage.refFromURL(imageUrl);
                    await imageRef.delete();
                    console.log('Imagem deletada:', imageUrl);
                } catch (error) {
                    console.error('Erro ao deletar imagem:', error);
                }
            }

            formData.statusHistory = statusHistory;
            await docRef.update(formData);
        } else {
            // Criar novo agendamento
            formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();

            // Histórico inicial
            formData.statusHistory = [{
                from: null,
                to: newStatus,
                changedAt: new Date().toISOString(),
                changedBy: currentUser?.email || 'Desconhecido'
            }];

            docRef = await appointmentsCollection.add(formData);
        }

        // Upload de novas imagens
        let allImages = [...existingImages]; // Manter imagens existentes
        if (imageFiles.length > 0) {
            const newImageUrls = await uploadImages(docRef.id);
            allImages = [...allImages, ...newImageUrls]; // Adicionar novas
        }

        // Filtrar valores undefined do array de imagens
        allImages = allImages.filter(img => img !== undefined && img !== null && img !== '');

        // Atualizar com todas as imagens (existentes + novas)
        // Só atualizar se houver imagens OU se estiver editando (para manter o array vazio se deletou todas)
        if (allImages.length > 0 || (currentEditingId && existingImages.length === 0)) {
            await docRef.update({ images: allImages });
        }

        alert(currentEditingId ? 'Agendamento atualizado com sucesso!' : 'Agendamento criado com sucesso!');
        resetForm();

        // Voltar para o calendário
        document.querySelector('[data-tab="calendario"]').click();

    } catch (error) {
        console.error('Erro ao salvar agendamento:', error);
        alert('Erro ao salvar agendamento. Verifique o console para mais detalhes.');
    }
}

function resetForm() {
    appointmentForm.reset();
    imageFiles = [];
    existingImages = [];
    imagePreview.innerHTML = '';
    currentEditingId = null;
    imageInput.value = ''; // Limpar input de arquivo
    valueInput.value = '0,00'; // Resetar valor
    statusSelect.value = 'agendado'; // Status padrão
}

// Calendário
function initializeCalendar() {
    renderCalendar();
}

function changeMonth(direction) {
    currentMonth.setMonth(currentMonth.getMonth() + direction);
    renderCalendar();
}

function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Atualizar título do mês
    currentMonthEl.textContent = currentMonth.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
    });

    // Limpar calendário
    calendar.innerHTML = '';

    // Cabeçalhos dos dias da semana
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    weekdays.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendar.appendChild(header);
    });

    // Primeiro dia do mês
    const firstDay = new Date(year, month, 1).getDay();

    // Último dia do mês
    const lastDay = new Date(year, month + 1, 0).getDate();

    // Dias do mês anterior
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.innerHTML = `<div class="day-number">${prevLastDay - i}</div>`;
        calendar.appendChild(day);
    }

    // Dias do mês atual
    const today = new Date();
    for (let i = 1; i <= lastDay; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';

        const currentDate = new Date(year, month, i);
        const dateString = currentDate.toISOString().split('T')[0];

        if (currentDate.toDateString() === today.toDateString()) {
            day.classList.add('today');
        }

        day.innerHTML = `<div class="day-number">${i}</div>`;
        day.dataset.date = dateString;

        day.addEventListener('click', () => showDayAppointments(dateString));

        calendar.appendChild(day);
    }

    // Carregar contagem de agendamentos
    loadAppointmentCounts();
}

async function loadAppointmentCounts() {
    try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const startDate = new Date(year, month, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

        const snapshot = await appointmentsCollection
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get();

        const counts = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            counts[data.date] = (counts[data.date] || 0) + 1;
        });

        // Atualizar calendário com contagens
        document.querySelectorAll('.calendar-day').forEach(day => {
            const date = day.dataset.date;
            if (date && counts[date]) {
                day.classList.add('has-appointments');
                const countEl = document.createElement('div');
                countEl.className = 'appointment-count';
                countEl.textContent = `${counts[date]} agendamento${counts[date] > 1 ? 's' : ''}`;
                day.appendChild(countEl);
            }
        });

    } catch (error) {
        console.error('Erro ao carregar contagens:', error);
    }
}

async function showDayAppointments(date) {
    try {
        const snapshot = await appointmentsCollection
            .where('date', '==', date)
            .get();

        if (snapshot.empty) {
            dayAppointments.innerHTML = `
                <h3>Agendamentos para ${new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}</h3>
                <div class="empty-state">
                    <p>Nenhum agendamento para este dia.</p>
                </div>
            `;
            return;
        }

        // Ordenar por horário no JavaScript
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, data: doc.data() });
        });

        appointments.sort((a, b) => {
            return a.data.time.localeCompare(b.data.time);
        });

        let html = `<h3>Agendamentos para ${new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}</h3>`;

        appointments.forEach(appointment => {
            html += renderAppointmentCard(appointment.id, appointment.data, true);
        });

        dayAppointments.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar agendamentos do dia:', error);
        dayAppointments.innerHTML = '<p class="error">Erro ao carregar agendamentos.</p>';
    }
}

// Lista de Agendamentos
async function loadAppointments() {
    loadAppointmentsList();
}

async function loadAppointmentsList() {
    try {
        appointmentsList.innerHTML = '<div class="loading">Carregando agendamentos...</div>';

        const snapshot = await appointmentsCollection
            .orderBy('date', 'desc')
            .get();

        if (snapshot.empty) {
            appointmentsList.innerHTML = `
                <div class="empty-state">
                    <h3>Nenhum agendamento ainda</h3>
                    <p>Crie seu primeiro agendamento clicando em "Novo Agendamento"</p>
                </div>
            `;
            return;
        }

        // Ordenar por data e horário no JavaScript
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, data: doc.data() });
        });

        appointments.sort((a, b) => {
            // Ordenar por data (decrescente) e depois por horário (decrescente)
            const dateCompare = b.data.date.localeCompare(a.data.date);
            if (dateCompare !== 0) return dateCompare;
            return b.data.time.localeCompare(a.data.time);
        });

        let html = '';
        appointments.forEach(appointment => {
            html += renderAppointmentCard(appointment.id, appointment.data);
        });

        appointmentsList.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar lista de agendamentos:', error);
        appointmentsList.innerHTML = '<p class="error">Erro ao carregar agendamentos.</p>';
    }
}

function renderAppointmentCard(id, data, compact = false) {
    const date = new Date(data.date + 'T' + data.time);
    const now = new Date();
    const isPast = date < now;
    const isToday = data.date === now.toISOString().split('T')[0];

    let cardClass = 'appointment-card';
    if (isPast && !isToday) cardClass += ' past';
    if (isToday) cardClass += ' today';

    // Formatar valor em moeda
    const formattedValue = data.value ? `R$ ${data.value.toFixed(2).replace('.', ',')}` : '';

    // Status emoji
    const statusEmoji = {
        'agendado': '📅',
        'cancelado': '❌',
        'feito': '✅',
        'reagendado': '🔄'
    };

    return `
        <div class="${cardClass}" onclick="showAppointmentDetail('${id}')">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <h3>👤 ${data.clientName}</h3>
                ${data.status ? `<span class="status-badge ${data.status}">${statusEmoji[data.status] || ''} ${data.status}</span>` : ''}
            </div>
            <div class="appointment-info">
                <div class="info-item">
                    <strong>📅 Data:</strong> ${new Date(data.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
                <div class="info-item">
                    <strong>🕐 Horário:</strong> ${data.time}
                </div>
                ${data.phone ? `<div class="info-item"><strong>📱 Telefone:</strong> ${data.phone}</div>` : ''}
                ${data.socialMedia ? `<div class="info-item"><strong>📱 Social:</strong> ${data.socialMedia}</div>` : ''}
                ${formattedValue ? `<div class="info-item"><strong class="value-display">💰 ${formattedValue}</strong></div>` : ''}
            </div>
            ${!compact ? `<div class="description"><strong>Descrição:</strong> ${data.description}</div>` : ''}
            ${data.images && data.images.length > 0 ? `<div class="info-item">📷 ${data.images.length} imagem(ns)</div>` : ''}
            <div class="actions">
                <button class="btn-edit" onclick="event.stopPropagation(); editAppointment('${id}')">Editar</button>
                <button class="btn-danger" onclick="event.stopPropagation(); deleteAppointment('${id}', '${data.clientName}')">Excluir</button>
            </div>
        </div>
    `;
}

// Filtrar Agendamentos
function filterAppointments() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;

    const cards = appointmentsList.querySelectorAll('.appointment-card');
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const matchesSearch = text.includes(searchTerm);

        let matchesStatus = true;
        if (statusFilter === 'upcoming') {
            matchesStatus = !card.classList.contains('past');
        } else if (statusFilter === 'past') {
            matchesStatus = card.classList.contains('past');
        }

        card.style.display = matchesSearch && matchesStatus ? 'block' : 'none';
    });
}

// Detalhes do Agendamento
async function showAppointmentDetail(id) {
    try {
        const doc = await appointmentsCollection.doc(id).get();

        if (!doc.exists) {
            alert('Agendamento não encontrado.');
            return;
        }

        const data = doc.data();

        // Formatar valor
        const formattedValue = data.value ? `R$ ${data.value.toFixed(2).replace('.', ',')}` : 'Não informado';

        // Status emoji
        const statusEmoji = {
            'agendado': '📅',
            'cancelado': '❌',
            'feito': '✅',
            'reagendado': '🔄'
        };

        // Layout com grid: informações à esquerda, imagens à direita
        let html = `
            <h2>📋 Detalhes do Agendamento</h2>
            <div class="modal-detail-container">
                <div class="modal-info">
                    <p><strong>Cliente:</strong> ${data.clientName}</p>
                    <p><strong>Data:</strong> ${new Date(data.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    <p><strong>Horário:</strong> ${data.time}</p>
                    ${data.phone ? `<p><strong>Telefone:</strong> ${data.phone}</p>` : ''}
                    ${data.socialMedia ? `<p><strong>Rede Social:</strong> ${data.socialMedia}</p>` : ''}
                    <p><strong>Valor:</strong> <span class="value-display">${formattedValue}</span></p>
                    <p><strong>Status:</strong> <span class="status-badge ${data.status}">${statusEmoji[data.status] || ''} ${data.status}</span></p>
                    <p><strong>Descrição:</strong></p>
                    <p style="margin-left: 20px; white-space: pre-wrap;">${data.description}</p>
                    ${data.notes ? `<p><strong>Observações:</strong></p><p style="margin-left: 20px; white-space: pre-wrap;">${data.notes}</p>` : ''}
                    
                    ${data.statusHistory && data.statusHistory.length > 0 ? `
                    <div class="status-history">
                        <h4>📜 Histórico de Status</h4>
                        ${data.statusHistory.map(history => {
            const changeDate = new Date(history.changedAt);
            return `
                                <div class="status-history-item">
                                    <div>
                                        ${history.from ? `<span class="status-badge ${history.from}">${statusEmoji[history.from] || ''} ${history.from}</span>` : '<span>Novo</span>'}
                                        →
                                        <span class="status-badge ${history.to}">${statusEmoji[history.to] || ''} ${history.to}</span>
                                    </div>
                                    <div class="timestamp">${changeDate.toLocaleString('pt-BR')}</div>
                                    <div class="user-info">Por: ${history.changedBy}</div>
                                </div>
                            `;
        }).join('')}
                    </div>
                    ` : ''}
                </div>
        `;

        if (data.images && data.images.length > 0) {
            html += `
                <div class="modal-gallery">
                    <h3>Imagens de Referência</h3>
                    <div class="gallery-main">
                        <img id="main-image" src="${data.images[0]}" alt="Imagem principal">
                    </div>
                    <div class="gallery-thumbnails">
            `;
            data.images.forEach((url, index) => {
                html += `
                    <img src="${url}" 
                         alt="Thumbnail ${index + 1}" 
                         class="thumbnail ${index === 0 ? 'active' : ''}"
                         onclick="changeMainImage('${url}', this)">
                `;
            });
            html += `
                    </div>
                </div>
            `;
        }

        html += `
            </div>
            <div class="form-actions" style="margin-top: 30px;">
                <button class="btn-edit" onclick="editAppointment('${id}'); modal.classList.remove('active');">Editar</button>
                <button class="btn-danger" onclick="deleteAppointment('${id}', '${data.clientName}'); modal.classList.remove('active');">Excluir</button>
            </div>
        `;

        modalBody.innerHTML = html;
        modal.classList.add('active');

    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        alert('Erro ao carregar detalhes do agendamento.');
    }
}

// Editar Agendamento
async function editAppointment(id) {
    try {
        const doc = await appointmentsCollection.doc(id).get();

        if (!doc.exists) {
            alert('Agendamento não encontrado.');
            return;
        }

        const data = doc.data();

        document.getElementById('client-name').value = data.clientName;
        document.getElementById('date').value = data.date;
        document.getElementById('time').value = data.time;
        document.getElementById('description').value = data.description;
        document.getElementById('notes').value = data.notes || '';
        document.getElementById('phone').value = data.phone || '';
        document.getElementById('social-media').value = data.socialMedia || '';
        document.getElementById('status').value = data.status || 'agendado';

        // Formatar e exibir valor
        if (data.value) {
            const formattedValue = data.value.toFixed(2).replace('.', ',');
            document.getElementById('value').value = formattedValue;
        } else {
            document.getElementById('value').value = '0,00';
        }

        // Carregar imagens existentes
        existingImages = data.images || [];
        imageFiles = []; // Limpar novas imagens
        renderImagePreview(); // Mostrar imagens existentes

        currentEditingId = id;

        // Mudar para tab de novo agendamento
        document.querySelector('[data-tab="novo"]').click();

    } catch (error) {
        console.error('Erro ao carregar agendamento para edição:', error);
        alert('Erro ao carregar agendamento.');
    }
}

// Trocar imagem principal na galeria
function changeMainImage(url, thumbnailElement) {
    const mainImage = document.getElementById('main-image');
    if (mainImage) {
        mainImage.src = url;

        // Remover classe active de todos os thumbnails
        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.classList.remove('active');
        });

        // Adicionar classe active ao thumbnail clicado
        thumbnailElement.classList.add('active');
    }
}

// Excluir Agendamento
async function deleteAppointment(id, clientName) {
    if (!confirm(`Tem certeza que deseja excluir o agendamento de ${clientName}?`)) {
        return;
    }

    try {
        // Deletar imagens do Storage
        const doc = await appointmentsCollection.doc(id).get();
        const data = doc.data();

        if (data.images && data.images.length > 0) {
            for (const imageUrl of data.images) {
                try {
                    const imageRef = storage.refFromURL(imageUrl);
                    await imageRef.delete();
                } catch (error) {
                    console.error('Erro ao deletar imagem:', error);
                }
            }
        }

        // Deletar documento
        await appointmentsCollection.doc(id).delete();

        alert('Agendamento excluído com sucesso!');

        // Recarregar listas
        loadAppointmentsList();
        renderCalendar();

    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        alert('Erro ao excluir agendamento.');
    }
}

// ==================== DASHBOARD ====================

let allAppointmentsData = []; // Cache de dados

// Carregar dados do dashboard
async function loadDashboardData() {
    try {
        const snapshot = await appointmentsCollection.get();
        allAppointmentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        updateDashboardMetrics();
        updateStatusChart();
        updateRevenueChart();
        updateMonthlySummary();
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
    }
}

// Atualizar métricas principais
function updateDashboardMetrics() {
    const totalRevenue = allAppointmentsData.reduce((sum, apt) => sum + (apt.value || 0), 0);
    const totalAppointments = allAppointmentsData.length;
    const completedCount = allAppointmentsData.filter(apt => apt.status === 'feito').length;
    const pendingCount = allAppointmentsData.filter(apt =>
        apt.status === 'agendado' || apt.status === 'reagendado'
    ).length;

    document.getElementById('total-revenue').textContent = formatCurrencyValue(totalRevenue);
    document.getElementById('total-appointments').textContent = totalAppointments;
    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('pending-count').textContent = pendingCount;
}

// Formatar valor para exibição
function formatCurrencyValue(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Gráfico de Status
function updateStatusChart() {
    const statusCounts = {
        agendado: 0,
        cancelado: 0,
        feito: 0,
        reagendado: 0
    };

    allAppointmentsData.forEach(apt => {
        if (statusCounts.hasOwnProperty(apt.status)) {
            statusCounts[apt.status]++;
        }
    });

    const maxCount = Math.max(...Object.values(statusCounts), 1);
    const chartContainer = document.getElementById('status-chart');

    const statusLabels = {
        agendado: '📅 Agendado',
        cancelado: '❌ Cancelado',
        feito: '✅ Feito',
        reagendado: '🔄 Reagendado'
    };

    const statusColors = {
        agendado: 'linear-gradient(to top, #3498db, #2980b9)',
        cancelado: 'linear-gradient(to top, #e74c3c, #c0392b)',
        feito: 'linear-gradient(to top, #27ae60, #229954)',
        reagendado: 'linear-gradient(to top, #f39c12, #e67e22)'
    };

    chartContainer.innerHTML = '';

    Object.keys(statusCounts).forEach(status => {
        const count = statusCounts[status];
        const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

        const barItem = document.createElement('div');
        barItem.className = 'bar-item';
        barItem.innerHTML = `
            <div class="bar" style="height: ${height}%; background: ${statusColors[status]};">
                <span class="bar-value">${count}</span>
            </div>
            <div class="bar-label">${statusLabels[status]}</div>
        `;

        chartContainer.appendChild(barItem);
    });
}

// Gráfico de Receita Mensal (últimos 6 meses)
function updateRevenueChart() {
    const monthlyRevenue = {};
    const today = new Date();

    // Preparar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenue[key] = {
            value: 0,
            label: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        };
    }

    // Calcular receita por mês
    allAppointmentsData.forEach(apt => {
        if (apt.date && apt.value) {
            const [year, month] = apt.date.split('-');
            const key = `${year}-${month}`;

            if (monthlyRevenue[key]) {
                monthlyRevenue[key].value += apt.value;
            }
        }
    });

    const maxRevenue = Math.max(...Object.values(monthlyRevenue).map(m => m.value), 1);
    const chartContainer = document.getElementById('revenue-chart');
    chartContainer.innerHTML = '';

    Object.entries(monthlyRevenue).forEach(([key, data]) => {
        const percentage = maxRevenue > 0 ? (data.value / maxRevenue) * 100 : 0;

        const barItem = document.createElement('div');
        barItem.className = 'horizontal-bar-item';
        barItem.innerHTML = `
            <div class="horizontal-bar-label">${data.label}</div>
            <div class="horizontal-bar-container">
                <div class="horizontal-bar" style="width: ${percentage}%;"></div>
            </div>
            <div class="horizontal-bar-value">${formatCurrencyValue(data.value)}</div>
        `;

        chartContainer.appendChild(barItem);
    });
}

// Resumo Mensal Detalhado
function updateMonthlySummary() {
    const monthlySummary = {};

    allAppointmentsData.forEach(apt => {
        if (apt.date) {
            const [year, month] = apt.date.split('-');
            const key = `${year}-${month}`;

            if (!monthlySummary[key]) {
                monthlySummary[key] = {
                    label: new Date(year, month - 1).toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric'
                    }),
                    agendado: 0,
                    cancelado: 0,
                    feito: 0,
                    reagendado: 0,
                    total: 0,
                    revenue: 0
                };
            }

            monthlySummary[key][apt.status]++;
            monthlySummary[key].total++;
            monthlySummary[key].revenue += apt.value || 0;
        }
    });

    // Ordenar por data (mais recente primeiro)
    const sortedSummary = Object.entries(monthlySummary)
        .sort((a, b) => b[0].localeCompare(a[0]));

    const container = document.getElementById('monthly-summary');

    if (sortedSummary.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">Nenhum dado disponível</p>';
        return;
    }

    let tableHTML = `
        <table class="summary-table">
            <thead>
                <tr>
                    <th>Mês</th>
                    <th>📅 Agendado</th>
                    <th>✅ Feito</th>
                    <th>🔄 Reagendado</th>
                    <th>❌ Cancelado</th>
                    <th>Total</th>
                    <th>Receita</th>
                </tr>
            </thead>
            <tbody>
    `;

    sortedSummary.forEach(([key, data]) => {
        tableHTML += `
            <tr>
                <td><strong>${data.label}</strong></td>
                <td><span class="status-count agendado">${data.agendado}</span></td>
                <td><span class="status-count feito">${data.feito}</span></td>
                <td><span class="status-count reagendado">${data.reagendado}</span></td>
                <td><span class="status-count cancelado">${data.cancelado}</span></td>
                <td><strong>${data.total}</strong></td>
                <td>${formatCurrencyValue(data.revenue)}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

// Event listener para mudança de período
document.addEventListener('DOMContentLoaded', () => {
    const periodSelect = document.getElementById('period-select');
    if (periodSelect) {
        periodSelect.addEventListener('change', (e) => {
            filterDashboardByPeriod(e.target.value);
        });
    }
});

// Filtrar dados por período
function filterDashboardByPeriod(period) {
    const today = new Date();
    let filteredData = [...allAppointmentsData];

    switch (period) {
        case 'current-month':
            filteredData = allAppointmentsData.filter(apt => {
                if (!apt.date) return false;
                const [year, month] = apt.date.split('-');
                return year == today.getFullYear() && month == (today.getMonth() + 1).toString().padStart(2, '0');
            });
            break;

        case 'last-month':
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);
            filteredData = allAppointmentsData.filter(apt => {
                if (!apt.date) return false;
                const [year, month] = apt.date.split('-');
                return year == lastMonth.getFullYear() && month == (lastMonth.getMonth() + 1).toString().padStart(2, '0');
            });
            break;

        case 'current-year':
            filteredData = allAppointmentsData.filter(apt => {
                if (!apt.date) return false;
                const [year] = apt.date.split('-');
                return year == today.getFullYear();
            });
            break;

        case 'all-time':
        default:
            // Usar todos os dados
            break;
    }

    // Atualizar visualizações com dados filtrados
    const originalData = allAppointmentsData;
    allAppointmentsData = filteredData;

    updateDashboardMetrics();
    updateStatusChart();

    // Restaurar dados originais para os gráficos de tendência
    allAppointmentsData = originalData;
    updateRevenueChart();
    updateMonthlySummary();
}
