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
            }
        });
    });
}

// Event Listeners
function setupEventListeners() {
    appointmentForm.addEventListener('submit', handleFormSubmit);
    imageInput.addEventListener('change', handleImageSelect);
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

    const formData = {
        clientName: document.getElementById('client-name').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        description: document.getElementById('description').value,
        notes: document.getElementById('notes').value,
        phone: document.getElementById('phone').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        let docRef;

        if (currentEditingId) {
            // Atualizar agendamento existente
            docRef = appointmentsCollection.doc(currentEditingId);
            
            // Obter imagens antigas para comparar e deletar as removidas
            const oldDoc = await docRef.get();
            const oldImages = oldDoc.data().images || [];
            
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
            
            await docRef.update(formData);
        } else {
            // Criar novo agendamento
            docRef = await appointmentsCollection.add(formData);
        }

        // Upload de novas imagens
        let allImages = [...existingImages]; // Manter imagens existentes
        if (imageFiles.length > 0) {
            const newImageUrls = await uploadImages(docRef.id);
            allImages = [...allImages, ...newImageUrls]; // Adicionar novas
        }

        // Atualizar com todas as imagens (existentes + novas)
        if (allImages.length > 0 || currentEditingId) {
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

    return `
        <div class="${cardClass}" onclick="showAppointmentDetail('${id}')">
            <h3>👤 ${data.clientName}</h3>
            <div class="appointment-info">
                <div class="info-item">
                    <strong>📅 Data:</strong> ${new Date(data.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
                <div class="info-item">
                    <strong>🕐 Horário:</strong> ${data.time}
                </div>
                ${data.phone ? `<div class="info-item"><strong>📱 Telefone:</strong> ${data.phone}</div>` : ''}
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

        // Layout com grid: informações à esquerda, imagens à direita
        let html = `
            <h2>📋 Detalhes do Agendamento</h2>
            <div class="modal-detail-container">
                <div class="modal-info">
                    <p><strong>Cliente:</strong> ${data.clientName}</p>
                    <p><strong>Data:</strong> ${new Date(data.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    <p><strong>Horário:</strong> ${data.time}</p>
                    ${data.phone ? `<p><strong>Telefone:</strong> ${data.phone}</p>` : ''}
                    <p><strong>Descrição:</strong></p>
                    <p style="margin-left: 20px; white-space: pre-wrap;">${data.description}</p>
                    ${data.notes ? `<p><strong>Observações:</strong></p><p style="margin-left: 20px; white-space: pre-wrap;">${data.notes}</p>` : ''}
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
