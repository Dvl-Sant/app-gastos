document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token")) {
        window.location.href = "/login.html";
        return;
    }

    fetchDashboard();
    fetchExpenses();
    fetchAnalytics();

    document.getElementById("expense-form").addEventListener("submit", handleExpenseSubmit);
    document.getElementById("savings-form").addEventListener("submit", handleSavingsSubmit);
    document.getElementById("income-form").addEventListener("submit", handleIncomeSubmit);
    renderDate();
});

function renderDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("current-date-display").innerText = today.toLocaleDateString('es-ES', options);
}

const API_URL = "http://localhost:3000";

// Auth interceptor wrapper
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem("token");
    if (!options.headers) options.headers = {};
    if (token) options.headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (res.status === 401 || res.status === 403) {
        logout();
    }
    return res;
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login.html";
}

// Formatters
const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

// --- Fetch Data ---
async function fetchDashboard() {
    const res = await apiFetch(`/dashboard/summary`);
    const data = await res.json();
    document.getElementById("dashboard-savings").innerText = formatCurrency(data.total_savings);
    document.getElementById("dashboard-total-payment").innerText = formatCurrency(data.total_monthly_payment);
    document.getElementById("dashboard-total-debt").innerText = formatCurrency(data.total_debt);

    const breakdownEl = document.getElementById("dashboard-savings-breakdown");
    if (data.recommendation) {
        breakdownEl.innerHTML = `<span class="material-symbols-outlined text-[10px] mr-1">lightbulb</span> <b>Sugerencia:</b> Pagar <b>${data.recommendation.name}</b> (${formatCurrency(data.recommendation.amount)}) que vence el día ${data.recommendation.due_date}.`;
        breakdownEl.classList.remove("text-slate-500", "italic");
        breakdownEl.classList.add("text-primary", "flex", "items-center");
    } else {
        breakdownEl.innerHTML = `<span class="material-symbols-outlined text-[10px] mr-1">info</span> Sin pagos recomendados. (Puede que los pagos excedan el ahorro o no haya deudas)`;
        breakdownEl.classList.remove("text-primary");
        breakdownEl.classList.add("text-slate-500", "flex", "items-center");
    }
}

async function fetchIncomes() {
    const res = await apiFetch(`/incomes`);
    const incomes = await res.json();
    const tbody = document.getElementById("incomes-table-body");
    tbody.innerHTML = "";

    incomes.forEach(inc => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="px-4 py-4 font-bold text-slate-900">${inc.name}</td>
          <td class="px-4 py-4 text-right text-success font-bold">${formatCurrency(inc.amount)}</td>
          <td class="px-4 py-4 text-right text-slate-500 capitalize">${inc.frequency}</td>
          <td class="px-4 py-4 text-right">
            <button onclick="deleteIncome(${inc.id})" class="text-danger mx-1"><span class="material-symbols-outlined" style="font-size: 16px;">delete</span></button>
          </td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchHistory() {
    const res = await apiFetch(`/history`);
    const history = await res.json();
    const tbody = document.getElementById("history-table-body");
    tbody.innerHTML = "";

    history.forEach(log => {
        const tr = document.createElement("tr");
        const dateStr = new Date(log.payment_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
        tr.innerHTML = `
          <td class="px-4 py-4 font-bold text-slate-900">${log.concept}</td>
          <td class="px-4 py-4 text-right text-slate-700 font-bold">${formatCurrency(log.amount_paid)}</td>
          <td class="px-4 py-4 text-right text-slate-500">${dateStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchExpenses() {
    const res = await apiFetch(`/expenses`);
    const expenses = await res.json();
    const tbody = document.getElementById("expenses-table-body");
    tbody.innerHTML = "";

    expenses.forEach(exp => {
        const today = new Date().getDate();
        let statusIcon = '';
        if (exp.is_paid) {
            statusIcon = '<span class="material-symbols-outlined text-success" title="Pagado">check_circle</span>';
        } else if (exp.due_date < today) {
            statusIcon = '<span class="material-symbols-outlined text-danger" title="Vencido">error</span>';
        } else if (exp.due_date - today <= 5) {
            statusIcon = '<span class="material-symbols-outlined text-yellow-500" title="Por Vencer">warning</span>';
        } else {
            statusIcon = '<span class="material-symbols-outlined text-green-500" title="A Tiempo">schedule</span>';
        }

        const paymentStyle = exp.is_paid ? 'line-through text-slate-400' : 'text-danger';
        const nameStyle = exp.is_paid ? 'line-through text-slate-500 font-medium' : 'font-bold text-slate-900';
        const checkboxHtml = `<input type="checkbox" class="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer" ${exp.is_paid ? 'checked' : ''} onchange="togglePayment(${exp.id}, this.checked)">`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td class="px-4 py-4 text-center">
        <div class="flex items-center justify-center gap-2">
            ${checkboxHtml}
            ${statusIcon}
        </div>
      </td>
      <td class="px-4 py-4">
        <p class="${nameStyle}">${exp.name}</p>
        <p class="text-[10px] text-slate-400 font-medium">${exp.category} • Vence: ${exp.due_date}</p>
      </td>
      <td class="px-4 py-4 text-right ${paymentStyle} font-bold">${formatCurrency(exp.is_paid ? 0 : exp.monthly_payment)}</td>
      <td class="px-4 py-4 text-right font-semibold text-slate-700">${formatCurrency(exp.total_debt)}</td>
      <td class="px-4 py-4 text-right">
        <button onclick="editExpense(${exp.id})" class="text-primary mx-1"><span class="material-symbols-outlined" style="font-size: 16px;">edit</span></button>
        <button onclick="deleteExpense(${exp.id})" class="text-danger mx-1"><span class="material-symbols-outlined" style="font-size: 16px;">delete</span></button>
      </td>
    `;
        tbody.appendChild(tr);
    });
}

async function fetchAnalytics() {
    const res = await apiFetch(`/analytics`);
    const { byCategory } = await res.json();
    const container = document.getElementById("analytics-container");
    container.innerHTML = "";

    // Total logic for percentage (optional)
    const totalMonthly = byCategory.reduce((acc, cat) => acc + parseFloat(cat.total_monthly), 0);

    byCategory.forEach(cat => {
        const pct = totalMonthly > 0 ? ((parseFloat(cat.total_monthly) / totalMonthly) * 100).toFixed(1) : 0;
        const div = document.createElement("div");
        div.className = "flex items-center justify-between";
        div.innerHTML = `
      <div class="flex flex-col">
        <span class="text-[10px] text-slate-500 font-bold uppercase">${cat.category}</span>
        <span class="text-xs font-bold text-slate-800">${pct}% (${cat.count} items)</span>
      </div>
      <div class="font-bold text-slate-900">${formatCurrency(cat.total_monthly)}/mes</div>
    `;
        container.appendChild(div);
    });
}

// --- Expenses Modal & Actions ---
const expenseModal = document.getElementById("expense-modal");

function openExpenseModal() {
    document.getElementById("expense-id").value = "";
    document.getElementById("expense-form").reset();
    document.getElementById("modal-title").innerText = "Agregar Nuevo Gasto";
    expenseModal.classList.add("active");
}

function closeExpenseModal() {
    expenseModal.classList.remove("active");
}

async function handleExpenseSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("expense-id").value;
    const payload = {
        name: document.getElementById("expense-name").value,
        billing_date: parseInt(document.getElementById("expense-billing").value),
        due_date: parseInt(document.getElementById("expense-due").value),
        category: document.getElementById("expense-category").value,
        monthly_payment: parseFloat(document.getElementById("expense-monthly").value),
        total_debt: parseFloat(document.getElementById("expense-total").value),
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/expenses/${id}` : `/expenses`;

    await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    closeExpenseModal();
    refreshAll();
}

async function editExpense(id) {
    const res = await apiFetch(`/expenses/${id}`);
    const exp = await res.json();

    document.getElementById("expense-id").value = exp.id;
    document.getElementById("expense-name").value = exp.name;
    document.getElementById("expense-billing").value = exp.billing_date;
    document.getElementById("expense-due").value = exp.due_date;
    document.getElementById("expense-category").value = exp.category;
    document.getElementById("expense-monthly").value = exp.monthly_payment;
    document.getElementById("expense-total").value = exp.total_debt;

    document.getElementById("modal-title").innerText = "Editar Gasto";
    expenseModal.classList.add("active");
}

async function deleteExpense(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
        await apiFetch(`/expenses/${id}`, { method: 'DELETE' });
        refreshAll();
    }
}

async function togglePayment(id, isPaid) {
    if (isPaid) {
        if (!confirm('¿Marcar este pago como realizado? El monto mensual se reflejará como $0 en el mes actual.')) {
            refreshAll();
            return;
        }
    } else {
        if (!confirm('¿Desmarcar este pago? El monto volverá a sumarse a tus deudas mensuales.')) {
            refreshAll();
            return;
        }
    }

    await apiFetch(`/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_paid: isPaid })
    });
    refreshAll();
}

// --- Savings Modal & Actions ---
const savingsModal = document.getElementById("savings-modal");

async function openSavingsModal() {
    const res = await apiFetch(`/savings`);
    const data = await res.json();
    document.getElementById("savings-amount").value = data.total_amount || 0;
    document.getElementById("savings-currency").value = data.currency || 'USD';
    savingsModal.classList.add("active");
}

function closeSavingsModal() {
    savingsModal.classList.remove("active");
}

async function handleSavingsSubmit(e) {
    e.preventDefault();
    const payload = {
        total_amount: parseFloat(document.getElementById("savings-amount").value),
        currency: document.getElementById("savings-currency").value
    };

    await apiFetch(`/savings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    closeSavingsModal();
    refreshAll();
}

// --- Income Modal & Actions ---
const incomeModal = document.getElementById("income-modal");

function openIncomeModal() {
    document.getElementById("income-form").reset();
    incomeModal.style.display = "flex";
}

function closeIncomeModal() {
    incomeModal.style.display = "none";
}

async function handleIncomeSubmit(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById("income-name").value,
        amount: parseFloat(document.getElementById("income-amount").value),
        frequency: document.getElementById("income-frequency").value,
        next_pay_date: parseInt(document.getElementById("income-next-date").value)
    };

    await apiFetch(`/incomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    closeIncomeModal();
    refreshAll();
}

async function deleteIncome(id) {
    if (confirm('¿Eliminar este ingreso?')) {
        await apiFetch(`/incomes/${id}`, { method: 'DELETE' });
        refreshAll();
    }
}

function refreshAll() {
    fetchDashboard();
    fetchExpenses();
    fetchAnalytics();
    fetchIncomes();
    fetchHistory();
}
