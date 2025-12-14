import './styles.css';

const defaultConfig = {
  unitPrice: 6.5,
  unitCost: 3.2,
  salvageValue: 1.25,
  stockoutPenalty: 0.8,
  iterations: 1000,
  serviceLevelTilt: 0.35,
  seed: 20240718,
  qStep: 10,
};

const defaultStores = [
  { id: crypto.randomUUID(), name: 'Boise #101', mean: 120, stdDev: 35, priority: 1.1 },
  { id: crypto.randomUUID(), name: 'Portland #214', mean: 95, stdDev: 28, priority: 1.05 },
  { id: crypto.randomUUID(), name: 'Seattle #305', mean: 140, stdDev: 45, priority: 1.15 },
  { id: crypto.randomUUID(), name: 'Spokane #409', mean: 70, stdDev: 22, priority: 0.92 },
];

const inputs = {
  unitPrice: document.getElementById('unit-price'),
  unitCost: document.getElementById('unit-cost'),
  salvageValue: document.getElementById('salvage-value'),
  stockoutPenalty: document.getElementById('stockout-penalty'),
  iterations: document.getElementById('iterations'),
  serviceLevel: document.getElementById('service-level'),
  seed: document.getElementById('seed'),
  qStep: document.getElementById('q-step'),
};

const storeTableBody = document.getElementById('store-table');
const allocationTable = document.getElementById('allocation-table');
const summaryList = document.getElementById('summary-list');
const runtimeChip = document.getElementById('runtime-chip');
const kpi = {
  q: document.getElementById('kpi-q'),
  profit: document.getElementById('kpi-profit'),
  fill: document.getElementById('kpi-fill'),
  waste: document.getElementById('kpi-waste'),
  confidence: document.getElementById('kpi-confidence'),
};

let stores = [];

function seededRandom(seed) {
  if (!Number.isFinite(seed)) return Math.random;
  let value = Math.abs(Math.floor(seed)) % 2147483647;
  if (value === 0) value = 1;
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
}

function sampleTruncatedNormal(mean, std, rng) {
  let u1 = 0;
  let u2 = 0;
  let z = 0;
  do {
    u1 = rng();
    u2 = rng();
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    const z0 = mag * Math.cos(2 * Math.PI * u2);
    z = z0 * std + mean;
  } while (z < 0);
  return z;
}

function clampNumber(value, fallback) {
  const num = Number(value);
  if (Number.isFinite(num)) return num;
  return fallback;
}

function formatCurrency(n) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function renderStores() {
  storeTableBody.innerHTML = '';
  stores.forEach((store) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" data-field="name" data-id="${store.id}" value="${store.name}" /></td>
      <td><input type="number" step="1" min="0" data-field="mean" data-id="${store.id}" value="${store.mean}" /></td>
      <td><input type="number" step="1" min="0" data-field="stdDev" data-id="${store.id}" value="${store.stdDev}" /></td>
      <td><input type="number" step="0.01" min="0" data-field="priority" data-id="${store.id}" value="${store.priority}" /></td>
      <td><button class="ghost" data-remove="${store.id}">Remove</button></td>
    `;
    storeTableBody.appendChild(row);
  });
}

function readStoresFromTable() {
  const rows = [...storeTableBody.querySelectorAll('tr')];
  return rows
    .map((row) => {
      const id = row.querySelector('[data-field="name"]').dataset.id;
      const name = row.querySelector('[data-field="name"]').value || 'Store';
      const mean = clampNumber(row.querySelector('[data-field="mean"]').value, 0);
      const stdDev = clampNumber(row.querySelector('[data-field="stdDev"]').value, 0);
      const priority = clampNumber(row.querySelector('[data-field="priority"]').value, 1);
      return { id, name, mean, stdDev, priority };
    })
    .filter((s) => s.mean >= 0);
}

function allocationPlan(totalQ, storeList, tilt) {
  const weighted = storeList.map((store) => {
    const desired = store.mean * (1 + tilt * (store.priority - 1));
    return { ...store, desired };
  });
  const totalDesired = weighted.reduce((sum, s) => sum + s.desired, 0) || 1;
  const allocations = weighted.map((store) => {
    const share = store.desired / totalDesired;
    return { id: store.id, name: store.name, amount: Math.max(0, Math.round(share * totalQ)) };
  });
  return allocations;
}

function simulateCandidate({
  Q,
  stores: storeList,
  inputs: { unitPrice, unitCost, salvageValue, stockoutPenalty },
  iterations,
  tilt,
  rng,
}) {
  const allocations = allocationPlan(Q, storeList, tilt);
  let totalProfit = 0;
  let totalDemand = 0;
  let totalFilled = 0;
  let totalWaste = 0;
  let totalShort = 0;

  for (let i = 0; i < iterations; i += 1) {
    storeList.forEach((store) => {
      const demand = sampleTruncatedNormal(store.mean, store.stdDev, rng);
      const allocation = allocations.find((a) => a.id === store.id)?.amount ?? 0;
      const sales = Math.min(allocation, demand);
      const waste = Math.max(0, allocation - sales);
      const short = Math.max(0, demand - allocation);

      totalDemand += demand;
      totalFilled += sales;
      totalWaste += waste;
      totalShort += short;

      totalProfit += sales * unitPrice + waste * salvageValue - short * stockoutPenalty;
    });
  }

  const averageProfit = totalProfit / iterations - unitCost * Q;
  return {
    Q,
    allocations,
    averageProfit,
    fillRate: totalDemand === 0 ? 0 : totalFilled / totalDemand,
    wasteRatio: Q === 0 ? 0 : totalWaste / (iterations * Q),
    shortRate: totalDemand === 0 ? 0 : totalShort / totalDemand,
  };
}

function optimize() {
  const unitPrice = clampNumber(inputs.unitPrice.value, defaultConfig.unitPrice);
  const unitCost = clampNumber(inputs.unitCost.value, defaultConfig.unitCost);
  const salvageValue = clampNumber(inputs.salvageValue.value, defaultConfig.salvageValue);
  const stockoutPenalty = clampNumber(inputs.stockoutPenalty.value, defaultConfig.stockoutPenalty);
  const iterations = Math.max(100, Math.floor(clampNumber(inputs.iterations.value, defaultConfig.iterations)));
  const tilt = clampNumber(inputs.serviceLevel.value, defaultConfig.serviceLevelTilt);
  const qStep = Math.max(1, Math.floor(clampNumber(inputs.qStep.value, defaultConfig.qStep)));
  const seed = clampNumber(inputs.seed.value, defaultConfig.seed);
  const rng = seededRandom(seed);

  const storeList = readStoresFromTable();
  if (!storeList.length) {
    alert('Add at least one store before running.');
    return null;
  }

  const totalMean = storeList.reduce((sum, s) => sum + s.mean, 0);
  const minQ = Math.max(0, Math.round(totalMean * 0.6));
  const maxQ = Math.max(minQ + qStep, Math.round(totalMean * 1.6));

  const start = performance.now();
  let best = null;
  const candidates = [];
  for (let q = minQ; q <= maxQ; q += qStep) {
    const result = simulateCandidate({
      Q: q,
      stores: storeList,
      inputs: { unitPrice, unitCost, salvageValue, stockoutPenalty },
      iterations,
      tilt,
      rng,
    });
    candidates.push(result);
    if (!best || result.averageProfit > best.averageProfit) {
      best = result;
    }
  }
  const runtime = performance.now() - start;
  updateUI(best, { runtime, candidates });
  return best;
}

function updateUI(result, { runtime, candidates }) {
  if (!result) return;
  runtimeChip.textContent = `${Math.round(runtime)} ms`;
  kpi.q.textContent = result.Q;
  kpi.profit.textContent = formatCurrency(result.averageProfit);
  kpi.fill.textContent = formatPct(result.fillRate);
  kpi.waste.textContent = formatPct(result.wasteRatio);

  const sorted = [...candidates].sort((a, b) => b.averageProfit - a.averageProfit);
  const [first, second] = sorted;
  const confidence = second
    ? (first.averageProfit - second.averageProfit) / Math.abs(second.averageProfit || 1)
    : 0;
  const confidenceText = `Δ ${formatPct(Math.max(0, confidence))}`;
  kpi.confidence.textContent = confidenceText;

  summaryList.innerHTML = '';
  const rows = [
    ['Expected fill', formatPct(result.fillRate)],
    ['Expected waste', formatPct(result.wasteRatio)],
    ['Expected shortfall', formatPct(result.shortRate)],
    ['Grid searched Q', `${candidates.length} candidates`],
  ];
  rows.forEach(([label, value]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    summaryList.appendChild(li);
  });

  allocationTable.innerHTML = '';
  result.allocations.forEach((alloc) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${alloc.name}</td><td>${alloc.amount}</td>`;
    allocationTable.appendChild(row);
  });
}

function resetInputs() {
  inputs.unitPrice.value = defaultConfig.unitPrice;
  inputs.unitCost.value = defaultConfig.unitCost;
  inputs.salvageValue.value = defaultConfig.salvageValue;
  inputs.stockoutPenalty.value = defaultConfig.stockoutPenalty;
  inputs.iterations.value = defaultConfig.iterations;
  inputs.serviceLevel.value = defaultConfig.serviceLevelTilt;
  inputs.seed.value = defaultConfig.seed;
  inputs.qStep.value = defaultConfig.qStep;
  stores = defaultStores.map((s) => ({ ...s, id: crypto.randomUUID() }));
  renderStores();
}

function exportJSON() {
  const payload = {
    config: {
      unitPrice: Number(inputs.unitPrice.value),
      unitCost: Number(inputs.unitCost.value),
      salvageValue: Number(inputs.salvageValue.value),
      stockoutPenalty: Number(inputs.stockoutPenalty.value),
      iterations: Number(inputs.iterations.value),
      serviceLevelTilt: Number(inputs.serviceLevel.value),
      seed: Number(inputs.seed.value),
      qStep: Number(inputs.qStep.value),
    },
    stores: readStoresFromTable(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'perishable-order-optimizer.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importJSONFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.config) {
        Object.entries(data.config).forEach(([key, value]) => {
          if (inputs[key]) inputs[key].value = value;
        });
      }
      if (Array.isArray(data.stores)) {
        stores = data.stores.map((s) => ({ ...s, id: s.id || crypto.randomUUID() }));
        renderStores();
      }
    } catch {
      alert('Invalid JSON file');
    }
  };
  reader.readAsText(file);
}

function attachListeners() {
  document.getElementById('run-btn').addEventListener('click', optimize);
  document.getElementById('reset-btn').addEventListener('click', resetInputs);
  document.getElementById('add-store').addEventListener('click', () => {
    stores.push({
      id: crypto.randomUUID(),
      name: `Store ${stores.length + 1}`,
      mean: 80,
      stdDev: 20,
      priority: 1,
    });
    renderStores();
  });
  document.getElementById('export-json').addEventListener('click', exportJSON);
  document.getElementById('import-json').addEventListener('change', (e) => {
    const [file] = e.target.files;
    importJSONFile(file);
    e.target.value = '';
  });

  storeTableBody.addEventListener('input', (e) => {
    const { field, id } = e.target.dataset;
    if (!field || !id) return;
    const store = stores.find((s) => s.id === id);
    if (!store) return;
    if (field === 'name') {
      store.name = e.target.value;
    } else {
      store[field] = clampNumber(e.target.value, store[field]);
    }
  });

  storeTableBody.addEventListener('click', (e) => {
    const id = e.target.dataset.remove;
    if (!id) return;
    stores = stores.filter((s) => s.id !== id);
    renderStores();
  });
}

resetInputs();
attachListeners();
