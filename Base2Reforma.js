/*
    script.js - Lógica para o fluxo hierárquico de cards da Reforma Tributária.
    - Os cards são adicionados dinamicamente e permanecem na tela.
    - O fluxo cresce verticalmente, mostrando o caminho de decisão.
    - Inclui funcionalidade de busca para navegar pelos cards visíveis.
*/

const cardsJsonFile = "Base4Reforma.json"; // CORREÇÃO: Apontando para o nome de arquivo correto.
let cardsData = [];
let ncmData = {}; // Objeto para armazenar a base de NCMs

/* Carrega JSON (tenta caminho absoluto do ambiente e fallback relativo) */
async function loadCardsData() {
    try {
        const resp = await fetch(cardsJsonFile);
        cardsData = await resp.json();
        console.log("Carregado de", cardsJsonFile);
    } catch (e) {
        console.error("Não foi possível carregar o JSON dos cards:", e);
        cardsData = [];
    }
}


/* Cria um elemento DOM para um card */
function createCardElement(card, cardId) {
    const wrapper = document.createElement("section");
    wrapper.className = "flow-card";
    wrapper.id = cardId;
    wrapper.dataset.originalId = card.id; // Guarda o ID original do JSON

    // question
    // CORREÇÃO: Trata o finalText como o título principal do card, assim como a 'question'.
    if (card.question || card.finalText) {
        const q = document.createElement("h2"); // Usar h2 para semântica
        q.className = "card-question";
        q.innerText = card.question || card.finalText; // Usa a pergunta ou o texto final como título
        wrapper.appendChild(q);
    }

    // body (scroll interno)
    const body = document.createElement("div");
    body.className = "card-body";
    wrapper.appendChild(body);

    // info blocks (explanation, legalBasis, example) - only if exist
    const info = document.createElement("div");
    info.className = "card-info";

    if (card.explanation) {
        // Cria um contêiner para o cabeçalho da explicação (título + link)
        const explanationHeader = document.createElement("div");
        explanationHeader.className = "explanation-header";

        const t = document.createElement("h3");
        t.innerText = "Explicação";
        explanationHeader.appendChild(t);

        // Adiciona o link ao cabeçalho, se ele existir
        if (card.link) {
            const linkEl = document.createElement("a");
            linkEl.href = card.link.url;
            linkEl.innerText = card.link.text;
            linkEl.target = card.link.target || "_blank";
            linkEl.rel = "noopener noreferrer";
            linkEl.className = "card-link";
            explanationHeader.appendChild(linkEl);
        }

        info.appendChild(explanationHeader); // Adiciona o cabeçalho ao bloco de informações

        const p = document.createElement("p");
        p.innerText = card.explanation;
        info.appendChild(p);
    }

    if (card.legalBasis) {
        const t = document.createElement("h3");
        t.innerText = "Base legal";
        info.appendChild(t);

        const p = document.createElement("p");
        p.innerText = card.legalBasis;
        info.appendChild(p);
    }

    if (card.example) {
        const t = document.createElement("h3");
        t.innerText = "Exemplo";
        info.appendChild(t);

        const p = document.createElement("p");
        p.innerText = card.example;
        info.appendChild(p);
    }

    body.appendChild(info);

    // if finalText present -> show final result and restart option
    const actions = document.createElement("div");
    actions.className = "card-actions";

    if (card.finalText) { // Se for um card final, apenas adiciona o botão de reiniciar
        // add restart button
        const restartBtn = document.createElement("button"); // Mantém o botão de reiniciar
        restartBtn.className = "btn-restart";
        restartBtn.innerText = "Reiniciar";
        restartBtn.addEventListener("click", () => location.reload()); // Simples reload para reiniciar
        actions.appendChild(restartBtn);
    } else if (card.options) { // NOVO: Lógica para cards com múltiplas opções
        card.options.forEach(option => {
            const optionBtn = document.createElement("button");
            optionBtn.className = "btn-option"; // Pode usar um estilo novo ou o 'btn-yes'
            optionBtn.innerText = option.text;
            optionBtn.type = "button";
            optionBtn.addEventListener("click", () => {
                // Simula uma escolha para manter a lógica de criação de cards
                handleChoice(cardId, option.target, option.target);
            });
            actions.appendChild(optionBtn);
        });
    } else if (card.inputTarget) { // NOVO: Lógica para card com input
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Digite o NCM (8 dígitos)";
        input.className = "ncm-input";
        actions.appendChild(input);

        const confirmBtn = document.createElement("button");
        confirmBtn.className = "btn-yes";
        confirmBtn.innerText = "Confirmar NCM";
        confirmBtn.addEventListener("click", () => {
            // CORREÇÃO: Rompido o vínculo com ncm.json. Agora apenas avança para o próximo card.
            handleChoice(cardId, 'confirm', card.inputTarget);
        });
        actions.appendChild(confirmBtn);
    }
    else {
        // create Yes/No buttons pointing to yesTarget / noTarget
        const yesBtn = document.createElement("button");
        yesBtn.className = "btn-yes";
        yesBtn.innerText = "Sim";
        yesBtn.type = "button";
        yesBtn.addEventListener("click", () => {
            handleChoice(cardId, 'yes', card.yesTarget);
        });

        const noBtn = document.createElement("button");
        noBtn.className = "btn-no";
        noBtn.innerText = "Não";
        noBtn.type = "button";
        noBtn.addEventListener("click", (e) => {
            handleChoice(cardId, 'no', card.noTarget);
        });

        actions.appendChild(yesBtn);
        actions.appendChild(noBtn);
    }

    wrapper.appendChild(actions);

    return wrapper;
}

/* Remove um card e todos os seus descendentes da tela */
function removeDescendantCards(cardIdPrefix) {
    // Encontra todos os cards que começam com o prefixo do ID (ex: 'card_1-no')
    const descendants = document.querySelectorAll(`[id^="${cardIdPrefix}"]`);
    descendants.forEach(descendant => {
        descendant.remove();
    });
}


/* Manipula a escolha do usuário (Sim/Não) */
function handleChoice(parentId, choice, targetId) {
    const parentCard = document.getElementById(parentId);
    if (!parentCard) return;

    // CORREÇÃO: Declarar chosenCardId no escopo da função para evitar ReferenceError.
    let chosenCardId;

    parentCard.classList.add("selected"); // Mantém o card pai destacado
    
    // Lógica para Sim/Não
    if (choice === 'yes' || choice === 'no') {
        const yesCardId = `${parentId}-yes`;
        const noCardId = `${parentId}-no`;
        const otherChoice = choice === 'yes' ? 'no' : 'yes';
        chosenCardId = (choice === 'yes') ? yesCardId : noCardId;
        const otherCardIdPrefix = `${parentId}-${otherChoice}`;

        removeDescendantCards(otherCardIdPrefix);

        const yesBtn = parentCard.querySelector('.btn-yes');
        const noBtn = parentCard.querySelector('.btn-no');
        if (yesBtn && noBtn) {
            if (choice === 'yes') {
                yesBtn.classList.add('active-choice');
                noBtn.classList.remove('active-choice');
            } else {
                noBtn.classList.add('active-choice');
                yesBtn.classList.remove('active-choice');
            }
        }
        navigateToNextCard(parentId, chosenCardId, targetId);
    } else { // Lógica para opções customizadas e input
        chosenCardId = `${parentId}-${choice}`;
        // Remove todos os outros caminhos que poderiam ter sido criados a partir deste pai
        removeDescendantCards(`${parentId}-`);
        navigateToNextCard(parentId, chosenCardId, targetId);
    }

}

/**
 * Função auxiliar para criar e navegar para o próximo card.
 * Modificada para aceitar dados de card gerados dinamicamente (para resultados de NCM).
 * @param {string} parentId - O ID do card pai.
 * @param {string} chosenCardId - O ID a ser atribuído ao novo card.
 * @param {string} targetId - O ID do card de destino (do JSON de fluxo).
 * @param {object} [dynamicCardData=null] - Dados de um card gerado dinamicamente.
 */
function navigateToNextCard(parentId, chosenCardId, targetId, dynamicCardData = null) {
    const parentCard = document.getElementById(parentId);
    if (!parentCard) return;

    if (document.getElementById(chosenCardId)) return;

    // Busca os dados do próximo card e o cria na tela
    // Usa dados dinâmicos se fornecidos (para resultado do NCM), senão busca no JSON principal
    const targetData = dynamicCardData || getCardById(targetId);
    if (!targetData) return;

    const newCardEl = createCardElement(targetData, chosenCardId);

    // Encontra o último card descendente do pai para inserir o novo card depois
    let lastDescendant = parentCard; 
    const existingDescendants = document.querySelectorAll(`[id^="${parentId}-"]`);
    if (existingDescendants.length > 0) {
        lastDescendant = existingDescendants[existingDescendants.length - 1];
    }
    lastDescendant.after(newCardEl);

    // Adiciona a classe 'visible' para ativar a animação e rola a tela
    setTimeout(() => {
        newCardEl.classList.add('visible');

        // Rola para o card escolhido após a animação
        newCardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50); // Pequeno delay para garantir que o CSS pegue a transição
}

/* Busca card por id no array de dados original */
function getCardById(id) {
    return cardsData.find(c => c.id === id);
}

/* Esconde a tela inicial e mostra o primeiro card */
function startFlow() {
    const initialScreen = document.getElementById("initial-screen");
    const startButton = document.getElementById("start-button");

    // Impede que o fluxo comece novamente se já foi iniciado
    if (startButton.disabled) return;
    startButton.disabled = true;

    // CORREÇÃO: O ID do primeiro card no JSON é "tipo_documento", não "card_1".
    const firstCardData = getCardById("tipo_documento");
    if (firstCardData) {
        const firstCardEl = createCardElement(firstCardData, "tipo_documento");
        initialScreen.after(firstCardEl);

        setTimeout(() => {
            firstCardEl.classList.add('visible');
            firstCardEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
    }
}

/* --- LÓGICA DA BUSCA --- */
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        searchResults.innerHTML = '';

        if (query.length < 3) {
            searchResults.style.display = 'none';
            return;
        }

        // Busca em TODOS os cards do JSON, não apenas nos renderizados.
        const matches = [];
        cardsData.forEach(card => {
            // Procura no título e na explicação
            const question = card.question || '';
            const explanation = card.explanation || '';
            const tags = card.tags ? card.tags.join(' ') : ''; // Junta as tags em uma única string

            if (question.toLowerCase().includes(query) || explanation.toLowerCase().includes(query) || tags.toLowerCase().includes(query)) {
                matches.push({
                    text: card.question || card.finalText, // Mostra a pergunta ou o texto final
                    originalId: card.id
                });
            }
        });

        if (matches.length > 0) { // Se encontrou correspondências
            matches.forEach(match => {
                const resultItem = document.createElement('div');
                resultItem.innerText = match.text;
                resultItem.addEventListener('click', () => {
                    // CORREÇÃO: Lógica para criar o card se ele não estiver na tela.
                    const targetCard = document.querySelector(`.flow-card[data-original-id="${match.originalId}"]`);
                    
                    if (targetCard) {
                        // Se o card já existe, apenas rola até ele.
                        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetCard.style.transition = 'outline 0.1s ease-in-out';
                        targetCard.style.outline = '3px solid var(--accent)';
                        setTimeout(() => {
                            targetCard.style.outline = 'none';
                        }, 1000);
                    } else {
                        // Se o card não existe, limpa o fluxo e cria o card pesquisado.
                        // Primeiro, remove a tela inicial se ela ainda estiver lá.
                        const initialScreen = document.getElementById('initial-screen');
                        if(initialScreen) initialScreen.style.display = 'none';

                        const diagramContainer = document.getElementById('diagram-container');
                        diagramContainer.innerHTML = ''; // Limpa todos os cards gerados

                        const cardData = getCardById(match.originalId);
                        if (cardData) {
                            const newCardEl = createCardElement(cardData, cardData.id);
                            diagramContainer.appendChild(newCardEl);
                            setTimeout(() => {
                                newCardEl.classList.add('visible');
                                newCardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 50);
                        }
                    }
                    searchInput.value = '';
                    searchResults.style.display = 'none';
                });
                searchResults.appendChild(resultItem);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.style.display = 'none';
        }
    });

    // Fecha os resultados se clicar fora
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && e.target !== searchInput) {
            searchResults.style.display = 'none';
        }
    });
}

/* Inicialização */
async function init() {
    const container = document.getElementById("diagram-container");
    container.appendChild(document.getElementById('initial-screen'));

    await loadCardsData();
    // await loadNcmData(); // CORREÇÃO: Chamada removida para romper o vínculo com ncm.json

    // attach start-button event
    const startBtn = document.getElementById("start-button");
    if (startBtn) startBtn.addEventListener("click", startFlow);

    // Configura a funcionalidade de busca
    setupSearch();
}

/* Run */
init()