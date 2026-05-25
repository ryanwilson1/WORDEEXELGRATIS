# MINI OFFICE

> Mini pacote Office moderno, offline e premium — funciona apenas abrindo `index.html`

---

## Como usar

1. Extraia todos os arquivos em uma pasta
2. Abra `index.html` em qualquer navegador moderno
3. Pronto — sem instalação, sem internet necessária

**Compatível com:** Chrome, Safari, Edge, Firefox · iPad · Desktop · Mobile

---

## Funcionalidades

### MINI DOCS
- Editor rich-text estilo Word (powered by Quill.js)
- Página A4 centralizada com zoom visual
- Toolbar completa: negrito, itálico, fonte, cor, alinhamento, listas, imagens, links
- Salvar / Carregar documentos localmente (IndexedDB)
- Autosave inteligente (2,5s após última edição)
- Exportar PDF profissional
- Exportar TXT
- Imprimir (Ctrl+P)
- Atalhos: Ctrl+S (salvar), Ctrl+P (imprimir), Ctrl+N (novo)

### MINI SHEETS
- Planilha 50 linhas × 26 colunas (A–Z)
- Fórmulas: `=SOMA(A1:A10)`, `=MÉDIA(B1:B5)`, `=MAX(...)`, `=MIN(...)`, `=MULT(...)`, `=CONT(...)`
- Expressões aritméticas: `=A1+B2*3`
- Barra de fórmulas com referência de célula
- Navegação por teclado (Tab, Enter, Arrows)
- Salvar / Carregar planilhas (IndexedDB)
- Autosave (3s)
- Exportar CSV
- Exportar PDF
- Imprimir

---

## Segurança
- 100% local — nenhum dado sai do seu dispositivo
- Sanitização de HTML para prevenir injeção de scripts
- CSP via meta tag
- Sem backend, sem telemetria, sem analytics

---

## Estrutura de arquivos

```
mini-office/
├── index.html          ← Ponto de entrada
├── manifest.json       ← PWA
├── service-worker.js   ← Cache offline
├── css/
│   └── main.css        ← Estilos premium
├── js/
│   ├── storage.js      ← IndexedDB
│   ├── particles.js    ← Animação splash
│   ├── splash.js       ← Tela de abertura
│   ├── home.js         ← Home principal
│   ├── docs.js         ← MINI DOCS
│   ├── sheets.js       ← MINI SHEETS
│   └── app.js          ← Controlador principal
└── assets/             ← Ícones PWA
```

---

## PWA — Instalar no iPad/iPhone

1. Abra no Safari
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**
3. O MINI OFFICE aparecerá como app nativo

---

*MINI OFFICE — Seus documentos, no seu dispositivo.*
