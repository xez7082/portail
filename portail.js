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
          display: block; 
          height: 550px; /* Hauteur fixe demandée */
          overflow: hidden;
          font-family: system-ui, -apple-system, sans-serif;
          background: var(--primary-background-color, #1c2431);
          color: var(--primary-text-color, #eef3fa);
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, none);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        /* --- HEADER ET MENU --- */
        header {
          background: var(--card-background-color, #27303f); 
          border-bottom: 2px solid var(--divider-color, #3c4a5e);
          padding: 0.5rem 0.8rem; 
          display: flex; align-items: center; gap: 0.5rem; 
          height: 50px;
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

        /* --- CORPS PRINCIPAL --- */
        main { display: flex; height: calc(550px - 50px); }
        
        /* --- SIDEBAR --- */
        aside {
          width: 200px; background: var(--card-background-color, #27303f);
          border-right: 2px solid var(--divider-color, #3c4a5e);
          padding: 0.5rem; display: flex; flex-direction: column; gap: 0.3rem; overflow-y: auto;
        }
        .sub-btn {
          display: flex; align-items: center; gap: 0.5rem; text-align: left;
          font-size: 0.85rem; font-weight: 600; color: var(--primary-text-color, #eef3fa);
          background: transparent; border: 2px solid transparent; border-radius: 8px;
          padding: 0.5rem; cursor: pointer;
        }
        .sub-btn:hover { background: var(--secondary-background-color, #31435c); }
        .sub-btn.active { background: var(--secondary-background-color, #31435c); border-left: 5px solid var(--accent-color, #3d8de0); color: var(--accent-color, #a8d1ff); }

        /* --- ZONE DE CONTENU (IFRAME POUR TES FICHIERS COMPLEXES) --- */
        #content { 
          flex: 1; position: relative; overflow: hidden;
        }
        iframe {
          width: 100%; height: 100%; border: none; background: #1c2431;
        }
        .placeholder {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          color: var(--secondary-text-color, #aebdd0); font-style: italic;
        }
      \`;
    }

    setConfig(config) {
      // Configuration par défaut avec tes vrais fichiers
      const defaultConfig = {
        menus: [
          {
            nom: "Météo",
            sous_menus: [
              { nom: "Météo HA WS", icone: "🌤️", chemin: "/local/portail/meteo_ha_ws.html", couleur: "#82b1ff" },
              { nom: "Météo Alsace", icone: "🗺️", chemin: "/local/portail/meteo_alsace.html", couleur: "#b9f6ca" }
            ]
          },
          {
            nom: "Zones",
            sous_menus: [
              { nom: "Étage", icone: "🛏️", chemin: "/local/portail/etage.html", couleur: "#ffcc80" }
            ]
          }
        ]
      };
      this._config = config && config.menus ? config : defaultConfig;
    }

    set hass(hass) {
      this._hass = hass;
    }

    get currentMenu() { return this._config.menus[this._activeMenu] || this._config.menus[0] || null; }
    get currentSubs() { return this.currentMenu ? this.currentMenu.sous_menus : []; }

    render() {
      const sub = this.currentSubs[this._activeSub];
      const src = sub && sub.chemin ? sub.chemin : "";

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
          </aside>

          <div id="content">
            \${src ? html\`<iframe src="\${src}"></iframe>\` : html\`<div class="placeholder">Sélectionnez un élément</div>\`}
          </div>
        </main>
      \`;
    }

    static getConfigElement() { return document.createElement("portail-editor"); }
  }

  // ======================================================================
  // ÉDITEUR VISUEL 
  // ======================================================================
  class PortailEditor extends LitElement {
    static get properties() {
      return { _config: { type: Object }, _hass: { type: Object }, _draft: { type: Object } };
    }
    
    static get styles() {
      return css\`
        * { box-sizing: border-box; font-family: system-ui, sans-serif; }
        .container { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; color: var(--primary-text-color); }
        h3 { margin: 0 0 0.5rem 0; border-bottom: 1px solid var(--divider-color); padding-bottom: 0.5rem; }
        .menu-block {
          background: var(--secondary-background-color); border: 1px solid var(--divider-color);
          border-radius: 8px; padding: 1rem; margin-bottom: 1rem;
        }
        .row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; }
        label { min-width: 80px; font-size: 0.85rem; font-weight: bold; }
        input[type="text"] { flex: 1; padding: 8px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--primary-background-color); color: var(--primary-text-color); }
        
        .sub-area { margin-left: 1rem; padding-left: 1rem; border-left: 3px solid var(--divider-color); margin-top: 0.5rem; }
        .sub-card { background: var(--primary-background-color); border: 1px solid var(--divider-color); border-radius: 8px; padding: 0.8rem; margin-bottom: 0.8rem; }
        
        .btn { background: var(--primary-color); color: #fff; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-weight: bold; }
        .btn-sm { padding: 4px 8px; font-size: 0.85rem; }
        .btn-danger { background: #ff5252; }
        .btn-ghost { background: transparent; border: 1px dashed var(--primary-color); color: var(--primary-color); width: 100%; margin-top: 0.5rem; padding: 10px;}
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
          <h3>Gestion des menus et pages</h3>
          <p style="font-size: 0.9rem; color: var(--secondary-text-color); margin: 0;">
            Ici, tu peux gérer les liens vers tes fichiers HTML complexes (comme le Canvas Météo). 
            La configuration spécifique des sensors de la météo se fait directement dans le fichier HTML en cliquant sur "⚙️ Config" dedans.
          </p>
          
          \${this._draft.menus.map((m, mIdx) => html\`
            <div class="menu-block">
              <div class="row">
                <label>Nom Menu</label>
                <input type="text" .value=\${m.nom} @input=\${(e) => { m.nom = e.target.value; this.requestUpdate(); }}>
                <button class="btn btn-sm btn-danger" @click=\${() => { this._draft.menus.splice(mIdx, 1); this.requestUpdate(); }}>X</button>
              </div>

              <div class="sub-area">
                \${m.sous_menus.map((s, sIdx) => html\`
                  <div class="sub-card">
                    <div class="row">
                      <label>Icône</label>
                      <input type="text" style="max-width: 60px; text-align:center;" .value=\${s.icone || ''} @input=\${(e) => { s.icone = e.target.value; }}>
                      <label>Nom</label>
                      <input type="text" style="flex:2" .value=\${s.nom} @input=\${(e) => { s.nom = e.target.value; }}>
                      <button class="btn btn-sm btn-danger" @click=\${() => { m.sous_menus.splice(sIdx, 1); this.requestUpdate(); }}>X</button>
                    </div>
                    <div class="row">
                      <label>Chemin HTML</label>
                      <input type="text" .value=\${s.chemin || ''} @input=\${(e) => { s.chemin = e.target.value; }} placeholder="/local/portail/mon_fichier.html">
                    </div>
                    <div class="row">
                      <label>Couleur</label>
                      <input type="color" style="max-width: 50px;" .value=\${s.couleur || '#ffffff'} @input=\${(e) => { s.couleur = e.target.value; }}>
                    </div>
                  </div>
                \`)}
                <button class="btn btn-ghost" @click=\${() => { 
                  m.sous_menus.push({nom: "Nouvelle Page", icone: "📄", chemin: "/local/", couleur: "#ffffff"}); 
                  this.requestUpdate(); 
                }}>
                  + Ajouter une page
                </button>
              </div>
            </div>
          \`)}
          
          <button class="btn btn-ghost" @click=\${() => { 
            this._draft.menus.push({nom: "Nouveau Menu", sous_menus: []}); 
            this.requestUpdate(); 
          }}>
            + Ajouter un menu principal
          </button>
        </div>
      \`;
    }

    saveConfig() {
      this.dispatchEvent(new CustomEvent('config-changed', { 
        detail: { config: this._draft }, 
        bubbles: true, 
        composed: true 
      }));
    }
  }

  customElements.define('portail-card', PortailCard);
  customElements.define('portail-editor', PortailEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'portail-card', name: 'Portail Maison', description: 'Portail intégré avec iframe pour fichiers complexes' });
`;
document.head.appendChild(litScript);
