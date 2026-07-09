// ── meteo-card.js ──────────────────────────────────────────────
// Carte météo native Home Assistant (remplace meteo_ha_ws.html).
// Aucun token, aucun WebSocket manuel : utilise hass.states et
// hass.connection (déjà authentifiés par HA). Éditeur visuel avec
// sélecteurs d'entités natifs (ha-entity-picker) pour chaque capteur.

const LitElement = Object.getPrototypeOf(
  customElements.get('ha-panel-lovelace') || customElements.get('hui-view')
);
const { html, css } = LitElement.prototype;

function fireEvent(node, type, detail = {}, options = {}) {
  const event = new CustomEvent(type, {
    bubbles: options.bubbles !== undefined ? options.bubbles : true,
    cancelable: Boolean(options.cancelable),
    composed: options.composed !== undefined ? options.composed : true,
    detail,
  });
  node.dispatchEvent(event);
  return event;
}

const DEFAULTS = {
  weather: 'weather.sainte_croix_en_plaine',
  weather_secondary: 'weather.pirateweather',
  uv: 'sensor.colmar_uv',
  rain: 'sensor.colmar_daily_precipitation',
  moon: 'sensor.phase_de_la_lune_fr',
  ng: 'sensor.niveau_gramine_sainte_croix_en_plaine',
  nb: 'sensor.niveau_bouleau_sainte_croix_en_plaine',
  na: 'sensor.niveau_ambroisie_sainte_croix_en_plaine',
  nu: 'sensor.niveau_aulne_sainte_croix_en_plaine',
  nr: 'sensor.niveau_armoise_sainte_croix_en_plaine',
  no: 'sensor.niveau_olivier_sainte_croix_en_plaine',
  cg: 'sensor.concentration_gramine_sainte_croix_en_plaine',
  cb: 'sensor.concentration_bouleau_sainte_croix_en_plaine',
  ca: 'sensor.concentration_ambroisie_sainte_croix_en_plaine',
  cu: 'sensor.concentration_aulne_sainte_croix_en_plaine',
  crr: 'sensor.concentration_armoise_sainte_croix_en_plaine',
  co: 'sensor.concentration_olivier_sainte_croix_en_plaine',
  qp: 'sensor.qualite_globale_pollen_sainte_croix_en_plaine',
  qa: 'sensor.qualite_globale_sainte_croix_en_plaine',
};

const SMAP = {
  sunny:'sun', 'clear-day':'sun', 'clear-night':'night', cloudy:'cloud', partlycloudy:'cloud',
  overcast:'over', rainy:'rain', drizzle:'rain', snowy:'snow', fog:'fog',
  thunderstorm:'storm', thundery:'storm', hail:'storm',
  'ensoleillé':'sun', 'ciel clair':'sun', nuageux:'cloud', 'partiellement nuageux':'cloud',
  variable:'cloud', couvert:'over', pluie:'rain', averses:'rain', 'averses faibles':'rain',
  'pluies orageuses':'storm', orage:'storm', brouillard:'fog', brume:'fog', neige:'snow',
};
const WICO = {
  sunny:'☀️', 'clear-day':'☀️', 'clear-night':'🌙', cloudy:'⛅', overcast:'☁️',
  rainy:'🌧️', snowy:'❄️', fog:'🌫️', thunderstorm:'⛈️', partlycloudy:'🌤️',
  'ensoleillé':'☀️', 'ciel clair':'☀️', nuageux:'⛅', couvert:'☁️',
  pluie:'🌧️', averses:'🌦️', orage:'⛈️', neige:'❄️',
};
const WLBL = {
  'clear-day':'Ensoleillé', 'clear-night':'Ciel clair', 'partly-cloudy-day':'Partiellement nuageux',
  'partly-cloudy-night':'Partiellement nuageux', cloudy:'Nuageux', overcast:'Couvert', rain:'Pluie',
  drizzle:'Bruine', sleet:'Grésil', snow:'Neige', wind:'Venteux', fog:'Brouillard',
  thunderstorm:'Orage', hail:'Grêle', sunny:'Ensoleillé',
};
const DAYS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const VM = { g:'ag', y:'ay', o:'ao', r:'ar' }, VD = { g:'dg', y:'dy', o:'do', r:'dr' };
const BORDER = {
  sun:{c:'rgba(255,210,80,.7)',a:'#ffd54f'}, cloud:{c:'rgba(140,185,240,.6)',a:'#90caf9'},
  over:{c:'rgba(100,130,175,.5)',a:'#78909c'}, rain:{c:'rgba(70,130,200,.6)',a:'#42a5f5'},
  storm:{c:'rgba(150,80,220,.65)',a:'#ce93d8'}, snow:{c:'rgba(180,215,255,.7)',a:'#e3f2fd'},
  fog:{c:'rgba(160,185,200,.5)',a:'#b0bec5'}, night:{c:'rgba(80,100,200,.6)',a:'#7986cb'},
  sunrise:{c:'rgba(255,140,60,.7)',a:'#ffb74d'}, sunset:{c:'rgba(220,80,40,.7)',a:'#ff7043'},
};

class MeteoCard extends LitElement {
  static get properties() { return { _config: { type: Object }, hass: { type: Object } }; }

  static get styles() { return css`
    :host{display:block;height:100%;min-height:340px}
    #wrap{position:relative;width:100%;height:100%;min-height:340px;overflow:hidden;
      font-family:ui-monospace,Consolas,monospace;color:#fff;border-radius:var(--ha-card-border-radius,12px)}
    #sky{position:absolute;inset:0;width:100%;height:100%;z-index:1;display:block}
    #card{position:absolute;inset:8px;z-index:5;background:rgba(28,36,49,.55);
      border:1.5px solid rgba(77,163,255,.55);border-radius:15px;box-shadow:0 0 25px rgba(77,163,255,.22);
      padding:12px 15px;display:flex;flex-direction:column;gap:clamp(4px,1vh,14px);
      overflow-y:auto;overflow-x:hidden;scrollbar-width:thin}
    #hdr{display:flex;justify-content:space-between;align-items:center;
      border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:7px;flex-shrink:0;gap:8px}
    #hdr-txt{flex:1;font-size:12px;color:rgba(255,255,255,.9)}
    #hdr-txt b{color:#a8d1ff}
    #meteo{display:grid;grid-template-columns:1fr 1fr;font-size:13px;line-height:1.78;flex-shrink:0}
    #meteo b{color:#fff}
    #mc2{border-left:1px solid rgba(255,255,255,.1);padding-left:12px}
    #fc-row{display:flex;gap:5px;flex-shrink:0;overflow-x:auto;scrollbar-width:none}
    .fc{flex:1;min-width:90px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
      border-radius:10px;padding:9px 5px;text-align:center}
    .fc.today{background:rgba(77,163,255,.14);border-color:rgba(77,163,255,.32)}
    .fcd{font-size:15px;font-weight:700;color:rgba(255,255,255,.88);margin-bottom:3px}
    .fci{font-size:28px;display:block;margin:4px 0}
    .fch{font-size:16px;font-weight:700;color:#fff}
    .fcl{font-size:14px;color:rgba(255,255,255,.5)}
    .stl{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.55);margin-bottom:6px}
    #pol-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
    .pi{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
      border-radius:10px;padding:9px 6px;text-align:center}
    .pn{font-size:17px;font-weight:700;color:rgba(255,255,255,.92);margin-bottom:5px;line-height:1.3}
    .pb{font-size:13px;font-weight:700;border-radius:6px;padding:4px 10px;display:inline-block}
    .pbar{height:3px;background:rgba(255,255,255,.1);border-radius:2px;margin-top:6px;overflow:hidden}
    .pbf{height:100%;border-radius:2px;transition:width 1.2s ease}
    .pc{font-size:12px;color:rgba(255,255,255,.5);display:block;margin-top:4px}
    #alt-list{display:flex;flex-direction:column;gap:3px}
    .ai{border-radius:7px;padding:5px 9px;display:flex;align-items:center;gap:6px;border:1px solid;font-size:11px}
    .ag{background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.25)}
    .ay{background:rgba(234,179,8,.1);border-color:rgba(234,179,8,.3)}
    .ao{background:rgba(249,115,22,.1);border-color:rgba(249,115,22,.3)}
    .ar{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.3)}
    .adot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
    .dg{background:#4ade80}.dy{background:#fbbf24}.do{background:#fb923c}.dr{background:#f87171}
    #empty{padding:24px;text-align:center;color:rgba(255,255,255,.6);font-size:13px}

    /* ═══ Compaction automatique (ResizeObserver sur le host) ═══
       Garantit qu'il n'y a jamais besoin de scroller dans la carte,
       quelle que soit la hauteur accordée par le tableau de bord. */
    :host(.h-tight) #card{padding:8px 12px;gap:4px}
    :host(.h-tight) #hdr-txt{font-size:11px}
    :host(.h-tight) #meteo{font-size:12px;line-height:1.5}
    :host(.h-tight) .fc{padding:6px 4px;min-width:70px}
    :host(.h-tight) .fci{font-size:20px;margin:2px 0}
    :host(.h-tight) .fch{font-size:14px}
    :host(.h-tight) .pi{padding:6px 4px}
    :host(.h-tight) .pn{font-size:14px;margin-bottom:3px}
    :host(.h-tight) .pb{font-size:11px;padding:2px 6px}
    :host(.h-tight) .pc{display:none}
    :host(.h-vtight) #fc-row{display:none}
    :host(.h-vtight) #alt-list{display:none}
    :host(.h-vtight) .stl{display:none}
    :host(.h-vtight) #pol-grid{grid-template-columns:repeat(3,1fr)}
  `; }

  setConfig(config) {
    if (!config || !config.weather) {
      throw new Error('meteo-card : indique au moins une entité "weather" dans la configuration.');
    }
    this._config = { ...DEFAULTS, ...config };
  }

  static getStubConfig() { return DEFAULTS; }
  static getConfigElement() { return document.createElement('meteo-card-editor'); }
  getCardSize() { return 6; }

  /* Dashboards "Sections" : sans ceci, HA impose une hauteur fixe (souvent 600px)
     qui ne s'adapte pas au contenu. On indique une plage confortable et
     redimensionnable, plutôt qu'une taille figée. */
  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: 9, min_rows: 6, max_rows: 14 };
  }

  firstUpdated() {
    this._cvs = this.renderRoot.getElementById('sky');
    this._ctx = this._cvs.getContext('2d');
    this._tick = 0; this._drops = []; this._flakes = []; this._sparkles = [];
    this._clouds = []; this._stars = []; this._scene = 'cloud';
    this._resize();
    setTimeout(() => this._resize(), 200);
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this._cvs);
    this._setScene('cloud');
    this._raf = requestAnimationFrame(() => this._frame());
    this._subscribeForecast();

    /* Compacte automatiquement le contenu selon la hauteur réellement
       accordée par le tableau de bord, pour ne jamais avoir besoin de scroller. */
    this._hro = new ResizeObserver(entries => {
      const h = entries[0].contentRect.height;
      this.classList.toggle('h-tight', h < 460);
      this.classList.toggle('h-vtight', h < 360);
    });
    this._hro.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._ro) this._ro.disconnect();
    if (this._hro) this._hro.disconnect();
    if (this._unsubForecast) this._unsubForecast();
  }

  updated(changed) {
    if (changed.has('hass') || changed.has('_config')) this._applyScene();
    if (changed.has('_config') && !changed.has('hass')) this._subscribeForecast();
  }

  async _subscribeForecast() {
    if (!this.hass || !this._config) return;
    if (this._unsubForecast) { this._unsubForecast(); this._unsubForecast = null; }
    try {
      this._unsubForecast = await this.hass.connection.subscribeMessage(
        (msg) => { this._forecast = msg.forecast || []; this.requestUpdate(); },
        { type: 'weather/subscribe_forecast', entity_id: this._config.weather, forecast_type: 'daily' }
      );
    } catch (e) { this._forecast = []; }
  }

  _s(key) { return this.hass && this._config ? this.hass.states[this._config[key]] : undefined; }

  _applyScene() {
    if (!this.hass || !this._config) return;
    const w = this._s('weather');
    const wstate = w ? w.state : 'cloudy';
    const sc = SMAP[wstate] || 'cloud';
    const sunAttr = (this.hass.states['sun.sun'] && this.hass.states['sun.sun'].attributes) || {};
    const elev = sunAttr.elevation ?? 90, rising = sunAttr.rising ?? false;
    let finalScene = sc;
    if (elev < -6) finalScene = 'night';
    else if (elev < 4 && rising) finalScene = 'sunrise';
    else if (elev < 4 && !rising) finalScene = 'sunset';
    if (finalScene !== this._scene) this._setScene(finalScene);
    this._applyBorder(finalScene);
  }

  _applyBorder(s) {
    const b = BORDER[s] || BORDER.cloud;
    const card = this.renderRoot.getElementById('card');
    if (!card) return;
    card.style.borderColor = b.c;
    card.style.boxShadow = `0 0 28px ${b.c},inset 0 1px 0 rgba(255,255,255,.06)`;
    this.renderRoot.querySelectorAll('.stl').forEach(el => el.style.color = b.a);
  }

  _resize() {
    if (!this._cvs) return;
    this._W = this._cvs.width = this._cvs.offsetWidth || 680;
    this._H = this._cvs.height = this._cvs.offsetHeight || 400;
  }

  _drawBg(s) {
    const ctx = this._ctx, W = this._W, H = this._H;
    let g = ctx.createLinearGradient(0, 0, 0, H);
    const stops = {
      sun:[[0,'#0a4a9e'],[.35,'#1565c8'],[.65,'#2e86e8'],[.85,'#64b5f6'],[1,'#b3dff5']],
      cloud:[[0,'#1a3a6e'],[.4,'#2a5298'],[.7,'#4a7cc4'],[1,'#8fa5c8']],
      over:[[0,'#1a202e'],[.4,'#252e42'],[.7,'#334060'],[1,'#6a7e9e']],
      rain:[[0,'#080e1a'],[.4,'#0e1830'],[.7,'#1a3050'],[1,'#3a5878']],
      storm:[[0,'#040208'],[.4,'#0c0820'],[.7,'#160e38'],[1,'#261848']],
      snow:[[0,'#1a2a48'],[.4,'#2a3e6a'],[.7,'#6688be'],[1,'#c8dcea']],
      fog:[[0,'#1a2028'],[.4,'#404e62'],[.7,'#7e96a8'],[1,'#bcccd8']],
      night:[[0,'#000308'],[.4,'#020818'],[.7,'#050f2a'],[1,'#0a1030']],
      sunrise:[[0,'#0d1a3a'],[.3,'#2a3c7a'],[.55,'#9a5a7a'],[.75,'#d4784a'],[.9,'#f0a040'],[1,'#f8d060']],
      sunset:[[0,'#0a0e28'],[.3,'#2a1e5a'],[.55,'#8a3050'],[.75,'#c45030'],[.9,'#e87828'],[1,'#f8d060']],
    };
    (stops[s] || [[0,'#07101e'],[1,'#1a2a4a']]).forEach(([o,c]) => g.addColorStop(o,c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  _makeStars() { this._stars = []; for (let i=0;i<120;i++) this._stars.push({x:Math.random()*this._W,y:Math.random()*this._H*.7,r:Math.random()*1.5+.3,ph:Math.random()*Math.PI*2,spd:.02+Math.random()*.04}); }
  _drawStars() { const ctx=this._ctx; this._stars.forEach(s=>{const o=.2+.6*Math.max(0,Math.sin(this._tick*s.spd+s.ph));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${o.toFixed(2)})`;ctx.fill();}); }

  _drawMoon() {
    const ctx=this._ctx,W=this._W,H=this._H,mx=W*.15,my=H*.18;
    const mg=ctx.createRadialGradient(mx,my,0,mx,my,45);
    mg.addColorStop(0,'rgba(255,248,220,.95)');mg.addColorStop(.6,'rgba(255,240,180,.7)');mg.addColorStop(1,'rgba(255,220,120,0)');
    ctx.fillStyle=mg;ctx.beginPath();ctx.arc(mx,my,45,0,Math.PI*2);ctx.fill();
    const halo=ctx.createRadialGradient(mx,my,30,mx,my,90);
    halo.addColorStop(0,'rgba(255,240,150,.12)');halo.addColorStop(1,'transparent');
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(mx,my,90,0,Math.PI*2);ctx.fill();
  }

  _drawSun() {
    const ctx=this._ctx,W=this._W,H=this._H,cx=W*.85,cy=-30;
    const halo=ctx.createRadialGradient(cx,cy,0,cx,cy,320);
    halo.addColorStop(0,'rgba(255,230,80,.45)');halo.addColorStop(.3,'rgba(255,180,50,.2)');halo.addColorStop(.6,'rgba(255,140,0,.08)');halo.addColorStop(1,'transparent');
    ctx.fillStyle=halo;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(this._tick*.003);
    for(let i=0;i<24;i++){const a=(i/24)*Math.PI*2;
      const gr=ctx.createLinearGradient(0,0,Math.cos(a)*300,Math.sin(a)*300);
      gr.addColorStop(0,'rgba(255,240,100,.3)');gr.addColorStop(1,'transparent');
      ctx.strokeStyle=gr;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*300,Math.sin(a)*300);ctx.stroke();}
    ctx.restore();
    const disc=ctx.createRadialGradient(cx,cy,0,cx,cy,90);
    disc.addColorStop(0,'rgba(255,255,210,.95)');disc.addColorStop(.5,'rgba(255,230,80,.8)');disc.addColorStop(1,'transparent');
    ctx.fillStyle=disc;ctx.beginPath();ctx.arc(cx,cy,90,0,Math.PI*2);ctx.fill();
    this._sparkles.forEach(p=>{const sv=Math.sin(this._tick*p.spd+p.ph),o=p.op*(.1+.9*Math.max(0,sv)),r=p.r*(.5+.7*Math.max(0,sv));
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=`rgba(255,240,100,${o.toFixed(2)})`;ctx.fill();});
  }

  _cloudPuff(cx,cy,r,light,alpha) {
    const ctx=this._ctx;
    const g=ctx.createRadialGradient(cx,cy-r*.1,r*.05,cx,cy,r);
    g.addColorStop(0,`rgba(${light},${alpha})`);g.addColorStop(.6,`rgba(${light},${(alpha*.6).toFixed(2)})`);g.addColorStop(1,`rgba(${light},0)`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
  }
  _drawOneCloud(x,y,sc,dark) {
    const col=dark?'130,145,175':'230,242,255', shad=dark?'70,80,105':'150,175,210';
    this._cloudPuff(x,y+10*sc,55*sc,shad,.4);this._cloudPuff(x+70*sc,y+12*sc,42*sc,shad,.3);
    this._cloudPuff(x+35*sc,y+8*sc,58*sc,col,.92);this._cloudPuff(x,y,48*sc,col,.88);
    this._cloudPuff(x+75*sc,y+2*sc,38*sc,col,.82);this._cloudPuff(x+22*sc,y-25*sc,38*sc,col,.9);
    this._cloudPuff(x+55*sc,y-18*sc,32*sc,col,.85);this._cloudPuff(x-15*sc,y-8*sc,28*sc,col,.75);
    this._cloudPuff(x+90*sc,y-5*sc,25*sc,col,.7);this._cloudPuff(x+32*sc,y-10*sc,20*sc,'255,255,255',dark?.12:.4);
  }
  _makeClouds(s) {
    this._clouds=[];
    const n=s==='over'?8:s==='storm'?6:s==='cloud'?5:s==='rain'?6:s==='fog'?4:0;
    const dark=['over','storm','rain','fog'].includes(s);
    for(let i=0;i<n;i++) this._clouds.push({x:Math.random()*(this._W+600)-600,y:20+Math.random()*(this._H*.38),sc:.5+Math.random()*.8,spd:.18+Math.random()*.28,dark});
  }
  _drawClouds() {
    this._clouds.forEach(c=>{c.x+=c.spd;if(c.x>this._W+150){c.x=-600;c.y=20+Math.random()*(this._H*.38);}this._drawOneCloud(c.x,c.y,c.sc,c.dark);});
  }

  _makeDrops(n) { this._drops=[]; for(let i=0;i<n;i++) this._drops.push({x:Math.random()*this._W*1.3,y:Math.random()*this._H,len:8+Math.random()*22,spd:6+Math.random()*10,op:.3+Math.random()*.5,w:.5+Math.random()*1.5}); }
  _drawRain(storm) {
    const ctx=this._ctx,W=this._W,H=this._H,ang=12*Math.PI/180,sa=Math.sin(ang),ca=Math.cos(ang);
    if(storm){const t=this._tick%220;if(t<3||(t>7&&t<10)){ctx.fillStyle='rgba(200,220,255,.3)';ctx.fillRect(0,0,W,H);}}
    this._drops.forEach(p=>{ctx.strokeStyle=`rgba(180,220,255,${p.op})`;ctx.lineWidth=p.w;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+sa*p.len,p.y+ca*p.len);ctx.stroke();
      p.y+=p.spd;p.x+=p.spd*.22;if(p.y>H+40){p.y=-60;p.x=Math.random()*W*1.3;}});
  }

  _makeFlakes() { this._flakes=[]; for(let i=0;i<100;i++) this._flakes.push({x:Math.random()*this._W,y:Math.random()*this._H,r:1+Math.random()*5,spd:.3+Math.random()*1.2,dx:Math.random()*.5-.25,op:.4+Math.random()*.6,ph:Math.random()*Math.PI*2}); }
  _drawSnow() {
    const ctx=this._ctx,H=this._H,W=this._W;
    this._flakes.forEach(p=>{p.x+=Math.sin(this._tick*.02+p.ph)*.4+p.dx;p.y+=p.spd;if(p.y>H+10){p.y=-10;p.x=Math.random()*W;}
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(240,248,255,${p.op})`;ctx.fill();});
  }

  _drawFog() {
    const ctx=this._ctx,W=this._W;
    for(let i=0;i<8;i++){const ox=Math.sin(this._tick*.004+i*1.3)*40,y=30+i*65;
      const g=ctx.createLinearGradient(0,y-60,0,y+60);
      g.addColorStop(0,'transparent');g.addColorStop(.5,`rgba(200,215,225,${.08+i*.012})`);g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.save();ctx.translate(ox,0);ctx.fillRect(-50,y-60,W+100,120);ctx.restore();}
  }

  _setScene(s) {
    this._scene=s; this._drops=[]; this._flakes=[]; this._sparkles=[]; this._clouds=[];
    this._makeClouds(s);
    if(s==='rain')this._makeDrops(120);
    if(s==='storm')this._makeDrops(200);
    if(s==='snow')this._makeFlakes();
    if(s==='sun')for(let i=0;i<60;i++)this._sparkles.push({x:Math.random()*this._W,y:Math.random()*this._H,r:.5+Math.random()*2.5,op:.3+Math.random()*.6,ph:Math.random()*Math.PI*2,spd:.015+Math.random()*.025});
    if(s==='night')this._makeStars();
  }

  _frame() {
    this._tick++;
    if (this._ctx && this._W) {
      this._drawBg(this._scene);
      if(this._scene==='night'){this._drawStars();this._drawMoon();}
      else if(this._scene==='sun')this._drawSun();
      if(['cloud','over','rain','storm','fog'].includes(this._scene))this._drawClouds();
      if(this._scene==='rain')this._drawRain(false);
      if(this._scene==='storm')this._drawRain(true);
      if(this._scene==='snow')this._drawSnow();
      if(this._scene==='fog')this._drawFog();
    }
    this._raf = requestAnimationFrame(() => this._frame());
  }

  _niveauInfo(entity) {
    if(!entity||!['1','2','3','4','5'].includes(String(entity.state))) return {l:'N/A',p:0,col:'#555'};
    const n=parseInt(entity.state);
    const lbl=(entity.attributes && entity.attributes['Libellé']) || '';
    const col=(entity.attributes && entity.attributes['Couleur']) || '#888';
    return {l:lbl||['','Très faible','Faible','Modéré','Élevé','Très élevé'][n]||'?',p:Math.round(n/5*100),col:col==='#ddd'?'#555':col};
  }
  _makeAlerts(wspeed,wstate,mx) {
    const al=[];
    if(wstate.includes('thunder'))al.push({v:'o',t:'⛈ Orages — Vigilance orange'});
    else if(wstate.includes('rain')||wstate.includes('drizzle'))al.push({v:'y',t:'🌧 Pluie — Vigilance jaune'});
    if(mx>=35)al.push({v:'r',t:`🌡 Canicule — ${mx}°C`});
    else if(mx>=30)al.push({v:'o',t:`🌡 Chaleur — ${mx}°C`});
    if(wspeed>=80)al.push({v:'o',t:`💨 Vent violent — ${Math.round(wspeed)} km/h`});
    else if(wspeed>=60)al.push({v:'y',t:`💨 Vent fort — ${Math.round(wspeed)} km/h`});
    if(wstate.includes('snow'))al.push({v:'y',t:'❄ Épisode neigeux'});
    if(wstate.includes('fog'))al.push({v:'y',t:'🌫 Brouillard'});
    if(!al.length)al.push({v:'g',t:'✓ Aucune alerte en cours'});
    return al;
  }

  render() {
    if (!this._config) return html``;
    if (!this.hass) return html`<div id="empty">Chargement…</div>`;
    const c = this._config;
    const w = this._s('weather');
    if (!w) return html`<div id="empty">Entité météo introuvable : ${c.weather}</div>`;

    const wstate = w.state || 'cloudy';
    const wa = w.attributes || {};
    const pw = (this.hass.states[c.weather_secondary] && this.hass.states[c.weather_secondary].attributes) || {};
    const sunAttr = (this.hass.states['sun.sun'] && this.hass.states['sun.sun'].attributes) || {};

    const uv = (this._s('uv') && this._s('uv').state) ?? '–';
    const rain = (this._s('rain') && this._s('rain').state) ?? '–';
    const moon = (this._s('moon') && this._s('moon').state) ?? '–';
    const vis = pw.visibility !== undefined ? pw.visibility : (wa.visibility ?? '–');
    const res = pw.apparent_temperature ?? pw.feels_like ?? wa.apparent_temperature ?? wa.feels_like ?? '–';

    const nr = new Date(sunAttr.next_rising || 0).getTime(), ns = new Date(sunAttr.next_setting || 0).getTime();
    const tr = nr < ns ? nr : nr - 86400000;
    const rise = tr ? new Date(tr).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '--:--';
    const set = ns ? new Date(ns).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '--:--';
    const dh = Math.floor((ns-tr)/3600000), dm = Math.floor(((ns-tr)%3600000)/60000);
    const day = Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/86400000);
    const v = day<=80?(1.5+day*.03):day<=172?(4-(day-80)*.043):day<=264?(-(day-172)*.043):(-4+(day-264)*.04);
    const wIco = WICO[wstate] || '🌥️';
    const wLbl = WLBL[wstate] || wstate;

    const forecast = this._forecast || [];
    const polls = [
      {n:'🌾 Graminées',nk:'ng',ck:'cg'},{n:'🌳 Bouleau',nk:'nb',ck:'cb'},{n:'🌱 Ambroisie',nk:'na',ck:'ca'},
      {n:'🌲 Aulne',nk:'nu',ck:'cu'},{n:'🌿 Armoise',nk:'nr',ck:'crr'},{n:'🫒 Olivier',nk:'no',ck:'co'},
    ];
    const qp = this._s('qp'), qa = this._s('qa');
    const qpL = (qp && qp.attributes && qp.attributes['Libellé']) || '–';
    const qpC = (qp && qp.attributes && qp.attributes['Couleur']) || '#888';
    const qaL = (qa && qa.attributes && qa.attributes['Libellé']) || '–';
    const qaC = (qa && qa.attributes && qa.attributes['Couleur']) || '#888';
    const als = this._makeAlerts(wa.wind_speed || 0, wstate, wa.temperature || 0);

    return html`
      <div id="wrap">
        <canvas id="sky"></canvas>
        <div id="card">
          <div id="hdr">
            <div id="hdr-txt">
              <span style="font-size:16px">${wIco}</span>
              <span style="font-size:14px;font-weight:700;color:#fff;margin-right:10px">${wLbl}</span>
              <span style="opacity:.6;font-size:11px">🌅<b>${rise}</b> 🌇<b>${set}</b> ⏱<b>${dh}h${String(dm).padStart(2,'0')}</b> 📈<b>${v>0?'+':''}${v.toFixed(1)}m</b></span>
            </div>
          </div>
          <div id="meteo">
            <div id="mc1">
              🌡️ Temp <b>${wa.temperature ?? '–'}°C</b><br>
              🌬️ Vent <b>${wa.wind_speed ?? '–'} km/h</b><br>
              👁️ Visib. <b>${vis} km</b><br>
              🌡 Press. <b>${wa.pressure ?? '–'} hPa</b>
            </div>
            <div id="mc2">
              💧 Humid. <b>${wa.humidity ?? '–'}%</b><br>
              ☀️ UV <b>${uv}</b> | 🌧️ <b>${rain}mm</b><br>
              🌙 Lune <b>${moon}</b><br>
              🤗 Ressenti <b>${res}°C</b>
            </div>
          </div>
          <div id="fc-row">
            ${forecast.length ? forecast.slice(0,7).map((d,i) => {
              const dt = new Date(d.datetime), label = i===0 ? "Aujourd'hui" : DAYS[dt.getDay()];
              return html`<div class="fc ${i===0?'today':''}">
                <div class="fcd">${label}</div>
                <span class="fci">${WICO[d.condition]||'🌥️'}</span>
                <span class="fch">${Math.round(d.temperature??0)}°</span> <span class="fcl">${Math.round(d.templow??0)}°</span>
              </div>`;
            }) : html`<div style="font-size:11px;color:rgba(255,255,255,.3);padding:4px">Prévisions indisponibles</div>`}
          </div>
          <div>
            <div class="stl">🌿 Pollen
              <span style="border-radius:5px;padding:2px 7px;font-size:10px;font-weight:700;background:${qpC}33;color:${qpC};border:1px solid ${qpC}55">${qpL}</span>
              &nbsp;🏭 Air
              <span style="border-radius:5px;padding:2px 7px;font-size:10px;font-weight:700;background:${qaC}33;color:${qaC};border:1px solid ${qaC}55">${qaL}</span>
            </div>
            <div id="pol-grid">
              ${polls.map(p => {
                const ni = this._niveauInfo(this._s(p.nk));
                const cvEnt = this._s(p.ck);
                const cv = cvEnt && cvEnt.state;
                const conc = (cv && cv!=='unavailable') ? parseFloat(cv).toFixed(1) : null;
                return html`<div class="pi">
                  <div class="pn">${p.n}</div>
                  <span class="pb" style="background:${ni.col}33;color:${ni.col};border:1px solid ${ni.col}55">${ni.l}</span>
                  ${conc ? html`<span class="pc">${conc}µg</span>` : ''}
                  <div class="pbar"><div class="pbf" style="width:${ni.p}%;background:${ni.col}"></div></div>
                </div>`;
              })}
            </div>
          </div>
          <div>
            <div class="stl">⚠ Vigilance</div>
            <div id="alt-list">
              ${als.map(a => html`<div class="ai ${VM[a.v]}"><div class="adot ${VD[a.v]}"></div><span>${a.t}</span></div>`)}
            </div>
          </div>
        </div>
      </div>`;
  }
}

/* ══════════════════════ ÉDITEUR VISUEL ══════════════════════ */
class MeteoCardEditor extends LitElement {
  static get properties() { return { hass: { type: Object }, _config: { type: Object } }; }
  static get styles() { return css`
    .section{margin-bottom:14px}
    .section h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--secondary-text-color);margin-bottom:6px}
    .row{margin-bottom:8px}
    ha-entity-picker{display:block;width:100%}
  `; }

  setConfig(config) { this._config = { ...DEFAULTS, ...config }; }

  _row(key, label, domainFilter) {
    return html`<div class="row">
      <ha-entity-picker
        .hass=${this.hass}
        .value=${this._config[key] || ''}
        .label=${label}
        .includeDomains=${domainFilter ? [domainFilter] : undefined}
        allow-custom-entity
        @value-changed=${(e) => this._update(key, e.detail.value)}
      ></ha-entity-picker>
    </div>`;
  }

  _update(key, value) {
    this._config = { ...this._config, [key]: value };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  render() {
    if (!this._config) return html``;
    return html`
      <div class="section">
        <h3>🌤 Météo principale</h3>
        ${this._row('weather', 'Entité météo (obligatoire)', 'weather')}
        ${this._row('weather_secondary', 'Météo secondaire (visibilité/ressenti)', 'weather')}
        ${this._row('uv', 'Indice UV')}
        ${this._row('rain', 'Pluie du jour')}
        ${this._row('moon', 'Phase de lune')}
      </div>
      <div class="section">
        <h3>🌿 Niveaux pollen</h3>
        ${this._row('ng', 'Graminées — niveau')}
        ${this._row('nb', 'Bouleau — niveau')}
        ${this._row('na', 'Ambroisie — niveau')}
        ${this._row('nu', 'Aulne — niveau')}
        ${this._row('nr', 'Armoise — niveau')}
        ${this._row('no', 'Olivier — niveau')}
      </div>
      <div class="section">
        <h3>🌿 Concentrations pollen</h3>
        ${this._row('cg', 'Graminées — concentration')}
        ${this._row('cb', 'Bouleau — concentration')}
        ${this._row('ca', 'Ambroisie — concentration')}
        ${this._row('cu', 'Aulne — concentration')}
        ${this._row('crr', 'Armoise — concentration')}
        ${this._row('co', 'Olivier — concentration')}
      </div>
      <div class="section">
        <h3>🏭 Qualité globale</h3>
        ${this._row('qp', 'Qualité pollen globale')}
        ${this._row('qa', 'Qualité air globale')}
      </div>
    `;
  }
}

customElements.define('meteo-card', MeteoCard);
customElements.define('meteo-card-editor', MeteoCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'meteo-card',
  name: 'Météo (widget animé)',
  description: 'Widget météo avec ciel animé (pluie/neige/soleil), prévisions, pollen et alertes.',
});
