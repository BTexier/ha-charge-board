var G=globalThis,X=G.ShadowRoot&&(G.ShadyCSS===void 0||G.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,oe=Symbol(),Ae=new WeakMap,L=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==oe)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(X&&t===void 0){let s=e!==void 0&&e.length===1;s&&(t=Ae.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&Ae.set(e,t))}return t}toString(){return this.cssText}},Se=i=>new L(typeof i=="string"?i:i+"",void 0,oe),b=(i,...t)=>{let e=i.length===1?i[0]:t.reduce((s,r,n)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+i[n+1],i[0]);return new L(e,i,oe)},Ce=(i,t)=>{if(X)i.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let s=document.createElement("style"),r=G.litNonce;r!==void 0&&s.setAttribute("nonce",r),s.textContent=e.cssText,i.appendChild(s)}},ae=X?i=>i:i=>i instanceof CSSStyleSheet?(t=>{let e="";for(let s of t.cssRules)e+=s.cssText;return Se(e)})(i):i;var{is:tt,defineProperty:st,getOwnPropertyDescriptor:rt,getOwnPropertyNames:it,getOwnPropertySymbols:nt,getPrototypeOf:ot}=Object,Q=globalThis,Ee=Q.trustedTypes,at=Ee?Ee.emptyScript:"",ct=Q.reactiveElementPolyfillSupport,N=(i,t)=>i,ce={toAttribute(i,t){switch(t){case Boolean:i=i?at:null;break;case Object:case Array:i=i==null?i:JSON.stringify(i)}return i},fromAttribute(i,t){let e=i;switch(t){case Boolean:e=i!==null;break;case Number:e=i===null?null:Number(i);break;case Object:case Array:try{e=JSON.parse(i)}catch{e=null}}return e}},He=(i,t)=>!tt(i,t),Pe={attribute:!0,type:String,converter:ce,reflect:!1,useDefault:!1,hasChanged:He};Symbol.metadata??=Symbol("metadata"),Q.litPropertyMetadata??=new WeakMap;var $=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=Pe){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let s=Symbol(),r=this.getPropertyDescriptor(t,s,e);r!==void 0&&st(this.prototype,t,r)}}static getPropertyDescriptor(t,e,s){let{get:r,set:n}=rt(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get:r,set(o){let c=r?.call(this);n?.call(this,o),this.requestUpdate(t,c,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??Pe}static _$Ei(){if(this.hasOwnProperty(N("elementProperties")))return;let t=ot(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(N("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(N("properties"))){let e=this.properties,s=[...it(e),...nt(e)];for(let r of s)this.createProperty(r,e[r])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[s,r]of e)this.elementProperties.set(s,r)}this._$Eh=new Map;for(let[e,s]of this.elementProperties){let r=this._$Eu(e,s);r!==void 0&&this._$Eh.set(r,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let s=new Set(t.flat(1/0).reverse());for(let r of s)e.unshift(ae(r))}else t!==void 0&&e.push(ae(t));return e}static _$Eu(t,e){let s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Ce(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){let s=this.constructor.elementProperties.get(t),r=this.constructor._$Eu(t,s);if(r!==void 0&&s.reflect===!0){let n=(s.converter?.toAttribute!==void 0?s.converter:ce).toAttribute(e,s.type);this._$Em=t,n==null?this.removeAttribute(r):this.setAttribute(r,n),this._$Em=null}}_$AK(t,e){let s=this.constructor,r=s._$Eh.get(t);if(r!==void 0&&this._$Em!==r){let n=s.getPropertyOptions(r),o=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:ce;this._$Em=r;let c=o.fromAttribute(e,n.type);this[r]=c??this._$Ej?.get(r)??c,this._$Em=null}}requestUpdate(t,e,s,r=!1,n){if(t!==void 0){let o=this.constructor;if(r===!1&&(n=this[t]),s??=o.getPropertyOptions(t),!((s.hasChanged??He)(n,e)||s.useDefault&&s.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:r,wrapped:n},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),n!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),r===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[r,n]of this._$Ep)this[r]=n;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[r,n]of s){let{wrapped:o}=n,c=this[r];o!==!0||this._$AL.has(r)||c===void 0||this.C(r,void 0,n,c)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(e)):this._$EM()}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[N("elementProperties")]=new Map,$[N("finalized")]=new Map,ct?.({ReactiveElement:$}),(Q.reactiveElementVersions??=[]).push("2.1.2");var _e=globalThis,Me=i=>i,Y=_e.trustedTypes,Oe=Y?Y.createPolicy("lit-html",{createHTML:i=>i}):void 0,Ne="$lit$",x=`lit$${Math.random().toFixed(9).slice(2)}$`,ze="?"+x,lt=`<${ze}>`,C=document,V=()=>C.createComment(""),j=i=>i===null||typeof i!="object"&&typeof i!="function",me=Array.isArray,ht=i=>me(i)||typeof i?.[Symbol.iterator]=="function",le=`[ 	
\f\r]`,z=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Te=/-->/g,Re=/>/g,A=RegExp(`>|${le}(?:([^\\s"'>=/]+)(${le}*=${le}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),De=/'/g,Ue=/"/g,Ve=/^(?:script|style|textarea|title)$/i,fe=i=>(t,...e)=>({_$litType$:i,strings:t,values:e}),l=fe(1),Z=fe(2),xt=fe(3),E=Symbol.for("lit-noChange"),d=Symbol.for("lit-nothing"),Le=new WeakMap,S=C.createTreeWalker(C,129);function je(i,t){if(!me(i)||!i.hasOwnProperty("raw"))throw Error("invalid template strings array");return Oe!==void 0?Oe.createHTML(t):t}var dt=(i,t)=>{let e=i.length-1,s=[],r,n=t===2?"<svg>":t===3?"<math>":"",o=z;for(let c=0;c<e;c++){let a=i[c],p,h,u=-1,g=0;for(;g<a.length&&(o.lastIndex=g,h=o.exec(a),h!==null);)g=o.lastIndex,o===z?h[1]==="!--"?o=Te:h[1]!==void 0?o=Re:h[2]!==void 0?(Ve.test(h[2])&&(r=RegExp("</"+h[2],"g")),o=A):h[3]!==void 0&&(o=A):o===A?h[0]===">"?(o=r??z,u=-1):h[1]===void 0?u=-2:(u=o.lastIndex-h[2].length,p=h[1],o=h[3]===void 0?A:h[3]==='"'?Ue:De):o===Ue||o===De?o=A:o===Te||o===Re?o=z:(o=A,r=void 0);let f=o===A&&i[c+1].startsWith("/>")?" ":"";n+=o===z?a+lt:u>=0?(s.push(p),a.slice(0,u)+Ne+a.slice(u)+x+f):a+x+(u===-2?c:f)}return[je(i,n+(i[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]},B=class i{constructor({strings:t,_$litType$:e},s){let r;this.parts=[];let n=0,o=0,c=t.length-1,a=this.parts,[p,h]=dt(t,e);if(this.el=i.createElement(p,s),S.currentNode=this.el.content,e===2||e===3){let u=this.el.content.firstChild;u.replaceWith(...u.childNodes)}for(;(r=S.nextNode())!==null&&a.length<c;){if(r.nodeType===1){if(r.hasAttributes())for(let u of r.getAttributeNames())if(u.endsWith(Ne)){let g=h[o++],f=r.getAttribute(u).split(x),J=/([.?@])?(.*)/.exec(g);a.push({type:1,index:n,name:J[2],strings:f,ctor:J[1]==="."?de:J[1]==="?"?pe:J[1]==="@"?ue:R}),r.removeAttribute(u)}else u.startsWith(x)&&(a.push({type:6,index:n}),r.removeAttribute(u));if(Ve.test(r.tagName)){let u=r.textContent.split(x),g=u.length-1;if(g>0){r.textContent=Y?Y.emptyScript:"";for(let f=0;f<g;f++)r.append(u[f],V()),S.nextNode(),a.push({type:2,index:++n});r.append(u[g],V())}}}else if(r.nodeType===8)if(r.data===ze)a.push({type:2,index:n});else{let u=-1;for(;(u=r.data.indexOf(x,u+1))!==-1;)a.push({type:7,index:n}),u+=x.length-1}n++}}static createElement(t,e){let s=C.createElement("template");return s.innerHTML=t,s}};function T(i,t,e=i,s){if(t===E)return t;let r=s!==void 0?e._$Co?.[s]:e._$Cl,n=j(t)?void 0:t._$litDirective$;return r?.constructor!==n&&(r?._$AO?.(!1),n===void 0?r=void 0:(r=new n(i),r._$AT(i,e,s)),s!==void 0?(e._$Co??=[])[s]=r:e._$Cl=r),r!==void 0&&(t=T(i,r._$AS(i,t.values),r,s)),t}var he=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:s}=this._$AD,r=(t?.creationScope??C).importNode(e,!0);S.currentNode=r;let n=S.nextNode(),o=0,c=0,a=s[0];for(;a!==void 0;){if(o===a.index){let p;a.type===2?p=new I(n,n.nextSibling,this,t):a.type===1?p=new a.ctor(n,a.name,a.strings,this,t):a.type===6&&(p=new ge(n,this,t)),this._$AV.push(p),a=s[++c]}o!==a?.index&&(n=S.nextNode(),o++)}return S.currentNode=C,r}p(t){let e=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}},I=class i{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,r){this.type=2,this._$AH=d,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=T(this,t,e),j(t)?t===d||t==null||t===""?(this._$AH!==d&&this._$AR(),this._$AH=d):t!==this._$AH&&t!==E&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):ht(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==d&&j(this._$AH)?this._$AA.nextSibling.data=t:this.T(C.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:s}=t,r=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=B.createElement(je(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===r)this._$AH.p(e);else{let n=new he(r,this),o=n.u(this.options);n.p(e),this.T(o),this._$AH=n}}_$AC(t){let e=Le.get(t.strings);return e===void 0&&Le.set(t.strings,e=new B(t)),e}k(t){me(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,s,r=0;for(let n of t)r===e.length?e.push(s=new i(this.O(V()),this.O(V()),this,this.options)):s=e[r],s._$AI(n),r++;r<e.length&&(this._$AR(s&&s._$AB.nextSibling,r),e.length=r)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let s=Me(t).nextSibling;Me(t).remove(),t=s}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},R=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,r,n){this.type=1,this._$AH=d,this._$AN=void 0,this.element=t,this.name=e,this._$AM=r,this.options=n,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=d}_$AI(t,e=this,s,r){let n=this.strings,o=!1;if(n===void 0)t=T(this,t,e,0),o=!j(t)||t!==this._$AH&&t!==E,o&&(this._$AH=t);else{let c=t,a,p;for(t=n[0],a=0;a<n.length-1;a++)p=T(this,c[s+a],e,a),p===E&&(p=this._$AH[a]),o||=!j(p)||p!==this._$AH[a],p===d?t=d:t!==d&&(t+=(p??"")+n[a+1]),this._$AH[a]=p}o&&!r&&this.j(t)}j(t){t===d?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},de=class extends R{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===d?void 0:t}},pe=class extends R{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==d)}},ue=class extends R{constructor(t,e,s,r,n){super(t,e,s,r,n),this.type=5}_$AI(t,e=this){if((t=T(this,t,e,0)??d)===E)return;let s=this._$AH,r=t===d&&s!==d||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,n=t!==d&&(s===d||r);r&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},ge=class{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){T(this,t)}};var pt=_e.litHtmlPolyfillSupport;pt?.(B,I),(_e.litHtmlVersions??=[]).push("3.3.3");var Be=(i,t,e)=>{let s=e?.renderBefore??t,r=s._$litPart$;if(r===void 0){let n=e?.renderBefore??null;s._$litPart$=r=new I(t.insertBefore(V(),n),n,void 0,e??{})}return r._$AI(i),r};var ve=globalThis,_=class extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=Be(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return E}};_._$litElement$=!0,_.finalized=!0,ve.litElementHydrateSupport?.({LitElement:_});var ut=ve.litElementPolyfillSupport;ut?.({LitElement:_});(ve.litElementVersions??=[]).push("4.2.2");var P=(i,t,e={})=>i.connection.sendMessagePromise({type:`charge_board/${t}`,...e}),ee=i=>P(i,"overview"),te=(i,t={})=>P(i,"sessions",{...t}),Ie=(i,t)=>P(i,"session",{session_id:t}),Ke=(i,t,e)=>P(i,"set_vehicle",{session_id:t,vehicle_id:e}),qe=(i,t)=>P(i,"delete",{session_id:t}),be=(i,t,e)=>P(i,"merge",{session_id:t,other_id:e}),Fe=(i,t,e)=>P(i,"split",{session_id:t,at:e}),We=(i,t)=>i.connection.subscribeMessage(t,{type:"charge_board/subscribe"});var gt={title:"Recharge",tab_overview:"Aper\xE7u",tab_sessions:"Sessions",loading:"Chargement\u2026",error:"Impossible de charger les donn\xE9es",not_loaded:"Charge Board n'est pas charg\xE9",no_chargers:"Aucun chargeur configur\xE9. Ajoutez-en un dans les param\xE8tres de l'int\xE9gration Charge Board.",charging:"En charge",plugged:"Branch\xE9",free:"Libre",power:"puissance",session:"session",cost:"co\xFBt",end:"fin estim\xE9e",end_short:"fin {time}",plugged_since:"Branch\xE9e depuis {time}",charging_since:"en charge depuis {time}",charge_started:"d\xE9but de charge {time}",off_peak:"{share} heures creuses",last_session:"Derni\xE8re session : {summary}",no_session:"Aucune session enregistr\xE9e",no_vehicle:"aucun v\xE9hicule",menu:"Menu",close:"Fermer",all_vehicles:"Tous les v\xE9hicules",all_chargers:"Tous les chargeurs",month:"Mois",sessions_count:"{n} sessions",off_peak_short:"{share} HC",col_start:"D\xE9but",col_end:"Fin",col_vehicle:"V\xE9hicule",col_battery:"Batterie",col_kwh:"kWh",col_duration:"Dur\xE9e de charge",col_cost:"Co\xFBt",edited:"modifi\xE9e",estimated_note:"* co\xFBt estim\xE9",unpriced_note:"\u2265 : {n} session(s) sans prix",no_sessions:"Aucune session pour ces filtres",back:"Retour",session_of:"Session du {day}",energy:"\xE9nergie",battery:"batterie",average:"moyenne",chart_hint:"Touchez le graphique pour choisir o\xF9 couper la session.",plugged_at:"Branch\xE9e",charge:"Charge",unplugged_at:"D\xE9branch\xE9e",off_peak_slice:"Heures creuses",peak_slice:"Heures pleines",price_slice:"{price} /kWh",unknown_price:"Prix inconnu",charging_time:"Temps de charge",plugged_time:"{time} branch\xE9e",vehicle:"V\xE9hicule",delete:"Supprimer",merge_prev:"Fusionner avec la pr\xE9c\xE9dente",merge_next:"Fusionner avec la suivante",split:"Couper",confirm_delete:"Supprimer d\xE9finitivement cette session ?",confirm_split:"Couper la session \xE0 {time} ?",confirm:"Confirmer",cancel:"Annuler",in_progress_note:"Session en cours : corrections impossibles.",err_invalid:"Correction refus\xE9e : op\xE9ration invalide pour cette session.",err_in_progress:"Correction refus\xE9e : la session est encore en cours.",err_not_found:"Cette session n'existe plus."},_t={title:"Charging",tab_overview:"Overview",tab_sessions:"Sessions",loading:"Loading\u2026",error:"Could not load the data",not_loaded:"Charge Board is not loaded",no_chargers:"No charger configured. Add one in the Charge Board integration settings.",charging:"Charging",plugged:"Plugged in",free:"Free",power:"power",session:"session",cost:"cost",end:"estimated end",end_short:"end {time}",plugged_since:"Plugged in since {time}",charging_since:"charging since {time}",charge_started:"charge started {time}",off_peak:"{share} off-peak",last_session:"Last session: {summary}",no_session:"No session recorded",no_vehicle:"no vehicle",menu:"Menu",close:"Close",all_vehicles:"All vehicles",all_chargers:"All chargers",month:"Month",sessions_count:"{n} sessions",off_peak_short:"{share} off-peak",col_start:"Start",col_end:"End",col_vehicle:"Vehicle",col_battery:"Battery",col_kwh:"kWh",col_duration:"Charging time",col_cost:"Cost",edited:"edited",estimated_note:"* estimated cost",unpriced_note:"\u2265: {n} session(s) without a price",no_sessions:"No session for these filters",back:"Back",session_of:"Session of {day}",energy:"energy",battery:"battery",average:"average",chart_hint:"Tap the chart to choose where to split the session.",plugged_at:"Plugged in",charge:"Charge",unplugged_at:"Unplugged",off_peak_slice:"Off-peak",peak_slice:"Peak",price_slice:"{price} /kWh",unknown_price:"Unknown price",charging_time:"Charging time",plugged_time:"{time} plugged in",vehicle:"Vehicle",delete:"Delete",merge_prev:"Merge with previous",merge_next:"Merge with next",split:"Split",confirm_delete:"Delete this session permanently?",confirm_split:"Split the session at {time}?",confirm:"Confirm",cancel:"Cancel",in_progress_note:"Session in progress: no corrections.",err_invalid:"Correction refused: invalid operation for this session.",err_in_progress:"Correction refused: the session is still in progress.",err_not_found:"This session no longer exists."},mt={fr:gt,en:_t},v=i=>i.language?.startsWith("fr")?"fr":"en",y=i=>i.locale?.language??i.language??"en";function w(i,t,e={}){return mt[i][t].replace(/\{(\w+)\}/g,(s,r)=>e[r]??"")}function H(i){let t=i?.code;return t==="not_loaded"?"not_loaded":t==="invalid"||t==="in_progress"||t==="not_found"?`err_${t}`:"error"}var $e=i=>i.replace(/[  ]/g," "),Je=(i,t,e)=>$e(i.toLocaleString(t,{minimumFractionDigits:e,maximumFractionDigits:e}));function k(i,t){return i==null?"\u2014":`${Je(i,t,1)} kWh`}function D(i,t){return i==null?"\u2014":`${Je(i/1e3,t,1)} kW`}function M(i,t,e){return i==null?"\u2014":$e(new Intl.NumberFormat(e,{style:"currency",currency:t}).format(i))}function q(i,t){let e=Math.round(i/60),s=Math.floor(e/60),r=e%60;if(s===0)return`${r} min`;let n=String(r).padStart(2,"0");return t==="fr"?`${s} h ${n}`:`${s} h ${n} min`}function U(i,t){if(i==null&&t==null)return"\u2014";let e=s=>s==null?"\u2014":String(Math.round(s));return`${e(i)} \u2192 ${e(t)} %`}function se(i,t){return $e(i.toLocaleString(t,{style:"percent",maximumFractionDigits:0}))}var re=(i,t,e,s)=>new Intl.DateTimeFormat(t,{timeZone:e,...s}).format(new Date(i*1e3));function O(i,t,e){return re(i,t,e,{hour:"2-digit",minute:"2-digit"})}function K(i,t,e){return re(i,t,e,{day:"2-digit",month:"2-digit"})}function F(i,t,e,s=Date.now()/1e3){let r=O(i,t,e),n=K(i,t,e);return n===K(s,t,e)?r:`${n} ${r}`}function ie(i,t,e){return`${re(i,t,e,{weekday:"short"})} ${K(i,t,e)} ${O(i,t,e)}`}function Ge(i,t){return re(i,"en-CA",t,{year:"numeric",month:"2-digit"})}var Xe={charging:"var(--success-color, #43a047)",plugged:"var(--info-color, #039be5)",free:"var(--disabled-text-color, #9e9e9e)"},ye=class extends _{constructor(){super(...arguments);this.version=0;this._req=0}static{this.properties={hass:{attribute:!1},version:{type:Number},_data:{state:!0},_error:{state:!0},_open:{state:!0}}}updated(e){e.has("version")&&this.hass&&this._fetch(),e.has("_open")&&this._open&&this.renderRoot.querySelector("dialog")?.showModal()}async _fetch(){let e=++this._req;try{let s=await ee(this.hass);if(e!==this._req)return;this._data=s,this._error=void 0}catch(s){e===this._req&&(this._error=H(s))}}_t(e,s){return w(v(this.hass),e,s)}render(){if(this._error)return l`<p class="message">${this._t(this._error)}</p>`;if(!this._data)return l`<p class="message">${this._t("loading")}</p>`;let{chargers:e,style:s}=this._data;if(!e.length)return l`<p class="message">${this._t("no_chargers")}</p>`;if(s!=="compact")return l`<div class="grid">${e.map(n=>this._card(n))}</div>`;let r=e.find(n=>n.id===this._open);return l`
      <div class="grid compact">${e.map(n=>this._tile(n))}</div>
      ${r?l`<dialog @close=${()=>this._open=void 0} @click=${this._backdropClose}>
            <div class="dialog-bar">
              <button aria-label=${this._t("close")} @click=${this._close}>×</button>
            </div>
            ${this._card(r)}
          </dialog>`:d}
    `}_backdropClose(e){e.target===e.currentTarget&&this._close()}_close(){this.renderRoot.querySelector("dialog")?.close()}get _fmt(){let e=y(this.hass),s=this.hass.config.time_zone;return{locale:e,when:r=>F(r,e,s),time:r=>O(r,e,s),day:r=>K(r,e,s),cost:r=>M(r,this._data.currency,e)}}_stateLabel(e){return this._t(e.state)}_idle(e){return e.state==="free"&&!e.session}_card(e){let s=this._fmt,r=e.session,n=e.vehicle?.soc??null,o=r?[r.plugged_at!=null?this._t("plugged_since",{time:s.when(r.plugged_at)}):null,r.charge_start!=null?this._t(e.state==="charging"?"charging_since":"charge_started",{time:s.when(r.charge_start)}):null,r.has_off_peak_source&&r.energy_kwh>0?this._t("off_peak",{share:se(r.off_peak.kwh/r.energy_kwh,s.locale)}):null].filter(Boolean):[];return l`
      <ha-card class="card" style="--state:${Xe[e.state]}">
        <div class="head">
          <span class="name"><ha-icon icon="mdi:ev-station"></ha-icon>${e.name}</span>
          <span class="state">${this._stateLabel(e)}</span>
        </div>
        ${this._idle(e)?l`<div class="muted">${this._lastSession(e)}</div>`:l`
              <div class="vehicle">
                <ha-icon icon="mdi:car-electric"></ha-icon>
                <b>${e.vehicle?.name??"\u2014"}</b> ·
                ${n==null?"\u2014":U(n,e.vehicle?.target)}
              </div>
              ${n==null?d:l`<div class="bar"><div style="width:${Math.min(100,Math.max(0,n))}%"></div></div>`}
              <div class="stats">
                ${this._stat(D(e.power_w,s.locale),"power")}
                ${this._stat(k(r?.energy_kwh,s.locale),"session")}
                ${this._stat(s.cost(r?.cost),"cost")}
                ${e.estimated_end==null?d:this._stat(s.time(e.estimated_end),"end")}
              </div>
              ${o.length?l`<div class="muted">${o.join(" \xB7 ")}</div>`:d}
            `}
      </ha-card>
    `}_stat(e,s){return l`<div><div class="value">${e}</div><div class="muted">${this._t(s)}</div></div>`}_lastSession(e){let s=e.last_session;if(!s)return this._t("no_session");let r=this._fmt,n=s.charge_start??s.plugged_at,o=[s.vehicle_name??"\u2014",n!=null?r.day(n):null,k(s.energy_kwh,r.locale),r.cost(s.cost)].filter(Boolean);return this._t("last_session",{summary:o.join(" \xB7 ")})}_tile(e){let s=this._fmt,r=this._idle(e)?null:e.vehicle?.soc??null,n=r==null?"0":String(Math.min(100,Math.max(0,r))),o=this._idle(e)?this._t("free").toLowerCase():r==null?"\u2014":`${Math.round(r)} %`,c=[D(e.power_w,s.locale),s.cost(e.session?.cost),e.estimated_end==null?null:this._t("end_short",{time:s.time(e.estimated_end)})].filter(Boolean);return l`
      <ha-card class="tile" style="--state:${Xe[e.state]}">
        <button @click=${()=>this._open=e.id}>
          <div class="gauge" style="--soc:${n}%"><span>${o}</span></div>
          <b>${e.name}</b>
          ${this._idle(e)?l`<div class="muted">${this._t("no_vehicle")}</div>`:l`
                <div>${e.vehicle?.name??"\u2014"} · ${this._stateLabel(e).toLowerCase()}</div>
                <div class="muted">${c.join(" \xB7 ")}</div>
              `}
        </button>
      </ha-card>
    `}static{this.styles=b`
    :host {
      display: block;
      padding: 16px;
    }
    .message {
      color: var(--secondary-text-color);
      text-align: center;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .grid.compact {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
    @media (max-width: 600px) {
      :host {
        padding: 8px;
      }
      .grid,
      .grid.compact {
        grid-template-columns: 1fr;
        gap: 8px;
      }
    }
    ha-card {
      display: block;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      border-radius: var(--ha-card-border-radius, 12px);
      box-shadow: var(--ha-card-box-shadow, none);
      border: 1px solid var(--divider-color, #e0e0e0);
    }
    .card {
      padding: 16px;
      border-left: 5px solid var(--state);
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
    .name,
    .vehicle {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .state {
      color: var(--state);
      white-space: nowrap;
    }
    .state::before {
      content: "● ";
    }
    .vehicle {
      margin: 12px 0 6px;
    }
    ha-icon {
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
    }
    .bar {
      height: 10px;
      border-radius: 5px;
      background: var(--divider-color, #e0e0e0);
      overflow: hidden;
    }
    .bar > div {
      height: 100%;
      background: var(--state);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
      gap: 8px;
      margin: 12px 0 8px;
      text-align: center;
    }
    .value {
      font-size: 1.15em;
      font-weight: 600;
      white-space: nowrap;
    }
    .muted {
      color: var(--secondary-text-color);
      font-size: 0.9em;
      margin-top: 4px;
    }
    .tile > button {
      all: unset;
      box-sizing: border-box;
      display: block;
      width: 100%;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      border-radius: inherit;
    }
    .tile > button:focus-visible {
      outline: 2px solid var(--primary-color);
    }
    .gauge {
      width: 72px;
      height: 72px;
      margin: 0 auto 8px;
      border-radius: 50%;
      background: conic-gradient(var(--state) var(--soc), var(--divider-color, #e0e0e0) 0);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .gauge span {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--card-background-color, #fff);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }
    dialog {
      border: none;
      padding: 0;
      width: min(480px, calc(100vw - 32px));
      background: transparent;
      color: var(--primary-text-color);
    }
    dialog::backdrop {
      background: rgba(0, 0, 0, 0.5);
    }
    .dialog-bar {
      text-align: right;
    }
    .dialog-bar button {
      all: unset;
      cursor: pointer;
      font-size: 28px;
      line-height: 1;
      padding: 4px 8px;
      color: #fff;
    }
  `}};customElements.define("charge-board-overview",ye);function Ye(i,t,e,s){return e+Math.min(Math.max(i,0),t)/t*(s-e)}var Qe=i=>Math.round(i*10)/10;function Ze(i,t,e,s=i[0]?.t??0,r=i[i.length-1]?.t??0){if(!i.length)return"";let n=Math.max(...i.map(h=>h.w),1),o=r-s||1,c=h=>Qe((h-s)/o*t),a=h=>Qe(e-Math.max(h,0)/n*e);return i.map((h,u)=>{let g=u+1<i.length?i[u+1].t:r;return`${u?"L":"M"}${c(h.t)} ${a(h.w)} L${c(Math.max(g,h.t))} ${a(h.w)}`}).join(" ")}function et(i,t){let e=[];return i.forEach((s,r)=>{if(!s.off_peak)return;let n=r+1<i.length?i[r+1].t:t,o=e[e.length-1];o&&o.to===s.t?o.to=n:e.push({from:s.t,to:n})}),e}var ne=600,W=160,xe=class extends _{constructor(){super(...arguments);this.version=0;this.currency="EUR";this.vehicles=[];this._busy=!1;this._req=0}static{this.properties={hass:{attribute:!1},sessionId:{attribute:!1},version:{type:Number},currency:{attribute:!1},vehicles:{attribute:!1},_s:{state:!0},_prev:{state:!0},_next:{state:!0},_pending:{state:!0},_busy:{state:!0}}}updated(e){e.has("sessionId")&&(this._s=void 0,this._pending=void 0),(e.has("sessionId")||e.has("version"))&&this.hass&&this._fetch()}async _fetch(){let e=++this._req;try{let s=await Ie(this.hass,this.sessionId),{sessions:r}=await te(this.hass,{charger_id:s.charger_id});if(e!==this._req)return;let n=a=>a.charge_start??a.plugged_at??0,o=[...r].sort((a,p)=>n(a)-n(p)),c=o.findIndex(a=>a.id===s.id);this._prev=c>0?o[c-1].id:void 0,this._next=c>=0&&c+1<o.length?o[c+1].id:void 0,this._s=s}catch(s){e===this._req&&this._emit("session-changed",{id:void 0,error:H(s)})}}_emit(e,s){this.dispatchEvent(new CustomEvent(e,{detail:s,bubbles:!0,composed:!0}))}async _run(e){this._pending=void 0,this._busy=!0;try{let{sessions:s}=await e();this._emit("session-changed",{id:s[0]}),s[0]===this.sessionId&&this._fetch()}catch(s){let r=H(s);this._emit("session-changed",{id:r==="err_not_found"?void 0:this.sessionId,error:r}),this._fetch()}finally{this._busy=!1}}_t(e,s){return w(v(this.hass),e,s)}get _range(){let e=this._s,s=e.charge_start??e.curve[0]?.t??0;return{start:s,end:Math.max(e.charge_end??s,s+1)}}_chartClick(e){if(this._s.open)return;let r=e.currentTarget.getBoundingClientRect(),{start:n,end:o}=this._range,c=Math.round(Ye(e.clientX-r.left,r.width,n,o));n<c&&c<o&&(this._pending={kind:"split",at:c})}render(){if(!this._s)return l`<div class="card"><p class="muted">${this._t("loading")}</p></div>`;let e=this._s,s=y(this.hass),r=this.hass.config.time_zone,n=e.charge_start??void 0,o=g=>g==null?"\u2014":F(g,s,r,n),c=g=>M(g,this.currency,s),a=e.charging_s>0?e.energy_kwh*36e5/e.charging_s:null,p=e.plugged_at!=null&&e.unplugged_at!=null?e.unplugged_at-e.plugged_at:null,h=v(this.hass),u=[e.charge_start!=null?this._t("session_of",{day:ie(e.charge_start,s,r)}):null,e.vehicle_name,e.charger_name].filter(Boolean);return l`
      <div class="card">
        <button class="back" @click=${()=>this._emit("back")}>← ${this._t("back")}</button>
        <div class="head">
          <b>${u.join(" \xB7 ")}</b>
          ${e.edited?l`<span class="badge">${this._t("edited")}</span>`:d}
        </div>
        <div class="figures">
          ${this._figure(k(e.energy_kwh,s),"energy")}
          ${this._figure(`${c(e.cost)}${e.estimated?" *":""}`,"cost")}
          ${this._figure(U(e.soc_start,e.soc_end),"battery")}
          ${this._figure(D(a,s),"average")}
        </div>
        ${this._chart()}
        <table class="facts">
          <tr><td>${this._t("plugged_at")}</td><td>${o(e.plugged_at)}</td></tr>
          <tr><td>${this._t("charge")}</td><td>${o(e.charge_start)} → ${o(e.charge_end)}</td></tr>
          <tr><td>${this._t("unplugged_at")}</td><td>${o(e.unplugged_at)}</td></tr>
          ${this._slices(s).map(([g,f])=>l`<tr><td>${g}</td><td>${k(f.kwh,s)} · ${c(f.cost)}</td></tr>`)}
          <tr>
            <td>${this._t("charging_time")}</td>
            <td>
              ${q(e.charging_s,h)}
              ${p==null?d:l` / ${this._t("plugged_time",{time:q(p,h)})}`}
            </td>
          </tr>
        </table>
        ${e.open?l`<p class="muted">${this._t("in_progress_note")}</p>`:this._actions()}
      </div>
    `}_figure(e,s){return l`<div><div class="value">${e}</div><div class="muted">${this._t(s)}</div></div>`}_slices(e){let s=this._s;return s.has_off_peak_source?[[this._t("off_peak_slice"),s.off_peak],[this._t("peak_slice"),s.peak]]:Object.entries(s.by_price).map(([r,n])=>[r==="none"?this._t("unknown_price"):this._t("price_slice",{price:new Intl.NumberFormat(e,{style:"currency",currency:this.currency,maximumFractionDigits:4}).format(Number(r))}),n])}_chart(){let e=this._s,{start:s,end:r}=this._range,n=h=>(h-s)/(r-s)*ne,o=y(this.hass),c=this.hass.config.time_zone,a=Math.max(0,...e.curve.map(h=>h.w)),p=this._pending?.kind==="split"?this._pending.at:void 0;return l`
      <svg
        class="chart ${e.open?"":"clickable"}"
        viewBox="0 0 ${ne} ${W}"
        preserveAspectRatio="none"
        role="img"
        @click=${this._chartClick}
      >
        ${e.has_off_peak_source?Z`<rect class="peak" x="0" y="0" width=${ne} height=${W}></rect>
              ${et(e.curve,r).map(h=>Z`<rect class="off-peak" x=${n(h.from)} y="0" width=${n(h.to)-n(h.from)} height=${W}></rect>`)}`:d}
        <path class="line" d=${Ze(e.curve,ne,W-4,s,r)} transform="translate(0 4)"></path>
        ${p==null?d:Z`<line class="cut" x1=${n(p)} x2=${n(p)} y1="0" y2=${W}></line>`}
      </svg>
      <div class="axis muted">
        <span>${O(s,o,c)}</span>
        <span>${a?`max ${D(a,o)}`:""}</span>
        <span>${O(r,o,c)}</span>
      </div>
      ${e.has_off_peak_source?l`<div class="legend muted">
            <span><i class="off-peak"></i>${this._t("off_peak_slice")}</span>
            <span><i class="peak"></i>${this._t("peak_slice")}</span>
          </div>`:d}
    `}_actions(){let e=this._s,s=e.id,r=this._pending,n=this.hass.config.time_zone,o=(c,a)=>l`
      <div class="confirm">
        <span>${c}</span>
        <button class="primary" ?disabled=${this._busy} @click=${()=>this._run(a)}>${this._t("confirm")}</button>
        <button @click=${()=>this._pending=void 0}>${this._t("cancel")}</button>
      </div>
    `;return l`
      <p class="muted">${this._t("chart_hint")}</p>
      ${r?.kind==="split"?o(this._t("confirm_split",{time:F(r.at,y(this.hass),n,e.charge_start??void 0)}),()=>Fe(this.hass,s,r.at)):d}
      ${r?.kind==="delete"?o(this._t("confirm_delete"),()=>qe(this.hass,s)):d}
      <div class="actions">
        <label>
          ${this._t("vehicle")}
          <select
            ?disabled=${this._busy}
            @change=${c=>{let a=c.target,p=a.value;a.value=e.vehicle_id??"",p&&p!==e.vehicle_id&&this._run(()=>Ke(this.hass,s,p))}}
          >
            ${e.vehicle_id==null?l`<option value="" selected>${"\u2014"}</option>`:d}
            ${this.vehicles.map(c=>l`<option value=${c.id} .selected=${c.id===e.vehicle_id}>${c.name}</option>`)}
          </select>
        </label>
        <button
          ?disabled=${this._busy||!this._prev}
          @click=${()=>this._run(()=>be(this.hass,s,this._prev))}
        >
          ${this._t("merge_prev")}
        </button>
        <button
          ?disabled=${this._busy||!this._next}
          @click=${()=>this._run(()=>be(this.hass,s,this._next))}
        >
          ${this._t("merge_next")}
        </button>
        <button class="danger" ?disabled=${this._busy} @click=${()=>this._pending={kind:"delete"}}>
          ${this._t("delete")}
        </button>
      </div>
    `}static{this.styles=b`
    :host {
      display: block;
      --cb-off-peak: rgba(3, 155, 229, 0.15);
      --cb-peak: rgba(255, 166, 0, 0.18);
    }
    .card {
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: var(--ha-card-border-radius, 12px);
      padding: 16px;
    }
    .muted {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .badge {
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 0.8em;
      background: var(--warning-color, #ffa600);
      color: var(--text-primary-color, #fff);
    }
    .figures {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      text-align: center;
      margin-bottom: 12px;
    }
    .value {
      font-size: 1.1em;
      font-weight: 600;
      white-space: nowrap;
    }
    .chart {
      display: block;
      width: 100%;
      height: 160px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }
    .chart.clickable {
      cursor: crosshair;
    }
    .line {
      fill: none;
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
    }
    rect.off-peak,
    i.off-peak {
      fill: var(--cb-off-peak);
      background: var(--cb-off-peak);
    }
    rect.peak,
    i.peak {
      fill: var(--cb-peak);
      background: var(--cb-peak);
    }
    .cut {
      stroke: var(--error-color, #db4437);
      stroke-width: 2;
      stroke-dasharray: 4 3;
      vector-effect: non-scaling-stroke;
    }
    .axis,
    .legend {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
    }
    .legend {
      justify-content: flex-start;
      gap: 16px;
    }
    .legend i {
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-right: 4px;
      vertical-align: middle;
      border: 1px solid var(--divider-color, #e0e0e0);
    }
    .facts {
      width: 100%;
      margin: 12px 0;
      border-collapse: collapse;
    }
    .facts td {
      padding: 4px 0;
    }
    .facts td:first-child {
      color: var(--secondary-text-color);
      padding-right: 12px;
    }
    .actions,
    .confirm {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .confirm {
      padding: 8px;
      margin-bottom: 8px;
      border-radius: 8px;
      background: var(--secondary-background-color, #f5f5f5);
    }
    .confirm span {
      flex: 1 1 100%;
    }
    button,
    select {
      font: inherit;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      cursor: pointer;
    }
    select {
      margin-left: 4px;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    button.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: transparent;
    }
    button.danger {
      color: var(--error-color, #db4437);
    }
    .back {
      display: none;
      margin-bottom: 8px;
    }
    @media (max-width: 900px) {
      .back {
        display: inline-block;
      }
    }
    @media (max-width: 600px) {
      .figures {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `}};customElements.define("charge-board-session-detail",xe);var we=class extends _{constructor(){super(...arguments);this.version=0;this._vehicle="";this._charger="";this._req=0}static{this.properties={hass:{attribute:!1},version:{type:Number},_sessions:{state:!0},_summary:{state:!0},_overview:{state:!0},_error:{state:!0},_message:{state:!0},_vehicle:{state:!0},_charger:{state:!0},_month:{state:!0},_selected:{state:!0}}}willUpdate(){this._month===void 0&&this.hass&&(this._month=Ge(Date.now()/1e3,this.hass.config.time_zone))}updated(e){["version","_vehicle","_charger","_month"].some(s=>e.has(s))&&this.hass&&this._fetch()}async _fetch(){let e=++this._req,s={...this._vehicle&&{vehicle_id:this._vehicle},...this._charger&&{charger_id:this._charger},...this._month&&{month:this._month}};try{let[r,n]=await Promise.all([te(this.hass,s),ee(this.hass)]);if(e!==this._req)return;this._sessions=r.sessions,this._summary=r.summary,this._overview=n,this._error=void 0}catch(r){e===this._req&&(this._error=H(r))}}_t(e,s){return w(v(this.hass),e,s)}_changed(e){this._selected=e.detail.id,this._message=e.detail.error,this._fetch()}render(){if(this._error&&!this._sessions)return l`<p class="message">${this._t(this._error)}</p>`;if(!this._sessions||!this._overview)return l`<p class="message">${this._t("loading")}</p>`;let e=this._overview,s=(r,n,o,c)=>l`<select @change=${a=>c(a.target.value)}>
        <option value="" ?selected=${!r}>${this._t(n)}</option>
        ${o.map(a=>l`<option value=${a.id} ?selected=${a.id===r}>${a.name}</option>`)}
      </select>`;return l`
      <div class="filters">
        ${s(this._vehicle,"all_vehicles",e.vehicles,r=>this._vehicle=r)}
        ${s(this._charger,"all_chargers",e.chargers,r=>this._charger=r)}
        <input
          type="month"
          aria-label=${this._t("month")}
          .value=${this._month??""}
          @change=${r=>this._month=r.target.value}
        />
      </div>
      ${this._error?l`<p class="error">${this._t(this._error)}</p>`:d}
      ${this._message?l`<p class="error">${this._t(this._message)}</p>`:d}
      <div class="layout ${this._selected?"has-detail":""}">
        <div class="list">${this._banner()} ${this._table()}</div>
        ${this._selected?l`<charge-board-session-detail
              .hass=${this.hass}
              .sessionId=${this._selected}
              .version=${this.version}
              .currency=${e.currency}
              .vehicles=${e.vehicles}
              @session-changed=${this._changed}
              @back=${()=>this._selected=void 0}
            ></charge-board-session-detail>`:d}
      </div>
    `}_banner(){let e=this._summary,s=y(this.hass),r=M(e.cost,this._overview.currency,s);e.cost!=null&&e.unpriced_count>0&&(r=`\u2265 ${r}`);let o=[this._month?new Date(`${this._month}-15T12:00:00Z`).toLocaleString(s,{month:"long",year:"numeric",timeZone:"UTC"}):null,this._t("sessions_count",{n:String(e.count)}),k(e.energy_kwh,s),l`<b>${r}</b>`,e.off_peak_share==null?"\u2014":this._t("off_peak_short",{share:se(e.off_peak_share,s)})].filter(c=>c!=null);return l`<div class="banner">${o.map((c,a)=>l`${a?" \xB7 ":""}${c}`)}</div>`}_table(){let e=this._sessions;if(!e.length)return l`<p class="message">${this._t("no_sessions")}</p>`;let s=y(this.hass),r=this.hass.config.time_zone,n=a=>a==null?"\u2014":ie(a,s,r),o=["col_start","col_end","col_vehicle","col_battery","col_kwh","col_duration","col_cost"],c=this._summary.unpriced_count;return l`
      <div class="scroll">
        <table>
          <thead>
            <tr>${o.map(a=>l`<th>${this._t(a)}</th>`)}</tr>
          </thead>
          <tbody>
            ${e.map(a=>l`<tr
                class=${a.id===this._selected?"selected":""}
                tabindex="0"
                @click=${()=>this._selected=a.id}
                @keydown=${p=>p.key==="Enter"&&(this._selected=a.id)}
              >
                <td>${n(a.charge_start)}</td>
                <td>${n(a.charge_end)}</td>
                <td>${a.vehicle_name??"\u2014"}</td>
                <td>${U(a.soc_start,a.soc_end)}</td>
                <td>${a.energy_kwh.toLocaleString(s,{minimumFractionDigits:1,maximumFractionDigits:1})}</td>
                <td>${q(a.charging_s,v(this.hass))}</td>
                <td>
                  ${M(a.cost,this._overview.currency,s)}${a.estimated?" *":""}
                  ${a.edited?l`<span class="badge">${this._t("edited")}</span>`:d}
                </td>
              </tr>`)}
          </tbody>
        </table>
      </div>
      <div class="note">
        ${this._t("estimated_note")}${c?l` · ${this._t("unpriced_note",{n:String(c)})}`:d}
      </div>
    `}static{this.styles=b`
    :host {
      display: block;
      padding: 16px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .message,
    .note {
      color: var(--secondary-text-color);
    }
    .message {
      text-align: center;
    }
    .note {
      font-size: 0.85em;
      margin-top: 6px;
    }
    .error {
      color: var(--error-color, #db4437);
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    select,
    input {
      font: inherit;
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
    }
    .layout {
      display: grid;
      gap: 16px;
      align-items: start;
    }
    .layout.has-detail {
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    }
    .banner,
    .scroll {
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: var(--ha-card-border-radius, 12px);
    }
    .banner {
      padding: 12px;
      margin-bottom: 8px;
    }
    .scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95em;
    }
    th {
      text-align: left;
      color: var(--secondary-text-color);
      font-weight: 500;
    }
    th,
    td {
      padding: 8px;
      white-space: nowrap;
    }
    tbody tr {
      border-top: 1px solid var(--divider-color, #e0e0e0);
      cursor: pointer;
    }
    tbody tr:hover,
    tbody tr.selected {
      background: var(--secondary-background-color, #f5f5f5);
    }
    tbody tr:focus-visible {
      outline: 2px solid var(--primary-color);
    }
    .badge {
      margin-left: 4px;
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 0.8em;
      background: var(--warning-color, #ffa600);
      color: var(--text-primary-color, #fff);
    }
    /* One column: the detail replaces the list (back button in the detail). */
    @media (max-width: 900px) {
      .layout.has-detail {
        grid-template-columns: 1fr;
      }
      .layout.has-detail .list {
        display: none;
      }
    }
    @media (max-width: 600px) {
      :host {
        padding: 8px;
      }
    }
  `}};customElements.define("charge-board-sessions",we);var ft="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",ke=class extends _{constructor(){super(...arguments);this.narrow=!1;this._tab="overview";this._version=0}static{this.properties={hass:{attribute:!1},narrow:{type:Boolean},route:{attribute:!1},panel:{attribute:!1},_tab:{state:!0},_version:{state:!0}}}connectedCallback(){super.connectedCallback(),this._subscribe()}disconnectedCallback(){super.disconnectedCallback(),this._unsub?.then(e=>e()).catch(()=>{}),this._unsub=void 0}updated(e){e.has("hass")&&this._subscribe()}_subscribe(){if(!this.hass||this._unsub)return;let e=We(this.hass,()=>this._version++);this._unsub=e,e.then(()=>this._version++).catch(()=>{this._unsub===e&&(this._unsub=void 0)})}_t(e){return w(v(this.hass),e)}_toggleMenu(){this.dispatchEvent(new CustomEvent("hass-toggle-menu",{bubbles:!0,composed:!0}))}render(){if(!this.hass)return l``;let e=["overview","sessions"];return l`
      <header>
        <div class="toolbar">
          ${this.narrow?l`<button class="menu" aria-label=${this._t("menu")} @click=${this._toggleMenu}>
                <svg viewBox="0 0 24 24"><path d=${ft}></path></svg>
              </button>`:l``}
          <div class="title">${this._t("title")}</div>
        </div>
        <nav role="tablist">
          ${e.map(s=>l`<button
              role="tab"
              aria-selected=${this._tab===s}
              @click=${()=>this._tab=s}
            >
              ${this._t(s==="overview"?"tab_overview":"tab_sessions")}
            </button>`)}
        </nav>
      </header>
      <main>
        ${this._tab==="overview"?l`<charge-board-overview .hass=${this.hass} .version=${this._version}></charge-board-overview>`:l`<charge-board-sessions .hass=${this.hass} .version=${this._version}></charge-board-sessions>`}
      </main>
    `}static{this.styles=b`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      font-family: var(--paper-font-body1_-_font-family, inherit);
    }
    header {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--app-header-background-color, var(--primary-color));
      color: var(--app-header-text-color, var(--text-primary-color, #fff));
      border-bottom: var(--app-header-border-bottom, none);
      padding-top: env(safe-area-inset-top);
    }
    .toolbar {
      display: flex;
      align-items: center;
      height: 56px;
      padding: 0 12px;
      gap: 12px;
    }
    .title {
      font-size: 20px;
      font-weight: 400;
      margin-left: 12px;
    }
    .menu + .title {
      margin-left: 0;
    }
    button {
      all: unset;
      cursor: pointer;
    }
    button:focus-visible {
      outline: 2px solid currentColor;
    }
    .menu {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    .menu svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }
    nav {
      display: flex;
      padding: 0 12px;
    }
    nav button {
      padding: 12px 16px;
      text-transform: uppercase;
      font-size: 14px;
      font-weight: 500;
      opacity: 0.7;
      border-bottom: 2px solid transparent;
    }
    nav button[aria-selected="true"] {
      opacity: 1;
      border-bottom-color: currentColor;
    }
  `}};customElements.define("charge-board-panel",ke);
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
