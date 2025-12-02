document.addEventListener("DOMContentLoaded", () => {
  console.log("🟢 Script iniciado. DOM carregado.");
  const SPREADSHEET_ID = "1BvDKkVQAzH3kZkuhxxqbLjwIvG3MEB-YCWrI3H0NcX4";
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
  const IOF_RATE = 0.035;
  const UPDATE_INTERVAL_SECONDS = 600;
  const SERVICE_ID = "service_vfriyz8";
  const TEMPLATE_ADMIN = "template_9fzmu0n";
  const TEMPLATE_CLIENTE = "template_u5saecn";
  const OPERATORS = ["5511953505626", "5511938059556"];
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
    NZD: { minStep: 100, notes: "100" },
    AED: { isExotic: !0, name: "Dirham (AED)" },
    CNY: { isExotic: !0, name: "Iuan (CNY)" },
    PEN: { isExotic: !0, name: "Novo Sol (PEN)" },
    ARS: { isExotic: !0, name: "Peso Argentino (ARS)" },
    COP: { isExotic: !0, name: "Peso Colombiano (COP)" },
    ZAR: { isExotic: !0, name: "Rand (ZAR)" },
  };
  const CARD_RULES = { MIN_NEW_USD: 100, MIN_RELOAD_USD: 50 };
  const getEl = (id) => document.getElementById(id);
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
  const buyBtn = getEl("buyBtn");
  const budgetModal = getEl("budgetModal");
  const closeModalBtn = getEl("closeModalBtn");
  const budgetForm = getEl("budgetForm");
  const successStep = getEl("successStep");
  const finalWhatsAppBtn = getEl("finalWhatsAppBtn");
  const modalCurrencyAmount = getEl("modalCurrencyAmount");
  const modalCurrencyCode = getEl("modalCurrencyCode");
  const modalTotalBRL = getEl("modalTotalBRL");
  const modalDetails = getEl("modalDetails");
  const operationalInfo = getEl("operationalInfo");
  const clientName = getEl("clientName");
  const clientPhone = getEl("clientPhone");
  const deliveryCheck = getEl("deliveryCheck");
  const deliveryFields = getEl("deliveryFields");
  const originalBuyBtnHTML = buyBtn ? buyBtn.outerHTML : null;
  if (deliveryCheck) {
    deliveryCheck.addEventListener("change", function () {
      if (this.checked) {
        deliveryFields.classList.remove("hidden");
        getEl("deliveryCEP").required = !0;
        getEl("deliveryAddress").required = !0;
      } else {
        deliveryFields.classList.add("hidden");
        getEl("deliveryCEP").required = !1;
        getEl("deliveryAddress").required = !1;
      }
    });
  }
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
  let ratesPapel = {};
  let ratesCartao = {};
  let currentMode = "";
  let available = {};
  let lastFetchTime = null;
  let countdownInterval;
  let currentQuote = null;
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
      CNY: "cn",
      PEN: "pe",
      ARS: "ar",
      COP: "co",
      ZAR: "za",
      BRL: "br",
    };
    const countryCode = countryMap[currencyCode];
    return countryCode
      ? `<img src="https://flagcdn.com/24x18/${countryCode}.png" alt="${currencyCode}" class="w-5 h-auto shadow-sm inline-block mr-1.5 align-middle">`
      : "";
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
    const msg = `Olá, M&A Consultoria Câmbio! Tenho interesse na moeda exótica *${currencyCode}*.\nQuantidade: *${amount}*.\n\nPor favor, me ajude com a cotação.`;
    return `https://api.whatsapp.com/send?phone=${operator}&text=${encodeURIComponent(
      msg
    )}`;
  }
  async function fetchSheetRates() {
    if (dataStatus)
      dataStatus.innerHTML = `<i class="ph-bold ph-spinner animate-spin"></i> Carregando...`;
    try {
      const res = await fetch(SHEET_URL);
      const text = await res.text();
      const m = text.match(/setResponse\((.*)\);/);
      if (!m) throw new Error("Erro de leitura do Google Sheets");
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
        if (m && v) {
          ratesPapel[String(m).trim()] = {
            raw: Number(v),
            display: r.c[8].f || String(v),
          };
        }
      }
      Object.keys(PAPER_RULES).forEach((code) => {
        if (PAPER_RULES[code].isExotic && !ratesPapel[code]) {
          ratesPapel[code] = { isExotic: !0, raw: 0, display: "Consulta" };
        }
      });
      for (let i = 1; i <= 7; i++) {
        const r = rows[i];
        if (!r) continue;
        const m = r.c[9]?.v;
        const v = r.c[10]?.v;
        if (m && v) {
          ratesCartao[String(m).trim()] = {
            raw: Number(v),
            display: r.c[10].f || String(v),
          };
        }
      }
      if (dataStatus) {
        dataStatus.innerHTML = `<i class="ph-bold ph-check-circle"></i> Atualizado`;
        setTimeout(() => dataStatus.classList.add("hidden"), 1500);
      }
      if (currentMode) {
        available = currentMode === "papel" ? ratesPapel : ratesCartao;
        populateCurrencyList();
      }
      if (resultCard && !resultCard.classList.contains("hidden")) {
        console.log("🔄 Recalculando valores na tela com novas taxas...");
        updateDisplayConversion();
      }
      startUpdateTimer();
    } catch (err) {
      console.error("❌ Erro crítico ao buscar taxas:", err);
      ratesPapel = {};
      ratesCartao = {};
      if (dataStatus) {
        dataStatus.className =
          "text-xs text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full border border-red-200 flex items-center gap-1 animate-pulse";
        dataStatus.innerHTML = `<i class="ph-bold ph-warning-circle"></i> Sistema Indisponível`;
        dataStatus.classList.remove("hidden");
      }
      if (resultCard) resultCard.classList.add("hidden");
      if (comparisonGrid) comparisonGrid.innerHTML = "";
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
      lastUpdate.textContent = `${lastFetchTime.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })} às ${lastFetchTime.toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })}`;
    if (nextUpdate) {
      if (remaining <= 0) {
        nextUpdate.textContent = "Atualizando...";
        clearInterval(countdownInterval);
        fetchSheetRates();
      } else {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        nextUpdate.textContent = `${m}:${s.toString().padStart(2, "0")}`;
      }
    }
  }
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
  function isBankHoliday(dateObj) {
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    const dateStr = `${day}/${month}`;
    const fixedHolidays = [
      "1/1",
      "21/4",
      "1/5",
      "9/7",
      "7/9",
      "12/10",
      "2/11",
      "15/11",
      "20/11",
      "25/12",
      "31/12",
    ];
    if (fixedHolidays.includes(dateStr)) return !0;
    if (month === 12) {
      let lastDayYear = new Date(year, 11, 31);
      while (lastDayYear.getDay() === 0 || lastDayYear.getDay() === 6) {
        lastDayYear.setDate(lastDayYear.getDate() - 1);
      }
      if (day === lastDayYear.getDate()) return !0;
    }
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
    const easterDay = ((h + l - 7 * m + 114) % 31) + 1;
    const checkMoveable = (diffDays) => {
      const target = new Date(year, easterMonth - 1, easterDay);
      target.setDate(target.getDate() + diffDays);
      return target.getDate() === day && target.getMonth() + 1 === month;
    };
    if (checkMoveable(-48)) return !0;
    if (checkMoveable(-47)) return !0;
    if (checkMoveable(-2)) return !0;
    if (checkMoveable(60)) return !0;
    return !1;
  }
  function isMarketOpen() {
    const nowSP = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
    );
    const day = nowSP.getDay();
    if (day === 0 || day === 6) return !1;
    if (isBankHoliday(nowSP)) return !1;
    const hour = nowSP.getHours();
    const minutes = nowSP.getMinutes();
    if (hour < 9) return !1;
    if (hour >= 18) return !1;
    if (hour === 9 && minutes < 30) return !1;
    return !0;
  }
  function validatePaperAmount(currency, amount) {
    if (currentMode !== "papel") return { valid: !0 };
    const rule = PAPER_RULES[currency];
    if (!rule || rule.isExotic) return { valid: !0 };
    if (amount % rule.minStep !== 0) {
      return {
        valid: !1,
        msg: `Para ${currency} em Papel, o valor deve ser múltiplo de ${rule.minStep}. (Notas disponíveis: ${rule.notes})`,
      };
    }
    return { valid: !0 };
  }
  function validateCardAmount(currency, amount) {
    if (currentMode !== "cartao") return { valid: !0 };
    if (!ratesCartao.USD || !ratesCartao[currency]) return { valid: !0 };
    const rateUSD = ratesCartao.USD.raw;
    const rateTarget = ratesCartao[currency].raw;
    const minReloadTarget = (CARD_RULES.MIN_RELOAD_USD * rateUSD) / rateTarget;
    const minNewTarget = (CARD_RULES.MIN_NEW_USD * rateUSD) / rateTarget;
    const minReloadDisplay = minReloadTarget.toFixed(2);
    const minNewDisplay = minNewTarget.toFixed(2);
    if (amount < minReloadTarget) {
      return {
        valid: !1,
        msg: `O valor mínimo para recarga é de USD ${CARD_RULES.MIN_RELOAD_USD} (aprox. ${currency} ${minReloadDisplay}).`,
      };
    }
    if (amount >= minReloadTarget && amount < minNewTarget) {
      return {
        valid: !0,
        isReloadOnly: !0,
        warningMsg: `Atenção: Valores abaixo de USD ${CARD_RULES.MIN_NEW_USD} (aprox. ${currency} ${minNewDisplay}) são permitidos apenas para RECARGA de cartão existente.`,
      };
    }
    return { valid: !0, isReloadOnly: !1 };
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
  function setMode(mode) {
    if (Object.keys(ratesPapel).length === 0) {
      fetchSheetRates().then(() => setModeUI(mode));
    } else {
      setModeUI(mode);
    }
  }
  function setModeUI(mode) {
    currentMode = mode;
    available = mode === "papel" ? ratesPapel : ratesCartao;
    const activeClass =
      "flex-1 px-4 py-2 rounded-lg btn-primary font-semibold text-gray-900 text-sm transition-all flex items-center justify-center gap-2";
    const inactiveClass =
      "flex-1 px-4 py-2 rounded-lg border bg-white font-semibold text-gray-500 text-sm transition-all flex items-center justify-center gap-2";
    if (btnPapel)
      btnPapel.className = mode === "papel" ? activeClass : inactiveClass;
    if (btnCartao)
      btnCartao.className = mode === "cartao" ? activeClass : inactiveClass;
    populateCurrencyList();
    fillSelector();
    updateInputHelper();
    const currentCurrency = fromSel.value;
    if (currentCurrency && available[currentCurrency] && amountInput.value) {
      highlightSelectedCurrency(currentCurrency);
      updateDisplayConversion();
    } else if (
      currentCurrency &&
      currentMode === "papel" &&
      PAPER_RULES[currentCurrency]?.isExotic &&
      amountInput.value
    ) {
      highlightSelectedCurrency(currentCurrency);
      updateDisplayConversion();
    } else {
      resultCard.classList.add("hidden");
      comparisonGrid.innerHTML = "";
      restoreBuyBtn();
    }
  }
  function restoreBuyBtn() {
    const currentBuyBtn = getEl("buyBtn");
    if (currentBuyBtn && originalBuyBtnHTML) {
      currentBuyBtn.outerHTML = originalBuyBtnHTML;
      window.buyBtn = getEl("buyBtn");
      if (window.buyBtn) {
        window.buyBtn.onclick = (e) => {
          e.preventDefault();
          openModal();
        };
      }
    }
    const w = document.getElementById("closedWarning");
    if (w) w.remove();
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
      btn.innerHTML = `<div class="text-sm font-medium flex items-center text-gray-800">${getFlagElement(
        code
      )} ${code}</div><div class="text-xs ${
        isExoticDisplay ? "text-red-500" : "text-gray-500"
      } mt-1">${rateDisplay}</div>`;
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
    fromSel.disabled = !0;
    fromSel.innerHTML =
      '<option value="" disabled selected>Selecione...</option>';
    Object.keys(available).forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = `${getFlagEmoji(code)} ${code}`;
      fromSel.appendChild(opt);
    });
    if (current && available[current]) fromSel.value = current;
  }
  function displayExoticWarning(currencyCode, amount) {
    const currencyName = PAPER_RULES[currencyCode].name;
    const oldBuyBtn = getEl("buyBtn");
    resultCard.classList.remove("hidden");
    calcDetails.innerHTML = "";
    comparisonGrid.innerHTML = "";
    resultValue.textContent = "Consulta";
    const now = new Date();
    quoteTime.innerHTML = `<i class="ph-bold ph-warning"></i> Moeda Exótica - Cotação: ${now.toLocaleDateString(
      "pt-BR",
      { timeZone: "America/Sao_Paulo" }
    )} às ${now.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    })}`;
    calcDetails.innerHTML = `<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3"><div class="text-sm font-bold text-yellow-800 flex items-center gap-2"><i class="ph-bold ph-warning-circle text-xl"></i> Cotação especial necessária</div><p class="text-sm text-yellow-700">O ${currencyName} é uma moeda exótica e sua taxa é ajustada mediante consulta.</p><p class="text-xs text-yellow-700 font-semibold">Valor desejado: ${amount} ${currencyCode}</p></div>`;
    oldBuyBtn.outerHTML = `<button id="buyBtn" class="group mt-4 w-full h-14 px-4 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2"><i class="ph-bold ph-whatsapp-logo text-xl"></i> Falar com Especialista</button>`;
    const newBtn = getEl("buyBtn");
    newBtn.onclick = (e) => {
      e.preventDefault();
      const randomIndex = Math.random() < 0.5 ? 0 : 1;
      window.open(
        getWhatsAppLinkForExotic(currencyCode, amount, OPERATORS[randomIndex]),
        "_blank"
      );
      setTimeout(() => window.location.reload(), 1000);
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
    const cardValidation = validateCardAmount(from, amount);
    if (!cardValidation.valid) {
      showError(cardValidation.msg);
      resultCard.classList.add("hidden");
      return;
    }
    if (cardValidation.isReloadOnly) {
      const warningDiv = document.getElementById("errorMsg");
      warningDiv.innerHTML = `<i class="ph-bold ph-warning"></i> ${cardValidation.warningMsg}`;
      warningDiv.className =
        "text-orange-600 text-sm mt-3 font-medium bg-orange-50 p-2 rounded border border-orange-100 fade-in block";
    } else {
      document.getElementById("errorMsg").classList.add("hidden");
    }
    const res = calculateConversion(currentMode, from, amount);
    currentQuote = res;
    resultCard.classList.remove("hidden");
    resultCard.classList.add("fade-in");
    resultValue.textContent = formatBRL(res.totalBRL);
    if (quoteTime)
      quoteTime.innerHTML = `<i class="ph-bold ph-clock"></i> Cotação: ${res.time.toLocaleDateString(
        "pt-BR",
        { timeZone: "America/Sao_Paulo" }
      )} às ${res.time.toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })}`;
    if (calcDetails) {
      calcDetails.innerHTML = `
        <div class="flex justify-between text-sm border-b pb-2 mb-2"><span class="text-gray-600 flex items-center gap-1">Valor Líquido <span class="tooltip"><i class="ph-bold ph-info"></i><span class="tooltiptext">Valor total convertido sem impostos</span></span></span><span class="font-mono">${formatBRL(
          res.conversionBase
        )}</span></div>
        <div class="flex justify-between text-sm border-b pb-2 mb-2"><span class="text-gray-600 flex items-center gap-1">Cotação Turismo<span class="tooltip"><i class="ph-bold ph-info"></i><span class="tooltiptext">Valor unitário da moeda sem impostos</span></span></span><span class="font-mono">R$ ${formatRate(
          res.cotaçãoBase
        )}</span></div>
        <div class="flex justify-between text-sm border-b pb-2 mb-2"><span class="text-gray-600 flex items-center gap-1">IOF (${(
          res.iofRate * 100
        )
          .toFixed(2)
          .replace(
            ".",
            ","
          )}%) <span class="tooltip"><i class="ph-bold ph-info"></i><span class="tooltiptext">Imposto obrigatório sobre Operações Financeiras</span></span></span><span class="font-mono">${formatBRL(
        res.totalIOFValue
      )}</span></div>
        <div class="flex justify-between text-sm pt-1"><span class="text-gray-600 flex items-center gap-1">Taxa VET Unitária <span class="tooltip"><i class="ph-bold ph-info"></i><span class="tooltiptext">Valor Efetivo Total - Inclui câmbio, IOF e todas as taxas aplicáveis</span></span></span><span class="font-mono font-bold text-[#d6c07a]">R$ ${formatRate(
          res.VET
        )}</span></div>`;
    }
    updateComparison(from, amount);
    const isOpen = isMarketOpen();
    const btnSolicitar = document.getElementById("buyBtn");
    const newBtn = btnSolicitar.cloneNode(!0);
    btnSolicitar.parentNode.replaceChild(newBtn, btnSolicitar);
    const existingWarning = document.getElementById("closedWarning");
    if (existingWarning) existingWarning.remove();
    if (!isOpen) {
      newBtn.className =
        "group mt-4 w-full h-14 px-4 rounded-xl bg-gray-400 cursor-not-allowed text-white font-bold text-lg shadow-none flex items-center justify-center gap-2";
      newBtn.innerHTML = `<i class="ph-bold ph-clock-afternoon"></i> Atendimento Encerrado`;
      newBtn.onclick = (e) => {
        e.preventDefault();
        alert(
          "Para solicitar e finalizar a compra da moeda, nosso atendimento funciona de Segunda a Sexta, das 09h30 às 18h00. Fora desse horário (período noturno), finais de semana e feriados, o sistema de solicitação permanece fechado."
        );
      };
      const warningBox = document.createElement("div");
      warningBox.id = "closedWarning";
      warningBox.className =
        "mt-3 text-center text-xs text-red-500 font-medium bg-red-50 p-2 rounded border border-red-100 animate-pulse";
      warningBox.innerHTML =
        "O mercado está fechado. Simulações liberadas, solicitações apenas em horário comercial.";
      newBtn.parentNode.appendChild(warningBox);
    } else {
      newBtn.className =
        "group mt-4 w-full h-14 px-4 rounded-xl bg-gold hover:bg-gold-hover text-gray-700 font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2";
      newBtn.innerHTML = `Solicitar Câmbio <i class="ph-bold ph-arrow-right text-xl transition-transform group-hover:translate-x-1.5"></i>`;
      newBtn.onclick = (e) => {
        e.preventDefault();
        openModal();
      };
    }
    window.buyBtn = newBtn;
  }
  function updateComparison(currency, amount) {
    comparisonGrid.innerHTML = "";
    ["papel", "cartao"].forEach((mode) => {
      if (PAPER_RULES[currency]?.isExotic && mode === "papel") return;
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
      const div = document.createElement("div");
      div.className = `p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${borderClass}`;
      if (res) {
        div.innerHTML = `
          <div class="flex justify-between items-start mb-4"><div class="font-bold text-gray-800 flex items-center gap-2">${icon} ${titleText}</div>${
          isCurrent
            ? '<span class="text-[10px] font-bold text-[#d6c07a] bg-[#d6c07a]/10 px-2 py-1 rounded uppercase tracking-wider">Selecionado</span>'
            : ""
        }</div>
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
          </div>`;
        div.onclick = () => {
          if (!isCurrent) setMode(mode);
        };
      } else {
        div.innerHTML = `<div class="font-bold text-gray-500 mb-2 flex items-center gap-2">${icon} ${titleText}</div><div class="text-sm text-red-400 bg-red-50 p-2 rounded">Indisponível no momento</div>`;
      }
      comparisonGrid.appendChild(div);
    });
  }
  if (convertBtn) {
    convertBtn.onclick = async () => {
      if (!currentMode) return showError("Selecione Papel ou Cartão.");
      if (!fromSel.value || !amountInput.value)
        return showError("Preencha os campos.");
      const originalText = convertBtn.innerText;
      convertBtn.innerText = "Atualizando...";
      convertBtn.disabled = !0;
      await fetchSheetRates();
      updateDisplayConversion();
      convertBtn.innerText = originalText;
      convertBtn.disabled = !1;
    };
  }
  if (clearBtn) clearBtn.onclick = () => window.location.reload();
  function showError(msg) {
    if (errorMsg) {
      errorMsg.innerHTML = `<i class="ph-bold ph-warning-circle"></i> ${msg}`;
      errorMsg.classList.remove("hidden");
      setTimeout(() => errorMsg.classList.add("hidden"), 5000);
    } else {
      alert(msg);
    }
  }
  function openModal() {
    if (!currentQuote) return showError("Faça uma cotação antes.");
    modalCurrencyAmount.textContent = currentQuote.amount.toLocaleString(
      "pt-BR",
      { minimumFractionDigits: 2 }
    );
    modalCurrencyCode.textContent = currentQuote.currencyCode;
    modalTotalBRL.textContent = formatBRL(currentQuote.totalBRL);
    if (modalDetails) {
      const iofPct = (currentQuote.iofRate * 100).toFixed(2).replace(".", ",");
      modalDetails.innerHTML = `
        <button type="button" id="toggleRatesBtn" class="text-[10px] uppercase font-bold text-gray-400 hover:text-[#d6c07a] flex items-center justify-end gap-1 w-full transition-colors focus:outline-none">Ver taxas <i id="toggleIcon" class="ph-bold ph-caret-down"></i></button>
        <div id="ratesContainer" class="hidden mt-2 pt-2 border-t border-[#d6c07a]/10 text-xs space-y-1">
          <div class="flex justify-between text-gray-500"><span>Cotação Base:</span><span class="font-mono">R$ ${formatRate(
            currentQuote.cotaçãoBase
          )}</span></div>
          <div class="flex justify-between text-gray-500"><span>IOF (${iofPct}%):</span><span class="font-mono">${formatBRL(
        currentQuote.totalIOFValue
      )}</span></div>
          <div class="flex justify-between text-gray-800 font-semibold mt-1 pt-1 border-t border-dashed border-gray-200"><span>VET Final:</span><span class="font-mono text-[#d6c07a]">R$ ${formatRate(
            currentQuote.VET
          )}</span></div>
        </div>`;
      const btn = document.getElementById("toggleRatesBtn");
      const container = document.getElementById("ratesContainer");
      if (btn && container) {
        btn.onclick = () => {
          container.classList.toggle("hidden");
          btn.innerHTML = container.classList.contains("hidden")
            ? `Ver taxas <i class="ph-bold ph-caret-down"></i>`
            : `Ocultar taxas <i class="ph-bold ph-caret-up"></i>`;
        };
      }
    }
    if (operationalInfo) {
      operationalInfo.innerHTML = `<div class="bg-gray-100 p-4 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-2 text-justify"><p class="font-bold text-gray-700 mb-1 flex items-center gap-1"><i class="ph-bold ph-info"></i> Informações Importantes:</p><p>1. O VET (Valor Efetivo Total) representa o custo final, incluindo câmbio, impostos (IOF) e tarifas.</p><p>2. A operação está sujeita a disponibilidade de estoque e validação de dados/documento de identificação (é obrigatório o envio de documento válido como RG, RNE ou CNH).</p><p>3. Valores/taxas sujeitos a alteração até o fechamento efetivo da operação com um de nossos operadores.</p><p>4. Câmbio Delivery: Grátis para operações acima de USD 500,00 (ou equivalente em outra moeda). Para valores menores, taxa de R$ 30,00 (consulte a cobertura do seu CEP e a disponibilidade diretamente com um especialista).</p></div>`;
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
  window.addEventListener("click", (e) => {
    if (e.target == budgetModal) closeModal();
  });
  if (budgetForm) {
    budgetForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = clientName.value;
      const phone = clientPhone.value;
      const email = getEl("clientEmail").value;
      if (!name || !phone || !email || !currentQuote)
        return showError("Por favor, preencha todos os campos.");
      const btn = budgetForm.querySelector('button[type="submit"]');
      const originalContent = btn.innerHTML;
      btn.innerHTML = `<i class="ph-bold ph-spinner animate-spin text-xl"></i> Enviando...`;
      btn.disabled = !0;
      try {
        const isDelivery =
          deliveryCheck && deliveryCheck.checked ? "SIM" : "NÃO";
        let templateParams = {
          currency_amount: currentQuote.amount.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          }),
          currency_code: currentQuote.currencyCode,
          quote_date: new Date().toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          }),
          exchange_rate: formatRate(currentQuote.cotaçãoBase),
          iof_value: formatBRL(currentQuote.totalIOFValue),
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
          file_preview: "",
          obs_documento:
            "Cliente instruído a enviar documentação via WhatsApp ou E-mail.",
        };
        const sendAdmin = emailjs.send(
          SERVICE_ID,
          TEMPLATE_ADMIN,
          templateParams
        );
        const sendClient = emailjs.send(SERVICE_ID, TEMPLATE_CLIENTE, {
          ...templateParams,
          to_email: email,
        });
        await Promise.all([sendAdmin, sendClient]);
        budgetForm.classList.add("hidden");
        successStep.classList.remove("hidden");
        setupFinalWhats(name);
      } catch (error) {
        console.error("❌ Erro envio", error);
        budgetForm.classList.add("hidden");
        successStep.classList.remove("hidden");
        setupFinalWhats(name);
      } finally {
        btn.innerHTML = originalContent;
        btn.disabled = !1;
      }
    };
  }
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
      const msg = `Olá, M&A Consultoria Câmbio! Meu nome é *${name}*.\nAcabei de enviar meus dados pelo Site Conversor.\n\nGostaria de prosseguir com a operação:\n*MODALIDADE: ${modeText}*\n*VALOR: ${
        currentQuote.amount
      } ${currentQuote.currencyCode}*\n- Cotação Turismo: R$ ${formatRate(
        currentQuote.cotaçãoBase
      )}\n- IOF: ${iofPercentage}%\n\n*👉🏻 TOTAL A PAGAR: ${formatBRL(
        currentQuote.totalBRL
      )}*\n\n*📎 Estou enviando a foto do meu documento (CNH, RG ou RNE) por aqui para finalizar meu cadastro.*`;
      window.open(
        `https://api.whatsapp.com/send?phone=${selectedOperator}&text=${encodeURIComponent(
          msg
        )}`,
        "_blank"
      );
      setTimeout(() => window.location.reload(), 1000);
    };
  }
});
function openInfoModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("hidden");
}
function closeInfoModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("hidden");
}
function toggleFaq(button) {
  const content = button.nextElementSibling;
  const icon = button.querySelector("i");
  if (content.classList.contains("hidden")) {
    content.classList.remove("hidden");
    content.classList.add("block");
    icon.style.transform = "rotate(180deg)";
    button.setAttribute("aria-expanded", "true");
  } else {
    content.classList.add("hidden");
    content.classList.remove("block");
    icon.style.transform = "rotate(0deg)";
    button.setAttribute("aria-expanded", "false");
  }
}
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeInfoModal("termsModal");
    closeInfoModal("privacyModal");
    closeInfoModal("contactModal");
  }
});
