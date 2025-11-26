// ARQUIVO: script.js
// VERSÃO: FINAL - ESTABILIDADE DE ESTADO (Recarregamento)

document.addEventListener("DOMContentLoaded", () => {
  console.log("🟢 Script iniciado. DOM carregado.");

  // ---------- CONFIGURAÇÕES ----------
  const SPREADSHEET_ID = "1BvDKkVQAzH3kZkuhxxqbLjwIvG3MEB-YCWrI3H0NcX4";
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;

  const IOF_RATE = 0.035; // 3.5%
  const UPDATE_INTERVAL_SECONDS = 600; // 10 minutos

  // IDs do EmailJS
  const SERVICE_ID = "service_vfriyz8";
  const TEMPLATE_ADMIN = "template_9fzmu0n";
  const TEMPLATE_CLIENTE = "template_u5saecn";

  // Operadores (Números para o sorteio do WhatsApp)
  const OPERATORS = ["5511953505626", "5511938059556"];

  // ---------- REGRAS ----------
  const PAPER_RULES = {
    USD: { minStep: 50, notes: "100 (50 apenas sob consulta)" },
    EUR: { minStep: 50, notes: "100 (50 apenas sob consulta)" },
    JPY: { minStep: 10000, notes: "10.000" },
    GBP: { minStep: 50, notes: "50" },
    CHF: { minStep: 100, notes: "100" },
    AUD: { minStep: 100, notes: "100" },
    CAD: { minStep: 100, notes: "100" },
    CLP: { minStep: 20000, notes: "20.000" },
    MXN: { minStep: 200, notes: "200" },
    UYU: { minStep: 1000, notes: "1.000" },

    // EXÓTICAS
    AED: { isExotic: true, name: "Dirham (AED)" },
    CNY: { isExotic: true, name: "Iuan (CNY)" },
    PEN: { isExotic: true, name: "Novo Sol (PEN)" },
    ARS: { isExotic: true, name: "Peso Argentino (ARS)" },
    COP: { isExotic: true, name: "Peso Colombiano (COP)" },
    ZAR: { isExotic: true, name: "Rand (ZAR)" },
  };

  // ---------- SELETORES ----------
  const getEl = (id) => document.getElementById(id);

  // Elementos principais
  const dataStatus = getEl("dataStatus");
  const btnPapel = getEl("btnPapel");
  const btnCartao = getEl("btnCartao");
  const currencyList = getEl("currencyList");
  const fromSel = getEl("from");
  const amountInput = getEl("amount");
  const convertBtn = getEl("convertBtn");
  const clearBtn = getEl("clearBtn");
  const resultCard = getEl("resultCard");
  const resultValue = getEl("resultValue");
  const quoteTime = getEl("quoteTime");
  const calcDetails = getEl("calcDetails");
  const comparisonGrid = getEl("comparisonGrid");
  const errorMsg = getEl("errorMsg");
  const lastUpdate = getEl("lastUpdate");
  const nextUpdate = getEl("nextUpdate");

  // Modal e Form
  const buyBtn = getEl("buyBtn");
  const budgetModal = getEl("budgetModal");
  const closeModalBtn = getEl("closeModalBtn");
  const budgetForm = getEl("budgetForm");
  const successStep = getEl("successStep");
  const finalWhatsAppBtn = getEl("finalWhatsAppBtn");

  // Modal - Campos de Valor e Infos
  const modalCurrencyAmount = getEl("modalCurrencyAmount");
  const modalCurrencyCode = getEl("modalCurrencyCode");
  const modalTotalBRL = getEl("modalTotalBRL");
  const modalDetails = getEl("modalDetails"); // Onde ficará o botão "Ver taxas"
  const operationalInfo = getEl("operationalInfo"); // Onde ficará o texto cinza de aviso

  // Modal - Campos do Cliente
  const clientName = getEl("clientName");
  const clientPhone = getEl("clientPhone");
  const deliveryCheck = getEl("deliveryCheck");
  const deliveryFields = getEl("deliveryFields");

  // Backup do botão original (para resetar em caso de exóticas)
  const originalBuyBtnHTML = buyBtn ? buyBtn.outerHTML : null;

  // ---------- LÓGICA DE ENTREGA ----------
  if (deliveryCheck) {
    deliveryCheck.addEventListener("change", function () {
      if (this.checked) {
        deliveryFields.classList.remove("hidden");
        getEl("deliveryCEP").required = true;
        getEl("deliveryAddress").required = true;
      } else {
        deliveryFields.classList.add("hidden");
        getEl("deliveryCEP").required = false;
        getEl("deliveryAddress").required = false;
      }
    });
  }

  // ---------- ESTADO ----------
  let ratesPapel = {};
  let ratesCartao = {};
  let currentMode = "";
  let available = {};
  let lastFetchTime = null;
  let countdownInterval;
  let currentQuote = null;

  // ---------- UTILS ----------
  function formatBRL(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v);
  }

  function formatRate(v) {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(v);
  }

  function getFlagElement(currencyCode) {
    const countryMap = {
      USD: "us",
      EUR: "eu",
      JPY: "jp",
      GBP: "gb",
      CHF: "ch",
      AUD: "au",
      CAD: "ca",
      NZD: "nz",
      MXN: "mx",
      UYU: "uy",
      CLP: "cl",
      AED: "ae",
      LTL: "lt",
      CNY: "cn",
      PEN: "pe",
      ARS: "ar",
      COP: "co",
      ZAR: "za",
      BRL: "br",
    };
    const countryCode = countryMap[currencyCode];
    if (countryCode) {
      return `<img src="https://flagcdn.com/24x18/${countryCode}.png" alt="${currencyCode}" class="w-5 h-auto shadow-sm inline-block mr-1.5 align-middle">`;
    }
    return "";
  }

  function getFlagEmoji(currencyCode) {
    const countryMap = {
      USD: "US",
      EUR: "EU",
      JPY: "JP",
      GBP: "GB",
      CHF: "CH",
      AUD: "AU",
      CAD: "CA",
      NZD: "NZ",
      MXN: "MX",
      UYU: "UY",
      CLP: "CL",
      AED: "AE",
      CNY: "CN",
      PEN: "PE",
      ARS: "AR",
      COP: "CO",
      ZAR: "ZA",
    };
    const code = countryMap[currencyCode];
    return code
      ? code
          .toUpperCase()
          .replace(/./g, (char) =>
            String.fromCodePoint(char.charCodeAt(0) + 127397)
          )
      : "";
  }

  function getWhatsAppLinkForExotic(currencyCode, amount, operator) {
    const msg = `Olá, M&A Consultoria Câmbio! Me chamo\n\nTenho interesse na moeda exótica *${currencyCode}*.\nQuantidade: *${amount}*.\n\nPor favor, me ajude com a cotação.`;
    return `https://api.whatsapp.com/send?phone=${operator}&text=${encodeURIComponent(
      msg
    )}`;
  }

  // ---------- FETCH DE DADOS ----------
  async function fetchSheetRates() {
    if (dataStatus)
      dataStatus.innerHTML = `<i class="ph-bold ph-spinner animate-spin"></i> Carregando...`;

    try {
      const res = await fetch(SHEET_URL);
      const text = await res.text();
      const m = text.match(/setResponse\((.*)\);/);
      if (!m) throw new Error("Erro Sheets");
      const json = JSON.parse(m[1]);
      const rows = json.table.rows || [];
      ratesPapel = {};
      ratesCartao = {};

      lastFetchTime = new Date();

      for (let i = 1; i <= 12; i++) {
        const r = rows[i];
        if (!r) continue;
        const m = r.c[7]?.v;
        const v = r.c[8]?.v;
        if (m && v)
          ratesPapel[String(m).trim()] = {
            raw: Number(v),
            display: r.c[8].f || String(v),
          };
      }
      Object.keys(PAPER_RULES).forEach((code) => {
        if (PAPER_RULES[code].isExotic && !ratesPapel[code]) {
          ratesPapel[code] = { isExotic: true, raw: 0, display: "Consulta" };
        }
      });

      for (let i = 1; i <= 7; i++) {
        const r = rows[i];
        if (!r) continue;
        const m = r.c[9]?.v;
        const v = r.c[10]?.v;
        if (m && v)
          ratesCartao[String(m).trim()] = {
            raw: Number(v),
            display: r.c[10].f || String(v),
          };
      }

      if (dataStatus) {
        dataStatus.innerHTML = `<i class="ph-bold ph-check-circle"></i> Atualizado`;
        setTimeout(() => dataStatus.classList.add("hidden"), 1500);
      }
      startUpdateTimer();
    } catch (err) {
      console.error(err);
      // Fallback em caso de erro (valores fictícios para não quebrar a UI)
      ratesPapel = {
        USD: { raw: 5.8, display: "R$ 5,80" },
        EUR: { raw: 6.2, display: "R$ 6,20" },
      };
      ratesCartao = {
        USD: { raw: 5.95, display: "R$ 5,95" },
        EUR: { raw: 6.4, display: "R$ 6,40" },
      };
      Object.keys(PAPER_RULES).forEach((code) => {
        if (PAPER_RULES[code].isExotic && !ratesPapel[code]) {
          ratesPapel[code] = { isExotic: true, raw: 0, display: "Consulta" };
        }
      });
      if (dataStatus) dataStatus.innerHTML = "Offline";
      startUpdateTimer();
    }
  }

  function startUpdateTimer() {
    if (countdownInterval) clearInterval(countdownInterval);
    updateTimerUI();
    countdownInterval = setInterval(updateTimerUI, 1000);
  }

  function updateTimerUI() {
    if (!lastFetchTime) return;
    const now = new Date();
    const remaining =
      UPDATE_INTERVAL_SECONDS - Math.floor((now - lastFetchTime) / 1000);

    if (lastUpdate)
      lastUpdate.textContent = `${lastFetchTime.toLocaleDateString()} às ${lastFetchTime.toLocaleTimeString()}`;

    if (nextUpdate) {
      if (remaining <= 0) {
        nextUpdate.textContent = "Atualizando...";
        clearInterval(countdownInterval);
      } else {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        nextUpdate.textContent = `${m}:${s.toString().padStart(2, "0")}`;
      }
    }
  }

  // ---------- LÓGICA DE CÁLCULO ----------
  function calculateConversion(mode, currencyCode, amount) {
    const ratesObj = mode === "papel" ? ratesPapel : ratesCartao;
    const data = ratesObj[currencyCode];
    if (!data) return null;

    const rateWithIOF = data.raw;
    const baseRate = rateWithIOF / (1 + IOF_RATE);
    const iofValue = baseRate * IOF_RATE;
    const totalBRL = amount * rateWithIOF;
    const totalIOFValue = amount * iofValue;
    const conversionBase = amount * baseRate;

    return {
      mode,
      currencyCode,
      amount,
      cotaçãoBase: baseRate,
      conversionBase,
      iofRate: IOF_RATE,
      totalIOFValue,
      totalBRL,
      VET: rateWithIOF,
      rateDisplay: data.display,
      time: lastFetchTime || new Date(),
    };
  }

  function validatePaperAmount(currency, amount) {
    if (currentMode !== "papel") return { valid: true };
    const rule = PAPER_RULES[currency];
    if (!rule || rule.isExotic) return { valid: true };
    if (amount % rule.minStep !== 0) {
      return {
        valid: false,
        msg: `Para ${currency} em Papel, o valor deve ser múltiplo de ${rule.minStep}. (Notas disponíveis: ${rule.notes})`,
      };
    }
    return { valid: true };
  }

  function updateInputHelper() {
    if (!amountInput || !fromSel.value) return;
    const currency = fromSel.value;
    const existingHint = document.getElementById("inputHint");
    if (existingHint) existingHint.remove();

    if (
      currentMode === "papel" &&
      PAPER_RULES[currency] &&
      !PAPER_RULES[currency].isExotic
    ) {
      const rule = PAPER_RULES[currency];
      amountInput.step = rule.minStep;
      amountInput.min = rule.minStep;
      amountInput.placeholder = `Múltiplos de ${rule.minStep}`;
      const hint = document.createElement("div");
      hint.id = "inputHint";
      hint.className =
        "text-xs text-gray-500 mt-1 font-medium flex items-center gap-1";
      hint.innerHTML = `<i class="ph-bold ph-info text-[#d6c07a]"></i> Notas disponíveis: ${rule.notes}`;
      amountInput.parentNode.appendChild(hint);
    } else {
      amountInput.step = "0.01";
      amountInput.min = "0";
      amountInput.placeholder = "Exemplo: 1000";
    }
  }

  // ---------- UI LOGIC ----------
  function setMode(mode) {
    if (Object.keys(ratesPapel).length === 0) {
      fetchSheetRates().then(() => {
        setModeUI(mode);
      });
    } else {
      setModeUI(mode);
    }
  }

  function setModeUI(mode) {
    const currentCurrency = fromSel ? fromSel.value : "";
    currentMode = mode;
    available = mode === "papel" ? ratesPapel : ratesCartao;

    if (btnPapel)
      btnPapel.className =
        mode === "papel"
          ? "flex-1 px-4 py-2 rounded-lg btn-primary font-semibold text-gray-900 text-sm transition-all flex items-center justify-center gap-2"
          : "flex-1 px-4 py-2 rounded-lg border bg-white font-semibold text-gray-500 text-sm transition-all flex items-center justify-center gap-2";
    if (btnCartao)
      btnCartao.className =
        mode === "cartao"
          ? "flex-1 px-4 py-2 rounded-lg btn-primary font-semibold text-gray-900 text-sm transition-all flex items-center justify-center gap-2"
          : "flex-1 px-4 py-2 rounded-lg border bg-white font-semibold text-gray-500 text-sm transition-all flex items-center justify-center gap-2";

    populateCurrencyList();
    fillSelector();
    updateInputHelper();

    if (currentCurrency && available[currentCurrency] && amountInput.value) {
      fromSel.value = currentCurrency;
      highlightSelectedCurrency(currentCurrency);
      updateDisplayConversion();
    } else if (
      currentCurrency &&
      currentMode === "papel" &&
      PAPER_RULES[currentCurrency]?.isExotic &&
      amountInput.value
    ) {
      fromSel.value = currentCurrency;
      highlightSelectedCurrency(currentCurrency);
      updateDisplayConversion();
    } else {
      if (currentCurrency) fromSel.value = currentCurrency;
      resultCard.classList.add("hidden");
      comparisonGrid.innerHTML = "";
      restoreBuyBtn();
    }
  }

  function restoreBuyBtn() {
    const currentBuyBtn = getEl("buyBtn");
    if (currentBuyBtn && currentBuyBtn.tagName === "A") {
      currentBuyBtn.outerHTML = originalBuyBtnHTML;
      window.buyBtn = getEl("buyBtn");
      if (window.buyBtn)
        window.buyBtn.onclick = (e) => {
          e.preventDefault();
          openModal();
        };
    }
  }

  if (btnPapel) btnPapel.onclick = () => setMode("papel");
  if (btnCartao) btnCartao.onclick = () => setMode("cartao");

  function populateCurrencyList() {
    currencyList.innerHTML = "";
    Object.keys(available).forEach((code) => {
      const btn = document.createElement("button");
      const isSelected = fromSel.value === code;
      const isExoticDisplay = PAPER_RULES[code]?.isExotic;
      const rateDisplay = isExoticDisplay
        ? "Sob Consulta"
        : `R$ ${formatRate(available[code].raw)}`;

      btn.className = `text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? "border-[#d6c07a] bg-[#fffdf5]"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`;
      btn.innerHTML = `
            <div class="text-sm font-medium flex items-center text-gray-800">
                ${getFlagElement(code)} ${code}
            </div>
            <div class="text-xs ${
              isExoticDisplay ? "text-red-500" : "text-gray-500"
            } mt-1">
                ${rateDisplay}
            </div>`;

      btn.onclick = () => {
        fromSel.value = code;
        highlightSelectedCurrency(code);
        updateInputHelper();
        resultCard.classList.add("hidden");
      };
      currencyList.appendChild(btn);
    });
    highlightSelectedCurrency(fromSel.value);
  }

  function highlightSelectedCurrency(code) {
    document.querySelectorAll("#currencyList button").forEach((btn) => {
      btn.classList.remove("border-[#d6c07a]", "bg-[#fffdf5]");
      btn.classList.add("border-gray-200", "bg-white");
      if (code && btn.textContent.includes(code)) {
        btn.classList.remove("border-gray-200", "bg-white");
        btn.classList.add("border-[#d6c07a]", "bg-[#fffdf5]");
      }
    });
  }

  function fillSelector() {
    const current = fromSel.value;
    fromSel.disabled = true;
    fromSel.innerHTML =
      '<option value="" disabled selected>Selecione...</option>';
    Object.keys(available).forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      const isExoticOpt = PAPER_RULES[code]?.isExotic;
      opt.textContent = `${getFlagEmoji(code)} ${code} ${
        isExoticOpt ? "" : ""
      }`;
      fromSel.appendChild(opt);
    });
    if (current && available[current]) fromSel.value = current;
  }

  // --- LOGICA DE DISTRIBUIÇÃO JUSTA (NO CLIQUE) - EXÓTICAS ---
  function displayExoticWarning(currencyCode, amount) {
    const currencyName = PAPER_RULES[currencyCode].name;
    const oldBuyBtn = getEl("buyBtn");

    resultCard.classList.remove("hidden");
    calcDetails.innerHTML = "";
    comparisonGrid.innerHTML = "";

    resultValue.textContent = "Consulta";
    const now = new Date();
    quoteTime.innerHTML = `<i class="ph-bold ph-warning"></i> Moeda Exótica - Cotação: ${now.toLocaleDateString()} às ${now.toLocaleTimeString()}`;

    calcDetails.innerHTML = `
            <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
                <div class="text-sm font-bold text-yellow-800 flex items-center gap-2">
                    <i class="ph-bold ph-warning-circle text-xl"></i> Cotação especial necessária
                </div>
                <p class="text-sm text-yellow-700">O ${currencyName} é uma moeda exótica e sua taxa é ajustada mediante consulta.</p>
                <p class="text-xs text-yellow-700 font-semibold">Valor desejado: ${amount} ${currencyCode}</p>
            </div>
        `;

    oldBuyBtn.outerHTML = `
            <button id="buyBtn" 
               class="group mt-4 w-full h-14 px-4 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2">
               <i class="ph-bold ph-whatsapp-logo text-xl"></i> Falar com Especialista
            </button>
        `;

    const newBtn = getEl("buyBtn");
    newBtn.onclick = (e) => {
      e.preventDefault();
      const randomIndex = Math.random() < 0.5 ? 0 : 1;
      const selectedOperator = OPERATORS[randomIndex];
      const link = getWhatsAppLinkForExotic(
        currencyCode,
        amount,
        selectedOperator
      );
      window.open(link, "_blank");

      // SOLUÇÃO DE ESTABILIDADE: RECARREGA A PÁGINA APÓS AÇÃO
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Dá tempo para o WhatsApp abrir antes de recarregar
    };
  }

  function updateDisplayConversion() {
    const from = fromSel.value;
    const amount = parseFloat(amountInput.value);
    if (!currentMode || !from || !amount || amount <= 0) {
      resultCard.classList.add("hidden");
      return;
    }

    const isExotic = PAPER_RULES[from] && PAPER_RULES[from].isExotic;
    if (isExotic && currentMode === "papel") {
      displayExoticWarning(from, amount);
      return;
    }

    restoreBuyBtn();
    const validation = validatePaperAmount(from, amount);
    if (!validation.valid) {
      showError(validation.msg);
      resultCard.classList.add("hidden");
      return;
    }

    const res = calculateConversion(currentMode, from, amount);
    currentQuote = res;

    resultCard.classList.remove("hidden");
    resultCard.classList.add("fade-in");
    resultValue.textContent = formatBRL(res.totalBRL);

    if (quoteTime)
      quoteTime.innerHTML = `<i class="ph-bold ph-clock"></i> Cotação: ${res.time.toLocaleDateString()} às ${res.time.toLocaleTimeString()}`;

    // Detalhes mostrados na tela principal (abaixo do valor)
    if (calcDetails) {
      calcDetails.innerHTML = `
            <div class="flex justify-between text-sm border-b pb-2 mb-2">
                <span class="text-gray-600 flex items-center gap-1">Valor Líquido <span class="tooltip"><i class="ph-bold ph-info"></i><span class="tooltiptext">Valor total convertido sem impostos</span></span></span>
                <span class="font-mono">${formatBRL(res.conversionBase)}</span>
            </div>
            <div class="flex justify-between text-sm border-b pb-2 mb-2">
                <span class="text-gray-600 flex items-center gap-1">Cotação Turismo<span class="tooltip"><i class="ph-bold ph-info"></i><span class="tooltiptext">Valor unitário da moeda sem impostos</span></span></span>
                <span class="font-mono">R$ ${formatRate(res.cotaçãoBase)}</span>
            </div>
            <div class="flex justify-between text-sm border-b pb-2 mb-2">
                <span class="text-gray-600 flex items-center gap-1">IOF (${(
                  res.iofRate * 100
                )
                  .toFixed(2)
                  .replace(
                    ".",
                    ","
                  )}%) <span class="tooltip"><i class="ph-bold ph-info"></i><span class="tooltiptext">Imposto obrigatório</span></span></span>
                <span class="font-mono">${formatBRL(res.totalIOFValue)}</span>
            </div>
            <div class="flex justify-between text-sm pt-1">
                <span class="text-gray-600 flex items-center gap-1">Taxa VET Unitária <span class="tooltip"><i class="ph-bold ph-info"></i><span class="tooltiptext">Custo final por unidade</span></span></span>
                <span class="font-mono font-bold text-[#d6c07a]">R$ ${formatRate(
                  res.VET
                )}</span>
            </div>
        `;
    }
    updateComparison(from, amount);
  }

  function updateComparison(currency, amount) {
    comparisonGrid.innerHTML = "";
    ["papel", "cartao"].forEach((mode) => {
      const res = calculateConversion(mode, currency, amount);
      const isCurrent = mode === currentMode;
      const titleText = mode === "papel" ? "Papel Moeda" : "Cartão Pré-pago";
      const icon =
        mode === "papel"
          ? `<i class="ph-bold ph-money text-xl"></i>`
          : `<i class="ph-bold ph-credit-card text-xl"></i>`;
      const borderClass = isCurrent
        ? "border-[#d6c07a] bg-[#fffdf5] ring-1 ring-[#d6c07a]/20 shadow-md"
        : "border-gray-200 bg-white hover:border-gray-300";

      if (PAPER_RULES[currency]?.isExotic && mode === "papel") return;

      const div = document.createElement("div");
      div.className = `p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${borderClass}`;

      if (res) {
        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="font-bold text-gray-800 flex items-center gap-2">
                    ${icon} ${titleText}
                </div>
                ${
                  isCurrent
                    ? '<span class="text-[10px] font-bold text-[#d6c07a] bg-[#d6c07a]/10 px-2 py-1 rounded uppercase tracking-wider">Selecionado</span>'
                    : ""
                }
            </div>
            <div class="text-3xl font-extrabold text-gray-800 mb-6 tracking-tight">${formatBRL(
              res.totalBRL
            )}</div>
            <div class="space-y-2 text-xs text-gray-500 border-t border-gray-100 pt-4">
                <div class="flex justify-between items-center"><span>Valor Líquido</span><span class="font-mono text-gray-700">${formatBRL(
                  res.conversionBase
                )}</span></div>
                <div class="flex justify-between items-center"><span>Cotação Turismo</span><span class="font-mono text-gray-700">R$ ${formatRate(
                  res.cotaçãoBase
                )}</span></div>
                <div class="flex justify-between items-center"><span>IOF (${(
                  res.iofRate * 100
                )
                  .toFixed(2)
                  .replace(
                    ".",
                    ","
                  )}%)</span><span class="font-mono text-gray-700">${formatBRL(
          res.totalIOFValue
        )}</span></div>
                <div class="flex justify-between items-center text-xs text-gray-500"><span>Taxa VET Un.</span><span class="font-mono text-gray-700">R$ ${formatRate(
                  res.VET
                )}</span></div>
            </div>
        `;
        div.onclick = () => {
          if (!isCurrent) setMode(mode);
        };
      } else {
        div.innerHTML = `<div class="font-bold text-gray-500 mb-2 flex items-center gap-2">${icon} ${titleText}</div><div class="text-sm text-red-400 bg-red-50 p-2 rounded">Indisponível no momento</div>`;
      }
      comparisonGrid.appendChild(div);
    });
  }

  // ---------- EVENTO PRINCIPAL DE CLICK ----------
  if (convertBtn)
    convertBtn.onclick = async () => {
      if (!currentMode) return showError("Selecione Papel ou Cartão.");
      if (!fromSel.value || !amountInput.value)
        return showError("Preencha os campos.");
      const originalText = convertBtn.innerText;
      convertBtn.innerText = "Atualizando...";
      convertBtn.disabled = true;
      await fetchSheetRates();
      updateDisplayConversion();
      convertBtn.innerText = originalText;
      convertBtn.disabled = false;
    };

  if (clearBtn)
    clearBtn.onclick = () => {
      // SOLUÇÃO DE ESTABILIDADE: RECARREGA A PÁGINA
      window.location.reload();
    };

  function showError(msg) {
    if (errorMsg) {
      errorMsg.innerHTML = `<i class="ph-bold ph-warning-circle"></i> ${msg}`;
      errorMsg.classList.remove("hidden");
      setTimeout(() => errorMsg.classList.add("hidden"), 5000);
    } else alert(msg);
  }

  // ---------- MODAL (COM TOGGLE E NOVA UI) ----------
  function openModal() {
    if (!currentQuote) return showError("Faça uma cotação antes.");

    // Atualiza os valores simples
    modalCurrencyAmount.textContent = currentQuote.amount.toLocaleString(
      "pt-BR",
      { minimumFractionDigits: 2 }
    );
    modalCurrencyCode.textContent = currentQuote.currencyCode;
    modalTotalBRL.textContent = formatBRL(currentQuote.totalBRL);

    // 1. INJEÇÃO DAS TAXAS (Escondidas por padrão com Toggle)
    if (modalDetails) {
      const iofPct = (currentQuote.iofRate * 100).toFixed(2).replace(".", ",");

      modalDetails.innerHTML = `
            <button type="button" id="toggleRatesBtn" class="text-[10px] uppercase font-bold text-gray-400 hover:text-[#d6c07a] flex items-center justify-end gap-1 w-full transition-colors focus:outline-none">
                Ver taxas <i id="toggleIcon" class="ph-bold ph-caret-down"></i>
            </button>
            
            <div id="ratesContainer" class="hidden mt-2 pt-2 border-t border-[#d6c07a]/10 text-xs space-y-1">
                <div class="flex justify-between text-gray-500">
                    <span>Cotação Base:</span>
                    <span class="font-mono">R$ ${formatRate(
                      currentQuote.cotaçãoBase
                    )}</span>
                </div>
                <div class="flex justify-between text-gray-500">
                    <span>IOF (${iofPct}%):</span>
                    <span class="font-mono">${formatBRL(
                      currentQuote.totalIOFValue
                    )}</span>
                </div>
                <div class="flex justify-between text-gray-800 font-semibold mt-1 pt-1 border-t border-dashed border-gray-200">
                    <span>VET Final:</span>
                    <span class="font-mono text-[#d6c07a]">R$ ${formatRate(
                      currentQuote.VET
                    )}</span>
                </div>
            </div>
        `;

      // Lógica do Toggle (Clique)
      const btn = document.getElementById("toggleRatesBtn");
      const container = document.getElementById("ratesContainer");
      const icon = document.getElementById("toggleIcon");

      if (btn && container) {
        btn.onclick = () => {
          container.classList.toggle("hidden");
          if (container.classList.contains("hidden")) {
            btn.innerHTML = `Ver taxas <i class="ph-bold ph-caret-down"></i>`;
          } else {
            btn.innerHTML = `Ocultar taxas <i class="ph-bold ph-caret-up"></i>`;
          }
        };
      }
    }

    // 2. INJEÇÃO DAS INFORMAÇÕES DA OPERAÇÃO (Entre Resumo e Form)
    if (operationalInfo) {
      operationalInfo.innerHTML = `
            <div class="bg-gray-100 p-4 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-2 text-justify">
                <p class="font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <i class="ph-bold ph-info"></i> Informações Importantes:
                </p>
                <p>1. O <strong>VET (Valor Efetivo Total)</strong> representa o custo final, incluindo câmbio, impostos (IOF) e tarifas.</p>
                <p>2. A operação está sujeita a confirmação de dados e disponibilidade de estoque.</p>
                <p>3. É obrigatório o envio de documento válido (RG/RNE ou CNH) para seguir com a operação.</p>
                <p>4. Valores/taxas sujeitos a alteração até o fechamento efetivo da operação com um de nossos operadores.</p>
                <p>5. Câmbio Delivery: independente do tipo de operação (Papel-moeda ou Cartão Pré-pago), há uma tarifa de 30 reais para entregas abaixo de USD 500,00 (ou equivalente em outras moedas).</p>
            </div>
        `;
    }

    budgetForm.classList.remove("hidden");
    successStep.classList.add("hidden");
    budgetModal.classList.remove("hidden");
  }

  function closeModal() {
    budgetModal.classList.add("hidden");
  }

  if (buyBtn)
    buyBtn.onclick = (e) => {
      e.preventDefault();
      openModal();
    };
  if (closeModalBtn) closeModalBtn.onclick = closeModal;
  window.onclick = (e) => {
    if (e.target == budgetModal) closeModal();
  };

  // ---------- INTEGRAÇÃO FINAL: EMAILJS ----------
  if (budgetForm) {
    budgetForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = clientName.value;
      const phone = clientPhone.value;
      const email = getEl("clientEmail").value;

      if (!name || !phone || !email || !currentQuote) {
        showError(
          "Por favor, preencha todos os campos de contato e faça uma cotação."
        );
        return;
      }

      const btn = budgetForm.querySelector('button[type="submit"]');
      const originalContent = btn.innerHTML;
      btn.innerHTML = `<i class="ph-bold ph-spinner animate-spin text-xl"></i> Enviando...`;
      btn.disabled = true;

      try {
        const isDelivery =
          deliveryCheck && deliveryCheck.checked ? "SIM" : "NÃO";

        // --- Captura Data e Hora para o Recibo ---
        const now = new Date();
        const dataHoraFormatada = now.toLocaleString("pt-BR");

        // 1. Prepara os dados base
        let templateParams = {
          currency_amount: currentQuote.amount.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          }),
          currency_code: currentQuote.currencyCode,

          // --- CAMPOS ADICIONAIS PARA EMAIL ---
          quote_date: dataHoraFormatada, // Data formatada
          exchange_rate: formatRate(currentQuote.cotaçãoBase), // Taxa Turismo
          iof_value: formatBRL(currentQuote.totalIOFValue), // Valor do IOF
          // --------------------------------

          vet_rate: formatRate(currentQuote.VET),
          total_brl: formatBRL(currentQuote.totalBRL),
          operation_type:
            currentQuote.mode === "papel" ? "Papel Moeda" : "Cartão Pré-pago",

          client_name: name,
          client_email: email,
          client_phone: phone,
          client_cpf: getEl("clientCPF").value,
          client_rg: getEl("clientRG").value,
          client_birth: getEl("clientBirth").value,
          client_birth_city: getEl("clientBirthCity").value,
          client_mother: getEl("clientMother").value,
          client_job: getEl("clientJob").value,
          client_cep: getEl("clientCEP").value,
          client_address: getEl("clientAddress").value,
          delivery_needed: isDelivery,
          delivery_address:
            isDelivery === "SIM" ? getEl("deliveryAddress").value : "—",
          delivery_cep: isDelivery === "SIM" ? getEl("deliveryCEP").value : "—",
          obs_documento:
            "Cliente anexou arquivo no formulário. Chamar no WhatsApp para conferência.",
        };

        // 2. Processa o Arquivo (Mantendo a lógica de limite 50kb)
        const fileInput = getEl("dropzone-file");
        if (fileInput.files.length > 0) {
          const file = fileInput.files[0];
          if (file.size < 50000) {
            // Limite de 50KB para envio via JS puro
            const reader = new FileReader();
            const filePromise = new Promise((resolve) => {
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
            });
            reader.readAsDataURL(file);

            // Adiciona o anexo DENTRO dos parâmetros
            const base64Data = (await filePromise).split(",")[1];
            templateParams.content = base64Data;
            templateParams.attachment = base64Data;
          } else {
            // Arquivo grande: Avisa no email do Admin
            templateParams.obs_documento = `ATENÇÃO: Arquivo (${
              file.name
            } - ${Math.round(
              file.size / 1024
            )}KB) muito grande para anexo direto. Cliente enviará via WhatsApp.`;
          }
        }

        // 3. Envia para o ADMIN (Conversor -> Contato)
        const sendAdmin = emailjs.send(
          SERVICE_ID,
          TEMPLATE_ADMIN,
          templateParams
        );

        // 4. Envia para o CLIENTE (Conversor -> Cliente)
        const sendClient = emailjs.send(SERVICE_ID, TEMPLATE_CLIENTE, {
          ...templateParams,
          to_email: email,
        });

        await Promise.all([sendAdmin, sendClient]);

        budgetForm.classList.add("hidden");
        successStep.classList.remove("hidden");
        setupFinalWhats(name);

        // **********************************************
        // NOTA: A RECARGA DA PÁGINA AGORA ACONTECE APÓS O CLIENTE CLICAR NO BOTÃO FINAL DO WHATSAPP (dentro de setupFinalWhats)
        // Isso garante que ele veja a mensagem de sucesso e o botão, mas reseta o estado em seguida.
        // **********************************************
      } catch (error) {
        console.error("❌ Erro envio", error);
        budgetForm.classList.add("hidden");
        successStep.classList.remove("hidden");
        showError(
          "Houve um erro no envio do e-mail de notificação interna. Por favor, chame no WhatsApp."
        );
        setupFinalWhats(name);
      } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
      }
    };
  }

  // --- 2. LÓGICA DE DISTRIBUIÇÃO JUSTA (FINAL DO FORM) ---
  function setupFinalWhats(name) {
    if (!finalWhatsAppBtn || !currentQuote) return;

    finalWhatsAppBtn.onclick = () => {
      const randomIndex = Math.random() < 0.5 ? 0 : 1;
      const selectedOperator = OPERATORS[randomIndex];
      const modeText =
        currentQuote.mode === "papel" ? "Papel Moeda 💵" : "Cartão 💳";
      const iofPercentage = (currentQuote.iofRate * 100)
        .toFixed(2)
        .replace(".", ",");

      // --- Verifica se tem arquivo grande anexado para ajustar a mensagem do Whats ---
      const fileInput = getEl("dropzone-file");
      let docMessage = "";

      if (fileInput && fileInput.files.length > 0) {
        if (fileInput.files[0].size > 50000) {
          docMessage = `\n\n*⚠️ ATENÇÃO: Enviarei a foto do meu documento por aqui ou pelo e-mail conversor@maconsultoriacambio.com.br (o arquivo era muito grande).*`;
        } else {
          docMessage = `\n\n*✅ Meu documento já foi anexado no e-mail.*`;
        }
      }

      const msg =
        `Olá, M&A Consultoria Câmbio! Meu nome é *${name}*.\n` +
        `Acabei de enviar meus dados pelo Site.\n\n` +
        `Gostaria de prosseguir com a operação:\n\n` +
        `*MODALIDADE: ${modeText}*\n` +
        `*VALOR: ${currentQuote.amount} ${currentQuote.currencyCode}*\n` +
        `- Cotação Turismo: R$ ${formatRate(currentQuote.cotaçãoBase)}\n` +
        `- IOF: ${iofPercentage}%\n\n` +
        `*👉🏻 TOTAL A PAGAR: ${formatBRL(currentQuote.totalBRL)}*` +
        `${docMessage}`; // Adiciona a observação do documento

      window.open(
        `https://api.whatsapp.com/send?phone=${selectedOperator}&text=${encodeURIComponent(
          msg
        )}`,
        "_blank"
      );

      // SOLUÇÃO DE ESTABILIDADE: RECARREGA A PÁGINA APÓS AÇÃO
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Dá tempo para o WhatsApp abrir antes de recarregar
    };
  }

  // UX: Máscaras e File Input (Mantidos intactos)
  const maskInputs = () => {
    const cpfInput = getEl("clientCPF");
    const phoneInput = getEl("clientPhone");
    const cepInput = getEl("clientCEP");
    const deliveryCepInput = getEl("deliveryCEP");
    const applyMask = (input, maskFunction) => {
      if (!input) return;
      input.addEventListener("input", (e) => {
        e.target.value = maskFunction(e.target.value);
      });
    };
    const masks = {
      cpf: (v) =>
        v
          .replace(/\D/g, "")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d{1,2})/, "$1-$2")
          .replace(/(-\d{2})\d+?$/, "$1"),
      phone: (v) =>
        v
          .replace(/\D/g, "")
          .replace(/^(\d{2})(\d)/g, "($1) $2")
          .replace(/(\d)(\d{4})$/, "$1-$2"),
      cep: (v) =>
        v
          .replace(/\D/g, "")
          .replace(/^(\d{5})(\d)/, "$1-$2")
          .substring(0, 9),
    };
    applyMask(cpfInput, masks.cpf);
    applyMask(phoneInput, masks.phone);
    applyMask(cepInput, masks.cep);
    if (deliveryCepInput) applyMask(deliveryCepInput, masks.cep);
  };
  maskInputs();

  // UX: Visualização do Arquivo (Com aviso de tamanho)
  const fileInput = getEl("dropzone-file");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const labelContainer = fileInput.closest("label");
      const icon = labelContainer.querySelector("i");
      const textMain = labelContainer.querySelector("p.text-sm");
      const textSub = labelContainer.querySelector("p.text-xs");

      if (file) {
        // Verifica se é maior que 50KB (50 * 1024 = 51200 bytes aprox, usarei 50000 para margem)
        const isBigFile = file.size > 50000;

        if (isBigFile) {
          // ARQUIVO GRANDE: Laranja + Aviso para mandar no Whats
          labelContainer.classList.add("border-orange-400", "bg-orange-50");
          labelContainer.classList.remove(
            "border-gray-300",
            "bg-gray-50",
            "border-[#d6c07a]",
            "bg-[#fffdf5]"
          );

          icon.className =
            "ph-bold ph-warning-circle text-3xl text-orange-500 mb-2";
          textMain.innerHTML = `<span class="font-bold text-gray-800">${file.name}</span>`;
          textSub.innerHTML = `<span class="text-orange-600 font-bold">Arquivo pesado. Envie o arquivo pelo WhatsApp após confirmar solicitação.</span>`;
        } else {
          // ARQUIVO LEVE: Verde/Dourado + Aviso de sucesso
          labelContainer.classList.add("border-[#d6c07a]", "bg-[#fffdf5]");
          labelContainer.classList.remove(
            "border-gray-300",
            "bg-gray-50",
            "border-orange-400",
            "bg-orange-50"
          );

          icon.className =
            "ph-fill ph-check-circle text-3xl text-[#d6c07a] mb-2";
          textMain.innerHTML = `<span class="font-bold text-gray-800">${file.name}</span>`;
          textSub.textContent = "Arquivo pronto para envio automático";
        }
      } else {
        // RESET (Nenhum arquivo)
        labelContainer.classList.remove(
          "border-[#d6c07a]",
          "bg-[#fffdf5]",
          "border-orange-400",
          "bg-orange-50"
        );
        labelContainer.classList.add("border-gray-300", "bg-gray-50");
        icon.className =
          "ph-bold ph-cloud-arrow-up text-3xl text-gray-400 mb-2";
        textMain.innerHTML = `<span class="font-semibold">Clique para enviar</span> CNH ou RG/RNE (Frente/Verso)`;
        textSub.textContent = "PDF, JPG ou PNG";
      }
    });
  }
});
