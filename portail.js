// Chemins absolus garantis pour HACS
import { LitElement, html, css } from '/hacsfiles/frontend/lit-element/lit-element.js';
import { fireEvent } from '/hacsfiles/frontend/custom-card-helpers/custom-card-helpers.js';

const DEFAULT_CONFIG = {
  titre_principal: "Portail Maison",
  taille_texte: 17,
  couleur_de_fond: "#1c2431",
  couleur_cartes: "#27303f",
  couleur_accent: "#3d8de0",
  pages_version: 1,
  menus: [
    { nom: "Météo", couleur: "#ffffff", sous_menus: [ { nom: "Météo", icone: "⛅", chemin: "/local/portail/meteo_ha_ws.html", couleur: "#ffffff", taille: "16px" } ] },
    { nom: "Zones", couleur: "#ffffff", sous_menus: [ { nom: "Étage", icone: "🛏️", chemin: "/local/portail/etage.html", couleur: "#ffffff", taille: "16px" } ] }
  ]
};

class PortailCard extends LitElement {
  static get properties() { return { _config: { type: Object }, _activeMenu: { type: Number }, _activeSub: { type: Number }, _hass: { type: Object } }; }

  static get styles() { return css`
    :host { display: flex; flex-direction: column; height: 100%; overflow: hidden; font-family: system-ui, -apple-system, sans-serif; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    header { background: var(--card-bg); border-bottom: 2px solid var(--divider-color); padding: 0.6rem 0.9rem; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .brand { font-size: 1.25rem; font-weight: 700; color: var(--accent-color); margin-right: 0.4rem; white-space: nowrap; }
    nav { display: flex; gap: 0.4rem; flex-wrap: wrap; flex: 1; min-width: 0; }
    .menu-btn { font-size: 1.05rem; font-weight: 600; color: var(--secondary-text-color); background: transparent; border: 2px solid transparent; border-radius: 10px; padding: 0.6rem 1rem; min-height: 52px; cursor: pointer; }
    .menu-btn:hover { background: var(--secondary-background-color); }
    .menu-btn.active { background: var(--accent-color); color: #fff; }
    main { flex: 1; display: flex; min-height: 0; }
    aside { width: 250px; background: var(--card-bg); border-right: 2px solid var(--divider-color); padding: 0.7rem; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; }
    .sub-btn { display: flex; align-items: center; gap: 0.7rem; text-align: left; font-size: 1.05rem; font-weight: 600; color: var(--primary-text-color); background: transparent; border: 2px solid transparent; border-radius: 10px; padding: 0.8rem; min-height: 60px; width: 100%; cursor: pointer; }
    .sub-btn .ic { font-size: 1.5rem; width: 2rem; text-align: center; flex-shrink: 0; }
    .sub-btn:hover { background: var(--secondary-background-color); }
    .sub-btn.active { background: var(--secondary-background-color); border-left: 6px solid var(--accent-color); border-radius: 0 10px 10px 0; color: var(--accent-color); }
    #content { flex: 1; position: relative; background: var(--primary-background-color); min-width: 0; }
    iframe { width: 100%; height: 100%; border: 0; background: var(--card-bg); }
    #placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.8rem; text-align: center; padding: 1.5rem; }
    .big { font-size: 1.3rem; font-weight: 700; color: var(--accent-color); }
    .small { font-size: 1rem; color: var(--secondary-text-color); max-width: 34rem; line-height: 1.6; }
    .tools { display: flex; gap: 0.4rem; }
    .tool-btn { font-size: 1.05rem; font-weight: 700; color: var(--accent-color); background: var(--card-bg); border: 2px solid var(--divider-color); border-radius: 10px; min-width: 52px; min-height: 52px; padding: 0.4rem 0.7rem; cursor: pointer; }
    .tool-btn:hover { background: var(--secondary-background-color); border-color: var(--accent-color); }
    @media (max-width: 720px) { main { flex-direction: column; } aside { width: 100%; flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: 0; border-bottom: 2px solid var(--divider-color); } .sub-btn { width: auto; min-width: 10rem; } .sub-btn.active { border-left: 2px solid transparent; border-bottom: 6px solid var(--accent-color); border-radius: 10px 10px 0 0; } }
  `; }

  setConfig(config) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this.style.fontSize = `${this._config.taille_texte || 17}px`;
    this.style.setProperty('--card-bg', this._config.couleur_cartes || '#27303f');
    this.style.setProperty('--primary-background-color', this._config.couleur_de_fond || '#1c2431');
    this.style.setProperty('--accent-color', this._config.couleur_accent || '#3d8de0');
  }

  set hass(hass) { this._hass = hass; }

  get currentMenu() { return this._config.menus[this._activeMenu] || this._config.menus[0] || null; }
  get currentSub() { const menu = this.currentMenu; return (menu && menu.sous_menus) ? (menu.sous_menus[this._activeSub] || menu.sous_menus[0] || null) : null; }

  render() {
    const sub = this.currentSub;
    const iframeSrc = sub && sub.chemin ? `${sub.chemin}?v=${this._config.pages_version || 1}` : "";
    return html`
      <header>
        <span class="brand">🏠</span>
        <nav>${this._config.menus.map((m, i) => html`<button class="menu-btn ${this._activeMenu === i ? 'active' : ''}" @click=${() => { this._activeMenu = i; this._activeSub = 0; }}>${m.nom}</button>`)}</nav>
        <div class="tools">
          <button class="tool-btn" @click=${() => this._changeFont(-1)}>A−</button>
          <button class="tool-btn" @click=${() => this._changeFont(1)}>A+</button>
          <button class="tool-btn" @click=${() => this._openTab()}>⧉</button>
        </div>
      </header>
      <main>
        <aside>
          ${this.currentMenu && this.currentMenu.sous_menus.length > 0 ? 
            this.currentMenu.sous_menus.map((s, i) => html`<button class="sub-btn ${this._activeSub === i ? 'active' : ''}" style="color: ${s.couleur || 'var(--primary-text-color)'}; font-size: ${s.taille || 'inherit'}" @click=${() => { this._activeSub = i; }}><span class="ic">${s.icone || "📄"}</span><span>${s.nom}</span></button>`) : 
            html`<div style="color: var(--secondary-text-color); padding: 1rem;">Aucun sous-menu</div>`}
        </aside>
        <div id="content">
          ${sub && sub.chemin ? html`<iframe src="${iframeSrc}"></iframe>` : html`<div id="placeholder"><div class="big">${sub ? sub.nom : this._config.titre_principal}</div><div class="small">${sub ? "Chemin HTML manquant." : "Choisissez une rubrique."}</div></div>`}
        </div>
      </main>`;
  }

  _changeFont(d) { this._config.taille_texte = Math.min(24, Math.max(14, (this._config.taille_texte || 17) + d)); this.style.fontSize = `${this._config.taille_texte}px`; fireEvent(this, 'config-changed', { config: this._config }); }
  _openTab() { const s = this.currentSub; if (s && s.chemin) window.open(`${s.chemin}?v=${this._config.pages_version || 1}`, "_blank"); }
  
  static getConfigElement() { return document.createElement("portail-editor"); }
}

class PortailEditor extends LitElement {
  static get properties() { return { _config: { type: Object }, _draftConfig: { type: Object } }; }
  static get styles() { return css`
    * { box-sizing: border-box; font-family: system-ui, sans-serif; }
    .editor-container { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; background: var(--mdc-theme-surface, #fff); color: var(--mdc-theme-on-surface, #000); }
    h2 { margin: 0; font-size: 1.3rem; }
    .section { border: 1px solid var(--divider-color, #ccc); border-radius: 8px; padding: 1rem; background: var(--secondary-background-color, #f4f4f4); }
    .row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; }
    label { min-width: 120px; font-weight: bold; font-size: 0.9rem; }
    input { flex: 1; min-width: 100px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    .mini-btn { background: #eee; border: 1px solid #ccc; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 1.1rem; }
    .mini-btn.del { color: red; } .mini-btn.del:hover { background: #ffcccc; }
    .add-btn { width: 100%; padding: 10px; background: transparent; border: 2px dashed var(--primary-color, #03a9f4); color: var(--primary-color, #03a9f4); border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: 0.5rem; }
    .sub-section { margin-left: 1rem; padding-left: 1rem; border-left: 3px solid var(--divider-color, #ccc); margin-top: 0.5rem; }
  `; }

  setConfig(config) { this._config = config; this._draftConfig = JSON.parse(JSON.stringify(config)); }

  render() {
    if (!this._draftConfig) return html``;
    const c = this._draftConfig;
    return html`
      <div class="editor-container">
        <h2>Configuration du Portail</h2>
        <div class="section">
          <div class="row"><label>Titre principal</label><input type="text" .value=${c.titre_principal || ''} @input=${(e) => { c.titre_principal = e.target.value; }}></div>
          <div class="row"><label>Taille texte (px)</label><input type="number" min="12" max="30" .value=${c.taille_texte || 17} @input=${(e) => { c.taille_texte = parseInt(e.target.value); }}></div>
          <div class="row"><label>Couleur de fond</label><input type="color" .value=${c.couleur_de_fond || '#1c2431'} @input=${(e) => { c.couleur_de_fond = e.target.value; }}></div>
          <div class="row"><label>Couleur des cartes</label><input type="color" .value=${c.couleur_cartes || '#27303f'} @input=${(e) => { c.couleur_cartes = e.target.value; }}></div>
          <div class="row"><label>Couleur d'accent</label><input type="color" .value=${c.couleur_accent || '#3d8de0'} @input=${(e) => { c.couleur_accent = e.target.value; }}></div>
        </div>
        <h3>Menus et Sous-menus</h3>
        ${c.menus.map((m, mIdx) => html`
          <div class="section">
            <div class="row">
              <label>Nom du menu</label><input type="text" .value=${m.nom || ''} @input=${(e) => { m.nom = e.target.value; }}>
              <input type="color" style="max-width: 50px;" .value=${m.couleur || '#ffffff'} @input=${(e) => { m.couleur = e.target.value; }}>
              <button class="mini-btn" @click=${() => this._moveMenu(mIdx, -1)}>▲</button>
              <button class="mini-btn" @click=${() => this._moveMenu(mIdx, 1)}>▼</button>
              <button class="mini-btn del" @click=${() => this._delMenu(mIdx)}>🗑</button>
            </div>
            <div class="sub-section">
              ${m.sous_menus.map((s, sIdx) => html`
                <div class="row">
                  <label>Icône</label><input type="text" style="max-width: 60px; text-align:center;" .value=${s.icone || ''} @input=${(e) => { s.icone = e.target.value; }} placeholder="⛅">
                  <label>Nom</label><input type="text" .value=${s.nom || ''} @input=${(e) => { s.nom = e.target.value; }}>
                  <button class="mini-btn del" @click=${() => this._delSub(mIdx, sIdx)}>✖</button>
                  <button class="mini-btn" @click=${() => this._moveSub(mIdx, sIdx, -1)}>▲</button>
                  <button class="mini-btn" @click=${() => this._moveSub(mIdx, sIdx, 1)}>▼</button>
                </div>
                <div class="row"><label>Chemin HTML</label><input type="text" .value=${s.chemin || ''} @input=${(e) => { s.chemin = e.target.value; }} placeholder="/local/portail/page.html"></div>
                <div class="row">
                  <label>Couleur texte</label><input type="color" style="max-width: 50px;" .value=${s.couleur || '#ffffff'} @input=${(e) => { s.couleur = e.target.value; }}>
                  <label>Taille</label><input type="text" style="max-width: 60px;" .value=${s.taille || '16px'} @input=${(e) => { s.taille = e.target.value; }}>
                </div>
                <hr style="border:0; border-top:1px solid #ccc; margin: 8px 0;">
              `)}
              <button class="add-btn" @click=${() => this._addSub(mIdx)}>+ Ajouter un sous-menu</button>
            </div>
          </div>
        `)}
        <button class="add-btn" @click=${() => this._addMenu()}>+ Ajouter un menu principal</button>
      </div>`;
  }

  _addMenu() { this._draftConfig.menus.push({ nom: "Nouveau Menu", couleur: "#ffffff", sous_menus: [] }); this.requestUpdate(); }
  _delMenu(idx) { if(confirm("Supprimer ce menu ?")) { this._draftConfig.menus.splice(idx, 1); this.requestUpdate(); } }
  _moveMenu(idx, dir) { const arr = this._draftConfig.menus; const n = idx + dir; if (n < 0 || n >= arr.length) return; [arr[idx], arr[n]] = [arr[n], arr[idx]]; this.requestUpdate(); }
  _addSub(mIdx) { this._draftConfig.menus[mIdx].sous_menus.push({ nom: "Nouvelle Page", icone: "📄", chemin: "/local/", couleur: "#ffffff", taille: "16px" }); this.requestUpdate(); }
  _delSub(mIdx, sIdx) { this._draftConfig.menus[mIdx].sous_menus.splice(sIdx, 1); this.requestUpdate(); }
  _moveSub(mIdx, sIdx, dir) { const arr = this._draftConfig.menus[mIdx].sous_menus; const n = sIdx + dir; if (n < 0 || n >= arr.length) return; [arr[sIdx], arr[n]] = [arr[n], arr[sIdx]]; this.requestUpdate(); }

  saveConfig() { fireEvent(this, 'config-changed', { config: this._draftConfig }); }
}

customElements.define('portail-card', PortailCard);
customElements.define('portail-editor', PortailEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: 'portail-card', name: 'Portail Maison', description: 'Portail web intégré avec menus dynamiques' });
