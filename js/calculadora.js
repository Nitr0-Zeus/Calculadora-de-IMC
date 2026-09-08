const CLASSIFICACOES = [
    { max: 18.5, texto: "Abaixo do peso", cor: "#3498db" },
    { max: 25,   texto: "Peso normal",    cor: "#2ecc71" },
    { max: 30,   texto: "Sobrepeso",      cor: "#f39c12" },
    { max: 35,   texto: "Obesidade grau I", cor: "#e74c3c" },
    { max: 40,   texto: "Obesidade grau II", cor: "#c0392b" },
    { max: Infinity, texto: "Obesidade grau III", cor: "#8e44ad" }
];

const HISTORICO_MAX = 10;
const STORAGE_KEY = "imc_historico";
const THEME_KEY = "imc_theme";

let historico = [];

function init() {
    carregarHistorico();
    carregarTema();
    configurarEventListeners();
    renderizarHistorico();
}

function configurarEventListeners() {
    document.getElementById("calcularBtn").addEventListener("click", calcularIMC);
    document.getElementById("limparBtn").addEventListener("click", limparCampos);
    document.getElementById("themeToggle").addEventListener("click", alternarTema);

    document.getElementById("peso").addEventListener("keypress", function(e) {
        if (e.key === "Enter") calcularIMC();
    });

    document.getElementById("altura").addEventListener("keypress", function(e) {
        if (e.key === "Enter") calcularIMC();
    });

    document.getElementById("peso").addEventListener("input", formatarEntrada);
    document.getElementById("altura").addEventListener("input", formatarEntrada);
}

function formatarEntrada(e) {
    let valor = e.target.value;
    valor = valor.replace(/[^0-9,\.]/g, "");
    valor = valor.replace(/\./g, ",");
    e.target.value = valor;
}

function formatarNumero(valor) {
    return valor.toFixed(2).replace(".", ",");
}

function validarCampos(pesoStr, alturaStr) {
    if (!pesoStr.trim()) {
        return { valido: false, erro: "Informe um peso valido." };
    }
    if (!alturaStr.trim()) {
        return { valido: false, erro: "Informe uma altura valida." };
    }

    const peso = parseDecimal(pesoStr);
    const altura = parseDecimal(alturaStr);

    if (isNaN(peso)) {
        return { valido: false, erro: "O peso deve conter apenas numeros." };
    }
    if (isNaN(altura)) {
        return { valido: false, erro: "A altura deve conter apenas numeros." };
    }

    if (peso <= 0) {
        return { valido: false, erro: "O peso deve ser maior que zero." };
    }
    if (altura <= 0) {
        return { valido: false, erro: "A altura deve ser maior que zero." };
    }

    if (peso > 500) {
        return { valido: false, erro: "Peso invalido (maximo 500 kg)." };
    }
    if (altura > 3) {
        return { valido: false, erro: "Altura invalida (maximo 3 metros)." };
    }

    return { valido: true, peso: peso, altura: altura };
}

function parseDecimal(valor) {
    return parseFloat(valor.replace(",", "."));
}

// Altura > 10 indica valor em centimetros (ex: 175), nao em metros (ex: 1,75)
function converterAlturaParaMetros(altura) {
    if (altura > 10) {
        return altura / 100;
    }
    return altura;
}

function classificarIMC(valor) {
    for (var i = 0; i < CLASSIFICACOES.length; i++) {
        if (valor < CLASSIFICACOES[i].max) {
            return CLASSIFICACOES[i];
        }
    }
    return CLASSIFICACOES[CLASSIFICACOES.length - 1];
}

function calcularIMC() {
    var pesoStr = document.getElementById("peso").value;
    var alturaStr = document.getElementById("altura").value;

    var validacao = validarCampos(pesoStr, alturaStr);
    if (!validacao.valido) {
        mostrarErro(validacao.erro);
        return;
    }

    ocultarErro();

    var peso = validacao.peso;
    var altura = validacao.altura;
    var alturaMetros = converterAlturaParaMetros(altura);

    var imc = peso / (alturaMetros * alturaMetros);
    var imcFormatado = formatarNumero(imc);

    var classificacao = classificarIMC(imc);

    exibirResultado(imcFormatado, classificacao);
    adicionarHistorico(peso, alturaMetros, imc, classificacao);
}

function exibirResultado(imcFormatado, classificacao) {
    document.getElementById("resultValue").textContent = imcFormatado;

    var dot = document.getElementById("classificationDot");
    dot.style.background = classificacao.cor;

    var text = document.getElementById("classificationText");
    text.textContent = classificacao.texto;
    text.style.color = classificacao.cor;

    document.getElementById("resultSection").classList.remove("hidden");

    atualizarGauge(classificacao.cor);

    document.getElementById("resultSection").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function atualizarGauge(cor) {
    var posicoes = [10, 30, 50, 70, 85, 95];
    var valorIMC = parseDecimal(document.getElementById("resultValue").textContent.replace(",", "."));
    var index = 0;

    for (var i = 0; i < CLASSIFICACOES.length; i++) {
        if (valorIMC < CLASSIFICACOES[i].max) {
            index = i;
            break;
        }
    }

    var posicao = posicoes[Math.max(0, index)];
    var indicator = document.getElementById("gaugeIndicator");
    indicator.style.left = posicao + "%";
    indicator.style.backgroundColor = cor;
}

function mostrarErro(mensagem) {
    document.getElementById("errorText").textContent = mensagem;
    var el = document.getElementById("errorMessage");
    el.classList.remove("hidden");

    // Forcar reflow para reiniciar a animacao de shake
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "shake 0.5s ease";
}

function ocultarErro() {
    document.getElementById("errorMessage").classList.add("hidden");
}

function limparCampos() {
    document.getElementById("peso").value = "";
    document.getElementById("altura").value = "";
    document.getElementById("resultSection").classList.add("hidden");
    ocultarErro();
    document.getElementById("peso").focus();
}

function adicionarHistorico(peso, altura, imc, classificacao) {
    var item = {
        peso: formatarNumero(peso),
        altura: formatarNumero(altura),
        imc: formatarNumero(imc),
        classificacao: classificacao.texto,
        cor: classificacao.cor,
        data: new Date().toISOString()
    };

    historico.unshift(item);

    // Limitar a 10 itens para nao ocupar espaco excessivo no localStorage
    if (historico.length > HISTORICO_MAX) {
        historico = historico.slice(0, HISTORICO_MAX);
    }

    salvarHistorico();
    renderizarHistorico();
}

function renderizarHistorico() {
    var list = document.getElementById("historyList");

    if (historico.length === 0) {
        list.innerHTML = '<p class="history-empty">Nenhum calculo realizado ainda.</p>';
        return;
    }

    var html = "";
    for (var i = 0; i < historico.length; i++) {
        var item = historico[i];
        html += '<div class="history-item" style="animation-delay: ' + (i * 0.05) + 's">';
        html += '<div class="history-item-info">' + item.peso + ' kg &bull; ' + item.altura + ' m</div>';
        html += '<div class="history-item-classification" style="background: ' + item.cor + '20; color: ' + item.cor + '">' + item.classificacao + '</div>';
        html += '<div class="history-item-imc" style="color: ' + item.cor + '">' + item.imc + '</div>';
        html += '</div>';
    }

    list.innerHTML = html;
}

function salvarHistorico() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(historico));
    } catch (e) {
        console.warn("Nao foi possivel salvar o historico:", e);
    }
}

function carregarHistorico() {
    try {
        var dados = localStorage.getItem(STORAGE_KEY);
        if (dados) {
            historico = JSON.parse(dados);
        }
    } catch (e) {
        console.warn("Nao foi possivel carregar o historico:", e);
        historico = [];
    }
}

function alternarTema() {
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var novoTema = isDark ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", novoTema);
    document.getElementById("themeToggle").querySelector(".theme-icon").textContent = novoTema === "dark" ? "Escuro" : "Claro";

    localStorage.setItem(THEME_KEY, novoTema);
}

function carregarTema() {
    var temaSalvo = localStorage.getItem(THEME_KEY);
    if (temaSalvo) {
        document.documentElement.setAttribute("data-theme", temaSalvo);
        document.getElementById("themeToggle").querySelector(".theme-icon").textContent = temaSalvo === "dark" ? "Escuro" : "Claro";
    }
}

document.addEventListener("DOMContentLoaded", init);
