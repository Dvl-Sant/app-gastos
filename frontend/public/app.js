document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token")) {
        window.location.href = "/login.html";
        return;
    }

    renderDate();
    renderIcons();

    if (document.getElementById("dashboard-savings")) {
        loadSortPreference();
        fetchDashboard();
        fetchExpenses();
        fetchAnalytics();
        fetchIncomes();

        document.getElementById("expense-form").addEventListener("submit", handleExpenseSubmit);
        document.getElementById("savings-form").addEventListener("submit", handleSavingsSubmit);
        document.getElementById("income-form").addEventListener("submit", handleIncomeSubmit);
    } else if (document.getElementById("history-container")) {
        fetchGroupedHistory();
    }
});

function renderDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("current-date-display").innerText = today.toLocaleDateString('es-ES', options);
}

function renderIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

const API_URL = "http://localhost:3000";

let expensesData = [];
let currentSort = { field: null, asc: true };

function getSortKey() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user ? `sort_${user.id}` : null;
    } catch { return null; }
}

function loadSortPreference() {
    const key = getSortKey();
    if (!key) return;
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            currentSort = JSON.parse(saved);
            updateSortIcons();
        }
    } catch {}
}

function saveSortPreference() {
    const key = getSortKey();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(currentSort));
}

function sortExpenses(field) {
    if (currentSort.field === field) {
        currentSort.asc = !currentSort.asc;
    } else {
        currentSort.field = field;
        currentSort.asc = true;
    }

    saveSortPreference();
    updateSortIcons();
    renderExpenses();
}

function updateSortIcons() {
    const fields = ['due_date', 'monthly_payment', 'total_debt'];
    fields.forEach(f => {
        const el = document.getElementById(`sort-icon-${f}`);
        if (!el) return;
        if (currentSort.field === f) {
            el.innerHTML = `<i data-lucide="${currentSort.asc ? 'arrow-up' : 'arrow-down'}" class="w-3 h-3 inline"></i>`;
        } else {
            el.innerHTML = '';
        }
    });
    renderIcons();
}

function renderExpenses() {
    const sorted = [...expensesData];
    if (currentSort.field) {
        sorted.sort((a, b) => {
            const va = parseFloat(a[currentSort.field]);
            const vb = parseFloat(b[currentSort.field]);
            return currentSort.asc ? va - vb : vb - va;
        });
    }

    const tbody = document.getElementById("expenses-table-body");
    tbody.innerHTML = "";

    sorted.forEach(exp => {
        const today = new Date().getDate();
        let statusIcon = '';
        if (exp.is_paid) {
            statusIcon = '<i data-lucide="circle-check" class="text-success w-5 h-5" title="Pagado"></i>';
        } else if (exp.due_date < today) {
            statusIcon = '<i data-lucide="circle-alert" class="text-danger w-5 h-5" title="Vencido"></i>';
        } else if (exp.due_date - today <= 5) {
            statusIcon = '<i data-lucide="triangle-alert" class="text-yellow-500 w-5 h-5" title="Por Vencer"></i>';
        } else {
            statusIcon = '<i data-lucide="clock" class="text-green-500 w-5 h-5" title="A Tiempo"></i>';
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
        <button onclick="editExpense(${exp.id})" class="text-primary mx-1"><i data-lucide="pencil" class="w-4 h-4 inline"></i></button>
        <button onclick="deleteExpense(${exp.id})" class="text-danger mx-1"><i data-lucide="trash-2" class="w-4 h-4 inline"></i></button>
      </td>
    `;
        tbody.appendChild(tr);
    });
    renderIcons();
}

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

const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

async function fetchDashboard() {
    const res = await apiFetch(`/dashboard/summary`);
    const data = await res.json();
    document.getElementById("dashboard-savings").innerText = formatCurrency(data.total_savings);
    document.getElementById("dashboard-total-payment").innerText = formatCurrency(data.total_monthly_payment);
    document.getElementById("dashboard-total-debt").innerText = formatCurrency(data.total_debt);

    const breakdownEl = document.getElementById("dashboard-savings-breakdown");
    if (data.recommendation) {
        breakdownEl.innerHTML = `<i data-lucide="lightbulb" class="w-3 h-3"></i> <span><b>Sugerencia:</b> Pagar <b>${data.recommendation.name}</b> (${formatCurrency(data.recommendation.amount)}) que vence el día ${data.recommendation.due_date}.</span>`;
        breakdownEl.classList.remove("text-slate-500", "italic");
        breakdownEl.classList.add("text-primary", "flex", "items-center", "gap-1");
    } else {
        breakdownEl.innerHTML = `<i data-lucide="info" class="w-3 h-3"></i> <span>Sin pagos recomendados. (Puede que los pagos excedan el ahorro o no haya deudas)</span>`;
        breakdownEl.classList.remove("text-primary");
        breakdownEl.classList.add("text-slate-500", "flex", "items-center", "gap-1");
    }
    renderIcons();
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
            <button onclick="editIncome(${inc.id})" class="text-primary mx-1"><i data-lucide="pencil" class="w-4 h-4 inline"></i></button>
            <button onclick="deleteIncome(${inc.id})" class="text-danger mx-1"><i data-lucide="trash-2" class="w-4 h-4 inline"></i></button>
          </td>
        `;
        tbody.appendChild(tr);
    });
    renderIcons();
}

async function fetchGroupedHistory() {
    const res = await apiFetch(`/history`);
    const history = await res.json();
    const container = document.getElementById("history-container");
    if (!container) return;

    container.innerHTML = "";

    if (history.length === 0) {
        container.innerHTML = `<p class="text-slate-500 italic text-center w-full py-8">No hay historial de pagos registrado.</p>`;
        return;
    }

    history.forEach(group => {
        const card = document.createElement("div");
        card.className = "bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm mb-6";

        let rowsHtml = "";
        if (group.payments) {
            group.payments.forEach(log => {
                const dateStr = new Date(log.payment_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
                rowsHtml += `
                    <tr>
                        <td class="px-4 py-4 font-semibold text-slate-700">${dateStr}</td>
                        <td class="px-4 py-4 text-right text-slate-900 font-bold">${formatCurrency(log.amount_paid)}</td>
                    </tr>
                `;
            });
        }

        card.innerHTML = `
            <div class="bg-primary/5 px-6 py-4 border-b border-border-subtle flex justify-between items-center">
                <h3 class="text-lg font-bold text-primary">${group.concept}</h3>
                <span class="text-sm font-semibold text-slate-500">Total pagado: <span class="text-slate-900">${formatCurrency(group.total_paid)}</span></span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-100 text-slate-500">
                            <th class="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Fecha de Pago</th>
                            <th class="px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(card);
    });
    renderIcons();
}

async function fetchExpenses() {
    const res = await apiFetch(`/expenses`);
    expensesData = await res.json();
    renderExpenses();
}

async function fetchAnalytics() {
    const res = await apiFetch(`/analytics`);
    const { byCategory } = await res.json();
    const container = document.getElementById("analytics-container");
    container.innerHTML = "";

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

const expenseModal = document.getElementById("expense-modal");

function openExpenseModal() {
    document.getElementById("expense-id").value = "";
    document.getElementById("expense-form").reset();
    document.getElementById("modal-title").innerText = "Agregar Nuevo Gasto";
    expenseModal.classList.add("active");
    setExpenseType('recurrent');
    renderIcons();
}

function closeExpenseModal() {
    expenseModal.classList.remove("active");
}

function setExpenseType(type) {
    document.getElementById("expense-type").value = type;

    const btnRecurrent = document.getElementById("btn-type-recurrent");
    const btnUnique = document.getElementById("btn-type-unique");

    const wrapBilling = document.getElementById("wrap-billing");
    const wrapTotalDebt = document.getElementById("wrap-total-debt");
    const rowDates = document.getElementById("row-dates");
    const wrapAmounts = document.getElementById("wrap-amounts");
    const lblMonthly = document.getElementById("lbl-monthly");

    if (type === 'unique') {
        btnUnique.className = "flex-1 text-xs font-bold uppercase tracking-wider py-2 rounded-md bg-white shadow-sm text-primary transition";
        btnRecurrent.className = "flex-1 text-xs font-bold uppercase tracking-wider py-2 rounded-md text-slate-500 hover:text-slate-700 transition";

        wrapBilling.style.display = "none";
        document.getElementById("expense-billing").removeAttribute("required");

        wrapTotalDebt.style.display = "none";
        document.getElementById("expense-total").removeAttribute("required");

        rowDates.className = "grid grid-cols-1 gap-4";
        wrapAmounts.className = "grid grid-cols-1 gap-4";

        lblMonthly.innerText = "Costo Total";
    } else {
        btnRecurrent.className = "flex-1 text-xs font-bold uppercase tracking-wider py-2 rounded-md bg-white shadow-sm text-primary transition";
        btnUnique.className = "flex-1 text-xs font-bold uppercase tracking-wider py-2 rounded-md text-slate-500 hover:text-slate-700 transition";

        wrapBilling.style.display = "block";
        document.getElementById("expense-billing").setAttribute("required", "true");

        wrapTotalDebt.style.display = "block";
        document.getElementById("expense-total").setAttribute("required", "true");

        rowDates.className = "grid grid-cols-2 gap-4";
        wrapAmounts.className = "grid grid-cols-2 gap-4";

        lblMonthly.innerText = "Pago Mensual";
    }
}

async function handleExpenseSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("expense-id").value;
    const type = document.getElementById("expense-type").value;

    let name = document.getElementById("expense-name").value;
    let billing = document.getElementById("expense-billing").value;
    const due = document.getElementById("expense-due").value;
    const monthly = document.getElementById("expense-monthly").value;
    let total = document.getElementById("expense-total").value;

    if (type === "unique") {
        if (!name.includes("(Único)")) {
            name = name + " (Único)";
        }
        billing = due;
        total = monthly;
    }

    const payload = {
        name: name,
        billing_date: parseInt(billing),
        due_date: parseInt(due),
        category: document.getElementById("expense-category").value,
        monthly_payment: parseFloat(monthly),
        total_debt: parseFloat(total)
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
    renderIcons();
}

async function deleteExpense(id) {
    const result = await Swal.fire({
        title: '¿Eliminar gasto?',
        text: '¿Estás seguro de que deseas eliminar este gasto?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        await apiFetch(`/expenses/${id}`, { method: 'DELETE' });
        refreshAll();
    }
}

async function togglePayment(id, isPaid) {
    if (isPaid) {
        const result = await Swal.fire({
            title: '¿Marcar pago como realizado?',
            text: 'El monto mensual se reflejará como $0 en el mes actual.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1772da',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, marcar',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) {
            refreshAll();
            return;
        }
    } else {
        const result = await Swal.fire({
            title: '¿Desmarcar este pago?',
            text: 'El monto volverá a sumarse a tus deudas mensuales.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#1772da',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, desmarcar',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) {
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

const savingsModal = document.getElementById("savings-modal");

async function openSavingsModal() {
    const res = await apiFetch(`/savings`);
    const data = await res.json();
    document.getElementById("savings-amount").value = data.total_amount || 0;
    document.getElementById("savings-currency").value = data.currency || 'USD';
    savingsModal.classList.add("active");
    renderIcons();
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

const incomeModal = document.getElementById("income-modal");

function openIncomeModal() {
    document.getElementById("income-id").value = "";
    document.getElementById("income-form").reset();
    document.getElementById("income-modal-title").innerText = "Registrar Ingreso";
    incomeModal.style.display = "flex";
    renderIcons();
}

function closeIncomeModal() {
    incomeModal.style.display = "none";
}

async function editIncome(id) {
    const res = await apiFetch(`/incomes/${id}`);
    const inc = await res.json();

    document.getElementById("income-id").value = inc.id;
    document.getElementById("income-name").value = inc.name;
    document.getElementById("income-amount").value = inc.amount;
    document.getElementById("income-frequency").value = inc.frequency;
    document.getElementById("income-next-date").value = inc.next_pay_date;

    document.getElementById("income-modal-title").innerText = "Editar Ingreso";
    incomeModal.style.display = "flex";
    renderIcons();
}

async function handleIncomeSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("income-id").value;
    const payload = {
        name: document.getElementById("income-name").value,
        amount: parseFloat(document.getElementById("income-amount").value),
        frequency: document.getElementById("income-frequency").value,
        next_pay_date: parseInt(document.getElementById("income-next-date").value)
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/incomes/${id}` : `/incomes`;

    await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    closeIncomeModal();
    refreshAll();
}

async function deleteIncome(id) {
    const result = await Swal.fire({
        title: '¿Eliminar este ingreso?',
        text: '¿Estás seguro de que deseas eliminarlo?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        await apiFetch(`/incomes/${id}`, { method: 'DELETE' });
        refreshAll();
    }
}

function refreshAll() {
    if (document.getElementById("dashboard-savings")) {
        fetchDashboard();
        fetchExpenses();
        fetchAnalytics();
        fetchIncomes();
    } else if (document.getElementById("history-container")) {
        fetchGroupedHistory();
    }
}
