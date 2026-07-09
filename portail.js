// ── test-card.js ── Carte MINIMALE pour diagnostic ──
// Affiche juste un texte configurable. Sert à vérifier si N'IMPORTE
// QUELLE carte custom avec éditeur plante à l'ouverture sur cette
// installation HA, indépendamment de toute complexité de portail-card.

function waitForLitElementBase() {
  const candidates = ['home-assistant', 'home-assistant-main', 'hui-view', 'ha-panel-lovelace', 'hui-masonry-view'];
  return new Promise(resolve => {
    (function check() {
      for (const tag of candidates) {
        const el = customElements.get(tag);
        if (el) { resolve(Object.getPrototypeOf(el)); return; }
      }
      requestAnimationFrame(check);
    })();
  });
}

waitForLitElementBase().then((LitElement) => {
const { html, css } = LitElement.prototype;

function fireEvent(node, type, detail = {}) {
  node.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
}

class TestCard extends LitElement {
  static get properties() { return { _config: { type: Object } }; }
  static get styles() { return css`:host{display:block;padding:2rem;font-size:1.4rem;text-align:center;color:var(--primary-text-color);}`; }

  setConfig(config) {
    this._config = { message: 'Bonjour !', ...(config || {}) };
  }

  static async getConfigElement() {
    if (!customElements.get('test-card-editor')) {
      await customElements.whenDefined('test-card-editor');
    }
    return document.createElement('test-card-editor');
  }
  static getStubConfig() { return { message: 'Bonjour !' }; }
  getCardSize() { return 1; }

  render() {
    return html`<div>🧪 ${this._config ? this._config.message : ''}</div>`;
  }
}

class TestCardEditor extends LitElement {
  static get properties() { return { _config: { type: Object } }; }
  setConfig(config) { this._config = config || { message: '' }; }
  render() {
    return html`<div style="padding:1rem">
      <label>Message : </label>
      <input type="text" .value=${this._config?.message || ''}
        @input=${(e) => { this._config = { ...this._config, message: e.target.value };
          fireEvent(this, 'config-changed', { config: this._config }); }}>
    </div>`;
  }
}

if (!customElements.get('test-card')) customElements.define('test-card', TestCard);
if (!customElements.get('test-card-editor')) customElements.define('test-card-editor', TestCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: 'test-card', name: 'Test Diagnostic', description: 'Carte minimale de diagnostic' });
});
