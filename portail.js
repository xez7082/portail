const litScript = document.createElement('script');
litScript.type = 'module';
litScript.textContent = `
  import { LitElement, html, css } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';

  class PortailCard extends LitElement {
    static get properties() {
      return {
        _config: { type: Object },
        _hass: { type: Object },
        _activeMenu: { type: Number },
        _activeSub: { type: Number }
      };
    }

    static get styles() {
      return css\`
        :host {
          display: block; height: 550px; overflow: hidden;
          font-family: system-ui, -apple-system, sans-serif;
          background: var(--primary-background-color, #1c2431);
          color: var(--primary-text-color, #eef3fa);
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, none);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        header {
          background: var(--card-background-color, #27303f); border-bottom: 2px solid var(--divider-color, #3c4a5e);
          padding: 0.5rem 0.8rem; display: flex; align-items: center; gap: 0.5rem; height: 50px;
        }
        .brand { font-size: 1.1rem; font-weight: 700; color: var(--accent-color, #3d8de0); margin-right: 0.5rem; white-space: nowrap; }
        nav { display: flex; gap: 0.4rem; flex: 1; overflow-x: auto; }
        .menu-btn {
          font-size: 0.95rem; font-weight: 600; color: var(--secondary-text-color, #aebdd0);
          background: transparent; border: 2px solid transparent; border-radius: 8px;
          padding: 0.4rem 0.8rem; cursor: pointer; white-space: nowrap;
        }
        .menu-btn:hover { background: var(--secondary-background-color, #31435c); }
        .menu-btn.active { background: var(--accent-color, #3d8de0); color: #fff; }

        main { display: flex; height: calc(550px - 50px); }
        aside {
          width: 220px; background: var(--card-background-color, #27303f);
          border-right: 2px solid var(--divider-color, #3c4a5e);
          padding: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; overflow-y: auto;
        }
        .sub-btn {
          display: flex; align-items: center; gap: 0.6rem; text-align: left;
          font-size: 0.95rem; font-weight: 600; color: var(--primary-text-color, #eef3fa);
          background: transparent; border: 2px solid transparent; border-radius: 8px;
          padding: 0.6rem; cursor: pointer;
        }
        .sub-btn:hover { background: var(--secondary-background-color, #31435c); }
        .sub-btn.active { background: var(--secondary-background-color, #31435c); border-left: 5px solid var(--accent-color, #3d8de0); color: var(--accent-color, #a8d1ff); }

        #content { flex: 1; padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
        
        .sensor-card {
          background: var(--card-background-color, #27303f); border-radius: 12px;
          padding: 1rem; display: flex; align-items: center; gap: 1rem;
          border: 1px solid var(--divider-color, #3c4a5e);
        }
        .sensor-icon { font-size: 2rem; }
        .sensor-info { flex: 1; }
        .sensor-name { font-size: 0.9rem; color: var(--secondary-text-color, #aebdd0); margin-bottom: 0.2rem; }
        .sensor-state { font-size: 1.5rem; font-weight: 700; color: var(--primary-text-color, #eef3fa); }
        .sensor-unit { font-size: 1rem; font-weight: 400; color: var(--secondary-text-color, #aebdd0); margin-left: 0.3rem; }

        .empty { color: var(--secondary-text-color, #aebdd0); text-align: center; margin-top: 3rem; font-style: italic; }
      \`;
    }

    setConfig(config) {
      const defaultConfig = {
        menus: [
          { nom: "Exemple", sous_menus: [
            { nom: "Température", icone: "🌡️", sensor: "sensor.temperature_exterieure", couleur: "#ffffff" }
          ]}
        ]
      };
      this._config = config || defaultConfig;
    }

    set hass(hass) {
      this._hass = hass;
      // Force le rendu si l'état d'un sensor change
      if (this._activeMenu !== undefined) this.requestUpdate();
    }

    get currentMenu() { return this._config.menus[this._activeMenu] || this._config.menus[0] || null; }
    get currentSubs() { return this.currentMenu ? this.currentMenu.sous_menus : []; }

    _getSensorState(sensorId) {
      if (!this._hass || !sensorId) return { state: '---', unit: '' };
      const entity = this._hass.states[sensorId];
      if (!entity) return { state: 'Introuvable', unit: '' };
      return { 
        state: entity.state, 
        unit: entity.attributes.unit_of_measurement || '' 
      };
    }

    render() {
      return html\`
        <header>
          <span class="brand">🏠</span>
          <nav>
            \${this._config.menus.map((m, i) => html\`
              <button class="menu-btn \${this._activeMenu === i ? 'active' : ''}" @click=\${() => this._activeMenu = i}>
                \${m.nom}
              </button>
            \`)}
          </nav>
        </header>

        <main>
          <aside>
            \${this.currentSubs.map((s, i) => html\`
              <button class="sub-btn \${this._activeSub === i ? 'active' : ''}" 
                      style="color: \${s.couleur || 'inherit'}"
                      @click=\${() => this._activeSub = i}>
                <span>\${s.icone || '📄'}</span>
                <span>\${s.nom}</span>
              </button>
            \`)}
            \${this.currentSubs.length === 0 ? html\`<div class="empty">Aucun sous-menu</div>\` : ''}
          </aside>

          <div id="content">
            \${this._renderContent()}
          </div>
        </main>
      \`;
    }

    _renderContent() {
      const sub = this.currentSubs[this._activeSub];
      if (!sub) return html\`<div class="empty">Sélectionnez un élément</div>\`;

      if (sub.sensor) {
        const data = this._getSensorState(sub.sensor);
        return html\`
          <div class="sensor-card">
            <div class="sensor-icon">\${sub.icone || '📊'}</div>
            <div class="sensor-info">
              <div class="sensor-name">\${sub.nom}</div>
              <div class="sensor-state">\${data.state}<span class="sensor-unit">\${data.unit}</span></div>
            </div>
          </div>
        \`;
      }
      return html\`<div class="empty">Aucun sensor configuré pour cet élément.</div>\`;
    }

    static getConfigElement() { return document.createElement("portail-editor"); }
  }

  // ======================================================================
  // ÉDITEUR VISUEL AVEC SÉLECTEUR DE SENSOR
  // ======================================================================
  class PortailEditor extends LitElement {
    static get properties() {
      return { _config: { type: Object }, _hass: { type: Object }, _draft: { type: Object } };
    }
    
    static get styles() {
      return css\`
        * { box-sizing: border-box; font-family: system-ui, sans-serif; }
        .container { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; color: var(--primary-text-color); }
        h3 { margin: 0 0 0.5rem 0; }
        .menu-block {
          background: var(--secondary-background-color); border: 1px solid var(--divider-color);
          border-radius: 8px; padding: 1rem; margin-bottom: 1rem;
        }
        .row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; }
        label { min-width: 80px; font-size: 0.9rem; font-weight: bold; }
        input[type="text"] { flex: 1; padding: 8px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--primary-background-color); color: var(--primary-text-color); }
        .sub-area { margin-left: 1rem; padding-left: 1rem; border-left: 3px solid var(--divider-color); margin-top: 0.5rem; }
        
        .btn { background: var(--primary-color); color: #fff; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-weight: bold; }
        .btn-sm { padding: 4px 8px; font-size: 0.9rem; }
        .btn-danger { background: #ff5252; }
        .btn-ghost { background: transparent; border: 1px dashed var(--primary-color); color: var(--primary-color); width: 100%; margin-top: 0.5rem; }
      \`;
    }

    setConfig(config) {
      this._config = config;
      this._draft = JSON.parse(JSON.stringify(config));
    }

    set hass(hass) { this._hass = hass; }

    render() {
      if (!this._draft) return html\`\`;
      return html\`
        <div class="container">
          <h3>Configuration des Menus et Sensors</h3>
          
          \${this._draft.menus.map((m, mIdx) => html\`
            <div class="menu-block">
              <div class="row">
                <label>Menu</label>
                <input type="text" .value=\${m.nom} @input=\${(e) => { m.nom = e.target.value; this.requestUpdate(); }}>
                <button class="btn btn-sm btn-danger" @click=\${() => { this._draft.menus.splice(mIdx, 1); this.requestUpdate(); }}>X</button>
              </div>

              <div class="sub-area">
                \${m.sous_menus.map((s, sIdx) => html\`
                  <div class="menu-block" style="background: var(--primary-background-color);">
                    <div class="row">
                      <label>Icône</label>
                      <input type="text" style="max-width: 60px; text-align:center;" .value=\${s.icone || ''} @input=\${(e) => { s.icone = e.target.value; }}>
                      <label>Nom</label>
                      <input type="text" .value=\${s.nom} @input=\${(e) => { s.nom = e.target.value; }}>
                      <button class="btn btn-sm btn-danger" @click=\${() => { m.sous_menus.splice(sIdx, 1); this.requestUpdate(); }}>X</button>
                    </div>
                    <div class="row">
                      <label>Sensor</label>
                      <!-- Le vrai sélecteur d'entité de Home Assistant -->
                      <ha-entity-picker 
                        .hass=\${this._hass} 
                        .value=\${s.sensor} 
                        .configValue=\${'sensor'}
                        @change=\${(e) => { s.sensor = e.target.value; this.requestUpdate(); }}
                        allow-custom-entity
                      ></ha-entity-picker>
                    </div>
                    <div class="row">
                      <label>Couleur</label>
                      <input type="color" style="max-width: 50px;" .value=\${s.couleur || '#ffffff'} @input=\${(e) => { s.couleur = e.target.value; }}>
                    </div>
                  </div>
                \`)}
                <button class="btn btn-ghost" @click=\${() => { m.sous_menus.push({nom: "Nouveau", icone: "📄", sensor: "", couleur: "#ffffff"}); this.requestUpdate(); }}>
                  + Ajouter un sous-menu / sensor
                </button>
              </div>
            </div>
          \`)}
          
          <button class="btn btn-ghost" @click=\${() => { this._draft.menus.push({nom: "Nouveau Menu", sous_menus: []}); this.requestUpdate(); }}>
            + Ajouter un menu principal
          </button>
        </div>
      \`;
    }

    saveConfig() {
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._draft }, bubbles: true, composed: true }));
    }
  }

  customElements.define('portail-card', PortailCard);
  customElements.define('portail-editor', PortailEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'portail-card', name: 'Portail Maison', description: 'Portail avec sensors en dur et éditeur visuel' });
`;
document.head.appendChild(litScript);
