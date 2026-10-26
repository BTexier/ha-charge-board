var te=globalThis,se=te.ShadowRoot&&(te.ShadyCSS===void 0||te.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,de=Symbol(),Te=new WeakMap,q=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==de)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(se&&t===void 0){let s=e!==void 0&&e.length===1;s&&(t=Te.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&Te.set(e,t))}return t}toString(){return this.cssText}},Re=i=>new q(typeof i=="string"?i:i+"",void 0,de),$=(i,...t)=>{let e=i.length===1?i[0]:t.reduce((s,r,n)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+i[n+1],i[0]);return new q(e,i,de)},Le=(i,t)=>{if(se)i.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let s=document.createElement("style"),r=te.litNonce;r!==void 0&&s.setAttribute("nonce",r),s.textContent=e.cssText,i.appendChild(s)}},pe=se?i=>i:i=>i instanceof CSSStyleSheet?(t=>{let e="";for(let s of t.cssRules)e+=s.cssText;return Re(e)})(i):i;var{is:$t,defineProperty:yt,getOwnPropertyDescriptor:xt,getOwnPropertyNames:wt,getOwnPropertySymbols:kt,getPrototypeOf:St}=Object,re=globalThis,Ne=re.trustedTypes,At=Ne?Ne.emptyScript:"",Ct=re.reactiveElementPolyfillSupport,F=(i,t)=>i,ue={toAttribute(i,t){switch(t){case Boolean:i=i?At:null;break;case Object:case Array:i=i==null?i:JSON.stringify(i)}return i},fromAttribute(i,t){let e=i;switch(t){case Boolean:e=i!==null;break;case Number:e=i===null?null:Number(i);break;case Object:case Array:try{e=JSON.parse(i)}catch{e=null}}return e}},Ve=(i,t)=>!$t(i,t),Ue={attribute:!0,type:String,converter:ue,reflect:!1,useDefault:!1,hasChanged:Ve};Symbol.metadata??=Symbol("metadata"),re.litPropertyMetadata??=new WeakMap;var A=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=Ue){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let s=Symbol(),r=this.getPropertyDescriptor(t,s,e);r!==void 0&&yt(this.prototype,t,r)}}static getPropertyDescriptor(t,e,s){let{get:r,set:n}=xt(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get:r,set(o){let c=r?.call(this);n?.call(this,o),this.requestUpdate(t,c,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??Ue}static _$Ei(){if(this.hasOwnProperty(F("elementProperties")))return;let t=St(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(F("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(F("properties"))){let e=this.properties,s=[...wt(e),...kt(e)];for(let r of s)this.createProperty(r,e[r])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[s,r]of e)this.elementProperties.set(s,r)}this._$Eh=new Map;for(let[e,s]of this.elementProperties){let r=this._$Eu(e,s);r!==void 0&&this._$Eh.set(r,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let s=new Set(t.flat(1/0).reverse());for(let r of s)e.unshift(pe(r))}else t!==void 0&&e.push(pe(t));return e}static _$Eu(t,e){let s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Le(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){let s=this.constructor.elementProperties.get(t),r=this.constructor._$Eu(t,s);if(r!==void 0&&s.reflect===!0){let n=(s.converter?.toAttribute!==void 0?s.converter:ue).toAttribute(e,s.type);this._$Em=t,n==null?this.removeAttribute(r):this.setAttribute(r,n),this._$Em=null}}_$AK(t,e){let s=this.constructor,r=s._$Eh.get(t);if(r!==void 0&&this._$Em!==r){let n=s.getPropertyOptions(r),o=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:ue;this._$Em=r;let c=o.fromAttribute(e,n.type);this[r]=c??this._$Ej?.get(r)??c,this._$Em=null}}requestUpdate(t,e,s,r=!1,n){if(t!==void 0){let o=this.constructor;if(r===!1&&(n=this[t]),s??=o.getPropertyOptions(t),!((s.hasChanged??Ve)(n,e)||s.useDefault&&s.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:r,wrapped:n},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),n!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),r===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[r,n]of this._$Ep)this[r]=n;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[r,n]of s){let{wrapped:o}=n,c=this[r];o!==!0||this._$AL.has(r)||c===void 0||this.C(r,void 0,n,c)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(e)):this._$EM()}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};A.elementStyles=[],A.shadowRootOptions={mode:"open"},A[F("elementProperties")]=new Map,A[F("finalized")]=new Map,Ct?.({ReactiveElement:A}),(re.reactiveElementVersions??=[]).push("2.1.2");var $e=globalThis,ze=i=>i,ie=$e.trustedTypes,Ke=ie?ie.createPolicy("lit-html",{createHTML:i=>i}):void 0,We="$lit$",E=`lit$${Math.random().toFixed(9).slice(2)}$`,Ye="?"+E,Et=`<${Ye}>`,L=document,B=()=>L.createComment(""),W=i=>i===null||typeof i!="object"&&typeof i!="function",ye=Array.isArray,Pt=i=>ye(i)||typeof i?.[Symbol.iterator]=="function",_e=`[ 	
\f\r]`,j=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Ie=/-->/g,qe=/>/g,T=RegExp(`>|${_e}(?:([^\\s"'>=/]+)(${_e}*=${_e}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Fe=/'/g,je=/"/g,Ze=/^(?:script|style|textarea|title)$/i,xe=i=>(t,...e)=>({_$litType$:i,strings:t,values:e}),l=xe(1),P=xe(2),It=xe(3),N=Symbol.for("lit-noChange"),d=Symbol.for("lit-nothing"),Be=new WeakMap,R=L.createTreeWalker(L,129);function Ge(i,t){if(!ye(i)||!i.hasOwnProperty("raw"))throw Error("invalid template strings array");return Ke!==void 0?Ke.createHTML(t):t}var Ot=(i,t)=>{let e=i.length-1,s=[],r,n=t===2?"<svg>":t===3?"<math>":"",o=j;for(let c=0;c<e;c++){let a=i[c],p,u,h=-1,m=0;for(;m<a.length&&(o.lastIndex=m,u=o.exec(a),u!==null);)m=o.lastIndex,o===j?u[1]==="!--"?o=Ie:u[1]!==void 0?o=qe:u[2]!==void 0?(Ze.test(u[2])&&(r=RegExp("</"+u[2],"g")),o=T):u[3]!==void 0&&(o=T):o===T?u[0]===">"?(o=r??j,h=-1):u[1]===void 0?h=-2:(h=o.lastIndex-u[2].length,p=u[1],o=u[3]===void 0?T:u[3]==='"'?je:Fe):o===je||o===Fe?o=T:o===Ie||o===qe?o=j:(o=T,r=void 0);let g=o===T&&i[c+1].startsWith("/>")?" ":"";n+=o===j?a+Et:h>=0?(s.push(p),a.slice(0,h)+We+a.slice(h)+E+g):a+E+(h===-2?c:g)}return[Ge(i,n+(i[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]},Y=class i{constructor({strings:t,_$litType$:e},s){let r;this.parts=[];let n=0,o=0,c=t.length-1,a=this.parts,[p,u]=Ot(t,e);if(this.el=i.createElement(p,s),R.currentNode=this.el.content,e===2||e===3){let h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(r=R.nextNode())!==null&&a.length<c;){if(r.nodeType===1){if(r.hasAttributes())for(let h of r.getAttributeNames())if(h.endsWith(We)){let m=u[o++],g=r.getAttribute(h).split(E),S=/([.?@])?(.*)/.exec(m);a.push({type:1,index:n,name:S[2],strings:g,ctor:S[1]==="."?ge:S[1]==="?"?fe:S[1]==="@"?ve:z}),r.removeAttribute(h)}else h.startsWith(E)&&(a.push({type:6,index:n}),r.removeAttribute(h));if(Ze.test(r.tagName)){let h=r.textContent.split(E),m=h.length-1;if(m>0){r.textContent=ie?ie.emptyScript:"";for(let g=0;g<m;g++)r.append(h[g],B()),R.nextNode(),a.push({type:2,index:++n});r.append(h[m],B())}}}else if(r.nodeType===8)if(r.data===Ye)a.push({type:2,index:n});else{let h=-1;for(;(h=r.data.indexOf(E,h+1))!==-1;)a.push({type:7,index:n}),h+=E.length-1}n++}}static createElement(t,e){let s=L.createElement("template");return s.innerHTML=t,s}};function V(i,t,e=i,s){if(t===N)return t;let r=s!==void 0?e._$Co?.[s]:e._$Cl,n=W(t)?void 0:t._$litDirective$;return r?.constructor!==n&&(r?._$AO?.(!1),n===void 0?r=void 0:(r=new n(i),r._$AT(i,e,s)),s!==void 0?(e._$Co??=[])[s]=r:e._$Cl=r),r!==void 0&&(t=V(i,r._$AS(i,t.values),r,s)),t}var me=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:s}=this._$AD,r=(t?.creationScope??L).importNode(e,!0);R.currentNode=r;let n=R.nextNode(),o=0,c=0,a=s[0];for(;a!==void 0;){if(o===a.index){let p;a.type===2?p=new Z(n,n.nextSibling,this,t):a.type===1?p=new a.ctor(n,a.name,a.strings,this,t):a.type===6&&(p=new be(n,this,t)),this._$AV.push(p),a=s[++c]}o!==a?.index&&(n=R.nextNode(),o++)}return R.currentNode=L,r}p(t){let e=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}},Z=class i{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,r){this.type=2,this._$AH=d,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=V(this,t,e),W(t)?t===d||t==null||t===""?(this._$AH!==d&&this._$AR(),this._$AH=d):t!==this._$AH&&t!==N&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Pt(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==d&&W(this._$AH)?this._$AA.nextSibling.data=t:this.T(L.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:s}=t,r=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=Y.createElement(Ge(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===r)this._$AH.p(e);else{let n=new me(r,this),o=n.u(this.options);n.p(e),this.T(o),this._$AH=n}}_$AC(t){let e=Be.get(t.strings);return e===void 0&&Be.set(t.strings,e=new Y(t)),e}k(t){ye(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,s,r=0;for(let n of t)r===e.length?e.push(s=new i(this.O(B()),this.O(B()),this,this.options)):s=e[r],s._$AI(n),r++;r<e.length&&(this._$AR(s&&s._$AB.nextSibling,r),e.length=r)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let s=ze(t).nextSibling;ze(t).remove(),t=s}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},z=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,r,n){this.type=1,this._$AH=d,this._$AN=void 0,this.element=t,this.name=e,this._$AM=r,this.options=n,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=d}_$AI(t,e=this,s,r){let n=this.strings,o=!1;if(n===void 0)t=V(this,t,e,0),o=!W(t)||t!==this._$AH&&t!==N,o&&(this._$AH=t);else{let c=t,a,p;for(t=n[0],a=0;a<n.length-1;a++)p=V(this,c[s+a],e,a),p===N&&(p=this._$AH[a]),o||=!W(p)||p!==this._$AH[a],p===d?t=d:t!==d&&(t+=(p??"")+n[a+1]),this._$AH[a]=p}o&&!r&&this.j(t)}j(t){t===d?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},ge=class extends z{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===d?void 0:t}},fe=class extends z{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==d)}},ve=class extends z{constructor(t,e,s,r,n){super(t,e,s,r,n),this.type=5}_$AI(t,e=this){if((t=V(this,t,e,0)??d)===N)return;let s=this._$AH,r=t===d&&s!==d||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,n=t!==d&&(s===d||r);r&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},be=class{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){V(this,t)}};var Ht=$e.litHtmlPolyfillSupport;Ht?.(Y,Z),($e.litHtmlVersions??=[]).push("3.3.3");var Je=(i,t,e)=>{let s=e?.renderBefore??t,r=s._$litPart$;if(r===void 0){let n=e?.renderBefore??null;s._$litPart$=r=new Z(t.insertBefore(B(),n),n,void 0,e??{})}return r._$AI(i),r};var we=globalThis,f=class extends A{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=Je(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return N}};f._$litElement$=!0,f.finalized=!0,we.litElementHydrateSupport?.({LitElement:f});var Mt=we.litElementPolyfillSupport;Mt?.({LitElement:f});(we.litElementVersions??=[]).push("4.2.2");var C=(i,t,e={})=>i.connection.sendMessagePromise({type:`charge_board/${t}`,...e}),O=i=>C(i,"overview"),ne=(i,t={})=>C(i,"sessions",{...t}),Xe=(i,t)=>C(i,"session",{session_id:t}),Qe=(i,t,e)=>C(i,"set_vehicle",{session_id:t,vehicle_id:e}),et=(i,t)=>C(i,"delete",{session_id:t}),ke=(i,t,e)=>C(i,"merge",{session_id:t,other_id:e}),tt=(i,t,e)=>C(i,"split",{session_id:t,at:e}),st=(i,t,e)=>C(i,"stats",{year:t,...e&&{vehicle_id:e}}),rt=(i,t)=>C(i,"vehicle",{vehicle_id:t});async function it(i,t,e,s){return((await i.connection.sendMessagePromise({type:"recorder/statistics_during_period",start_time:new Date(e*1e3).toISOString(),end_time:new Date(s*1e3).toISOString(),statistic_ids:[t],period:"hour",types:["mean"]}))[t]??[]).filter(n=>n.mean!=null).map(n=>({t:(typeof n.start=="number"?n.start:Date.parse(n.start))/1e3,v:n.mean}))}var nt=(i,t)=>i.connection.subscribeMessage(t,{type:"charge_board/subscribe"});var Dt={title:"EVChargeData",tab_overview:"Aper\xE7u",tab_sessions:"Sessions",loading:"Chargement\u2026",error:"Impossible de charger les donn\xE9es",not_loaded:"EVChargeData n'est pas charg\xE9",no_chargers:"Aucun chargeur configur\xE9. Ajoutez-en un dans les param\xE8tres de l'int\xE9gration EVChargeData.",charging:"En charge",plugged:"Branch\xE9",free:"Libre",power:"puissance",session:"session",cost:"co\xFBt",end:"fin estim\xE9e",end_short:"fin {time}",plugged_since:"Branch\xE9e depuis {time}",charging_since:"en charge depuis {time}",charge_started:"d\xE9but de charge {time}",off_peak:"{share} heures creuses",last_session:"Derni\xE8re session : {summary}",no_session:"Aucune session enregistr\xE9e",no_vehicle:"aucun v\xE9hicule",menu:"Menu",close:"Fermer",all_vehicles:"Tous les v\xE9hicules",all_chargers:"Tous les chargeurs",month:"Mois",sessions_count:"{n} sessions",off_peak_short:"{share} HC",col_start:"D\xE9but",col_end:"Fin",col_vehicle:"V\xE9hicule",col_battery:"Batterie",col_kwh:"kWh",col_duration:"Dur\xE9e de charge",col_cost:"Co\xFBt",edited:"modifi\xE9e",estimated_note:"* co\xFBt estim\xE9",unpriced_note:"\u2265 : {n} session(s) sans prix",no_sessions:"Aucune session pour ces filtres",back:"Retour",session_of:"Session du {day}",energy:"\xE9nergie",battery:"batterie",average:"moyenne",chart_hint:"Touchez le graphique pour choisir o\xF9 couper la session.",plugged_at:"Branch\xE9e",charge:"Charge",unplugged_at:"D\xE9branch\xE9e",off_peak_slice:"Heures creuses",peak_slice:"Heures pleines",price_slice:"{price} /kWh",unknown_price:"Prix inconnu",charging_time:"Temps de charge",plugged_time:"{time} branch\xE9e",vehicle:"V\xE9hicule",delete:"Supprimer",merge_prev:"Fusionner avec la pr\xE9c\xE9dente",merge_next:"Fusionner avec la suivante",split:"Couper",confirm_delete:"Supprimer d\xE9finitivement cette session ?",confirm_split:"Couper la session \xE0 {time} ?",confirm:"Confirmer",cancel:"Annuler",in_progress_note:"Session en cours : corrections impossibles.",err_invalid:"Correction refus\xE9e : op\xE9ration invalide pour cette session.",err_in_progress:"Correction refus\xE9e : la session est encore en cours.",err_not_found:"Cette session n'existe plus.",tab_vehicles:"V\xE9hicules",tab_stats:"Statistiques",year:"Ann\xE9e",current_month:"{month} (en cours)",vs_prev:"vs mois pr\xE9c\xE9dent",sessions_n:"{n} sessions",off_peak_label:"heures creuses",per_100km:"aux 100 km",km_n:"{km} km",vs_petrol:"vs essence",petrol_ref:"{l100} L/100 \xB7 {price}/L",cost_by_month:"Co\xFBt par mois",col_month:"Mois",col_sessions:"Sessions",col_hc:"HC",col_km:"km",col_per_100:"\u20AC/100 km",col_vs_petrol:"vs essence",col_kwh_100:"kWh/100 km",total_year:"Total {year}",km_note:"* km partiels : le compteur n'est suivi que depuis une partie du mois.",stats_settings_note:"Kilom\xE9trage et consommation essence de r\xE9f\xE9rence dans la fiche du v\xE9hicule ; prix de l'essence dans les options de EVChargeData.",no_vehicles:"Aucun v\xE9hicule configur\xE9.",battery_now:"batterie",target_n:"objectif {n} %",consumption_30d:"aux 100 km (30 j)",odometer:"compteur",autonomy:"autonomie estim\xE9e",battery_30d:"Batterie sur 30 jours",recharges:"recharges",consumption_by_month:"Consommation par mois (\xE9nergie recharg\xE9e \xF7 km)",consumption_since:"Depuis la derni\xE8re recharge : {value} kWh/100 km (c\xF4t\xE9 batterie)",configuration:"Configuration",edit:"Modifier",cfg_soc_entity:"Batterie",cfg_target:"Objectif",cfg_odometer_entity:"Kilom\xE9trage",cfg_fuel_price:"Prix de l'essence",cfg_fuel_l100:"Essence de r\xE9f\xE9rence",cfg_capacity:"Capacit\xE9",target_vehicle:"fix\xE9 par le v\xE9hicule",target_home:"maison : EVChargeData coupe la charge",cut_ignored:"Objectif maison sans effet : aucun chargeur n'a \xE0 la fois une entit\xE9 de branchement et un interrupteur.",fixed_value:"valeur fixe"},Tt={title:"EVChargeData",tab_overview:"Overview",tab_sessions:"Sessions",loading:"Loading\u2026",error:"Could not load the data",not_loaded:"EVChargeData is not loaded",no_chargers:"No charger configured. Add one in the EVChargeData integration settings.",charging:"Charging",plugged:"Plugged in",free:"Free",power:"power",session:"session",cost:"cost",end:"estimated end",end_short:"end {time}",plugged_since:"Plugged in since {time}",charging_since:"charging since {time}",charge_started:"charge started {time}",off_peak:"{share} off-peak",last_session:"Last session: {summary}",no_session:"No session recorded",no_vehicle:"no vehicle",menu:"Menu",close:"Close",all_vehicles:"All vehicles",all_chargers:"All chargers",month:"Month",sessions_count:"{n} sessions",off_peak_short:"{share} off-peak",col_start:"Start",col_end:"End",col_vehicle:"Vehicle",col_battery:"Battery",col_kwh:"kWh",col_duration:"Charging time",col_cost:"Cost",edited:"edited",estimated_note:"* estimated cost",unpriced_note:"\u2265: {n} session(s) without a price",no_sessions:"No session for these filters",back:"Back",session_of:"Session of {day}",energy:"energy",battery:"battery",average:"average",chart_hint:"Tap the chart to choose where to split the session.",plugged_at:"Plugged in",charge:"Charge",unplugged_at:"Unplugged",off_peak_slice:"Off-peak",peak_slice:"Peak",price_slice:"{price} /kWh",unknown_price:"Unknown price",charging_time:"Charging time",plugged_time:"{time} plugged in",vehicle:"Vehicle",delete:"Delete",merge_prev:"Merge with previous",merge_next:"Merge with next",split:"Split",confirm_delete:"Delete this session permanently?",confirm_split:"Split the session at {time}?",confirm:"Confirm",cancel:"Cancel",in_progress_note:"Session in progress: no corrections.",err_invalid:"Correction refused: invalid operation for this session.",err_in_progress:"Correction refused: the session is still in progress.",err_not_found:"This session no longer exists.",tab_vehicles:"Vehicles",tab_stats:"Statistics",year:"Year",current_month:"{month} (in progress)",vs_prev:"vs previous month",sessions_n:"{n} sessions",off_peak_label:"off-peak",per_100km:"per 100 km",km_n:"{km} km",vs_petrol:"vs petrol",petrol_ref:"{l100} L/100 \xB7 {price}/L",cost_by_month:"Cost per month",col_month:"Month",col_sessions:"Sessions",col_hc:"Off-peak",col_km:"km",col_per_100:"/100 km",col_vs_petrol:"vs petrol",col_kwh_100:"kWh/100 km",total_year:"Total {year}",km_note:"* partial km: the odometer is tracked for part of the month only.",stats_settings_note:"Odometer and reference petrol consumption in the vehicle settings; petrol price in the EVChargeData options.",no_vehicles:"No vehicle configured.",battery_now:"battery",target_n:"target {n}%",consumption_30d:"per 100 km (30 d)",odometer:"odometer",autonomy:"estimated range",battery_30d:"Battery over 30 days",recharges:"charges",consumption_by_month:"Consumption per month (energy charged \xF7 km)",consumption_since:"Since the last charge: {value} kWh/100 km (battery side)",configuration:"Settings",edit:"Edit",cfg_soc_entity:"Battery",cfg_target:"Target",cfg_odometer_entity:"Odometer",cfg_fuel_price:"Petrol price",cfg_fuel_l100:"Reference petrol car",cfg_capacity:"Capacity",target_vehicle:"set by the vehicle",target_home:"home: EVChargeData stops the charge",cut_ignored:"Home target has no effect: no charger has both a plug entity and a switch.",fixed_value:"fixed value"},Rt={fr:Dt,en:Tt},y=i=>i.language?.startsWith("fr")?"fr":"en",v=i=>i.locale?.language??i.language??"en";function x(i,t,e={}){return Rt[i][t].replace(/\{(\w+)\}/g,(s,r)=>e[r]??"")}function k(i){let t=i?.code;return t==="not_loaded"?"not_loaded":t==="invalid"||t==="in_progress"||t==="not_found"?`err_${t}`:"error"}var Se=i=>i.replace(/[  ]/g," "),ot=(i,t,e)=>Se(i.toLocaleString(t,{minimumFractionDigits:e,maximumFractionDigits:e}));function w(i,t){return i==null?"\u2014":`${ot(i,t,1)} kWh`}function K(i,t){return i==null?"\u2014":`${ot(i/1e3,t,1)} kW`}function b(i,t,e){return i==null?"\u2014":Se(new Intl.NumberFormat(e,{style:"currency",currency:t}).format(i))}function G(i,t){let e=Math.round(i/60),s=Math.floor(e/60),r=e%60;if(s===0)return`${r} min`;let n=String(r).padStart(2,"0");return t==="fr"?`${s} h ${n}`:`${s} h ${n} min`}function I(i,t){if(i==null&&t==null)return"\u2014";let e=s=>s==null?"\u2014":String(Math.round(s));return`${e(i)} \u2192 ${e(t)} %`}function M(i,t){return Se(i.toLocaleString(t,{style:"percent",maximumFractionDigits:0}))}var oe=(i,t,e,s)=>new Intl.DateTimeFormat(t,{timeZone:e,...s}).format(new Date(i*1e3));function U(i,t,e){return oe(i,t,e,{hour:"2-digit",minute:"2-digit"})}function H(i,t,e){return oe(i,t,e,{day:"2-digit",month:"2-digit"})}function J(i,t,e,s=Date.now()/1e3){let r=U(i,t,e),n=H(i,t,e);return n===H(s,t,e)?r:`${n} ${r}`}function ae(i,t,e){return`${oe(i,t,e,{weekday:"short"})} ${H(i,t,e)} ${U(i,t,e)}`}function X(i,t){return oe(i,"en-CA",t,{year:"numeric",month:"2-digit"})}function at(i,t){return`${i<0?"\u25BC":"\u25B2"} ${M(Math.abs(i),t)}`}var ct={charging:"var(--success-color, #43a047)",plugged:"var(--info-color, #039be5)",free:"var(--disabled-text-color, #9e9e9e)"},Ae=class extends f{constructor(){super(...arguments);this.version=0;this._req=0}static{this.properties={hass:{attribute:!1},version:{type:Number},_data:{state:!0},_error:{state:!0},_open:{state:!0}}}updated(e){e.has("version")&&this.hass&&this._fetch(),e.has("_open")&&this._open&&this.renderRoot.querySelector("dialog")?.showModal()}async _fetch(){let e=++this._req;try{let s=await O(this.hass);if(e!==this._req)return;this._data=s,this._error=void 0}catch(s){e===this._req&&(this._error=k(s))}}_t(e,s){return x(y(this.hass),e,s)}render(){if(this._error)return l`<p class="message">${this._t(this._error)}</p>`;if(!this._data)return l`<p class="message">${this._t("loading")}</p>`;let{chargers:e,style:s}=this._data;if(!e.length)return l`<p class="message">${this._t("no_chargers")}</p>`;if(s!=="compact")return l`<div class="grid">${e.map(n=>this._card(n))}</div>`;let r=e.find(n=>n.id===this._open);return l`
      <div class="grid compact">${e.map(n=>this._tile(n))}</div>
      ${r?l`<dialog @close=${()=>this._open=void 0} @click=${this._backdropClose}>
            <div class="dialog-bar">
              <button aria-label=${this._t("close")} @click=${this._close}>×</button>
            </div>
            ${this._card(r)}
          </dialog>`:d}
    `}_backdropClose(e){e.target===e.currentTarget&&this._close()}_close(){this.renderRoot.querySelector("dialog")?.close()}get _fmt(){let e=v(this.hass),s=this.hass.config.time_zone;return{locale:e,when:r=>J(r,e,s),time:r=>U(r,e,s),day:r=>H(r,e,s),cost:r=>b(r,this._data.currency,e)}}_stateLabel(e){return this._t(e.state)}_idle(e){return e.state==="free"&&!e.session}_card(e){let s=this._fmt,r=e.session,n=e.vehicle?.soc??null,o=r?[r.plugged_at!=null?this._t("plugged_since",{time:s.when(r.plugged_at)}):null,r.charge_start!=null?this._t(e.state==="charging"?"charging_since":"charge_started",{time:s.when(r.charge_start)}):null,r.has_off_peak_source&&r.energy_kwh>0?this._t("off_peak",{share:M(r.off_peak.kwh/r.energy_kwh,s.locale)}):null].filter(Boolean):[];return l`
      <ha-card class="card" style="--state:${ct[e.state]}">
        <div class="head">
          <span class="name"><ha-icon icon="mdi:ev-station"></ha-icon>${e.name}</span>
          <span class="state">${this._stateLabel(e)}</span>
        </div>
        ${this._idle(e)?l`<div class="muted">${this._lastSession(e)}</div>`:l`
              <div class="vehicle">
                <ha-icon icon="mdi:car-electric"></ha-icon>
                <b>${e.vehicle?.name??"\u2014"}</b> ·
                ${n==null?"\u2014":I(n,e.vehicle?.target)}
              </div>
              ${n==null?d:l`<div class="bar"><div style="width:${Math.min(100,Math.max(0,n))}%"></div></div>`}
              <div class="stats">
                ${this._stat(K(e.power_w,s.locale),"power")}
                ${this._stat(w(r?.energy_kwh,s.locale),"session")}
                ${this._stat(s.cost(r?.cost),"cost")}
                ${e.estimated_end==null?d:this._stat(s.time(e.estimated_end),"end")}
              </div>
              ${o.length?l`<div class="muted">${o.join(" \xB7 ")}</div>`:d}
            `}
      </ha-card>
    `}_stat(e,s){return l`<div><div class="value">${e}</div><div class="muted">${this._t(s)}</div></div>`}_lastSession(e){let s=e.last_session;if(!s)return this._t("no_session");let r=this._fmt,n=s.charge_start??s.plugged_at,o=[s.vehicle_name??"\u2014",n!=null?r.day(n):null,w(s.energy_kwh,r.locale),r.cost(s.cost)].filter(Boolean);return this._t("last_session",{summary:o.join(" \xB7 ")})}_tile(e){let s=this._fmt,r=this._idle(e)?null:e.vehicle?.soc??null,n=r==null?"0":String(Math.min(100,Math.max(0,r))),o=this._idle(e)?this._t("free").toLowerCase():r==null?"\u2014":`${Math.round(r)} %`,c=[K(e.power_w,s.locale),s.cost(e.session?.cost),e.estimated_end==null?null:this._t("end_short",{time:s.time(e.estimated_end)})].filter(Boolean);return l`
      <ha-card class="tile" style="--state:${ct[e.state]}">
        <button @click=${()=>this._open=e.id}>
          <div class="gauge" style="--soc:${n}%"><span>${o}</span></div>
          <b>${e.name}</b>
          ${this._idle(e)?l`<div class="muted">${this._t("no_vehicle")}</div>`:l`
                <div>${e.vehicle?.name??"\u2014"} · ${this._stateLabel(e).toLowerCase()}</div>
                <div class="muted">${c.join(" \xB7 ")}</div>
              `}
        </button>
      </ha-card>
    `}static{this.styles=$`
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
  `}};customElements.define("charge-board-overview",Ae);function lt(i,t,e,s){return e+Math.min(Math.max(i,0),t)/t*(s-e)}var Lt=360,ht=(i,t,e)=>Math.max(Math.min(t+1<i.length?i[t+1].t:e,i[t].t+Lt),i[t].t),D=i=>Math.round(i*10)/10;function dt(i,t,e,s=i[0]?.t??0,r=i[i.length-1]?.t??0){if(!i.length)return"";let n=Math.max(...i.map(u=>u.w),1),o=r-s||1,c=u=>D((u-s)/o*t),a=u=>D(e-Math.max(u,0)/n*e);return i.map((u,h)=>{let m=ht(i,h,r),g=h+1<i.length?i[h+1].t:r,S=`${h?"L":"M"}${c(u.t)} ${a(u.w)} L${c(m)} ${a(u.w)}`;return m<g?`${S} L${c(m)} ${a(0)} L${c(g)} ${a(0)}`:S}).join(" ")}function pt(i,t){let e=[];return i.forEach((s,r)=>{if(!s.off_peak)return;let n=ht(i,r,t),o=e[e.length-1];o&&o.to===s.t?o.to=n:e.push({from:s.t,to:n})}),e}function ut(i,t){let e=Math.max(...i.map(r=>r.off_peak_cost+r.peak_cost),0)||1,s=100/(i.length||1);return i.map((r,n)=>({x:D(n*s+s*.15),w:D(s*.7),hOff:D(r.off_peak_cost/e*t),hPeak:D(r.peak_cost/e*t)}))}function _t(i,t,e,s,r,n=100){if(!i.length)return"";let o=r-s||1;return i.map((c,a)=>`${a?"L":"M"}${D((c.t-s)/o*t)} ${D(e-c.v/n*e)}`).join(" ")}var ce=600,Q=160,Ce=class extends f{constructor(){super(...arguments);this.version=0;this.currency="EUR";this.vehicles=[];this._busy=!1;this._req=0}static{this.properties={hass:{attribute:!1},sessionId:{attribute:!1},version:{type:Number},currency:{attribute:!1},vehicles:{attribute:!1},_s:{state:!0},_prev:{state:!0},_next:{state:!0},_pending:{state:!0},_busy:{state:!0}}}updated(e){e.has("sessionId")&&(this._s=void 0,this._pending=void 0),(e.has("sessionId")||e.has("version"))&&this.hass&&this._fetch()}async _fetch(){let e=++this._req;try{let s=await Xe(this.hass,this.sessionId),{sessions:r}=await ne(this.hass,{charger_id:s.charger_id});if(e!==this._req)return;let n=a=>a.charge_start??a.plugged_at??0,o=[...r].sort((a,p)=>n(a)-n(p)),c=o.findIndex(a=>a.id===s.id);this._prev=c>0?o[c-1].id:void 0,this._next=c>=0&&c+1<o.length?o[c+1].id:void 0,this._s=s}catch(s){e===this._req&&this._emit("session-changed",{id:void 0,error:k(s)})}}_emit(e,s){this.dispatchEvent(new CustomEvent(e,{detail:s,bubbles:!0,composed:!0}))}async _run(e){this._pending=void 0,this._busy=!0;try{let{sessions:s}=await e();this._emit("session-changed",{id:s[0]}),s[0]===this.sessionId&&this._fetch()}catch(s){let r=k(s);this._emit("session-changed",{id:r==="err_not_found"?void 0:this.sessionId,error:r}),this._fetch()}finally{this._busy=!1}}_t(e,s){return x(y(this.hass),e,s)}get _range(){let e=this._s,s=e.charge_start??e.curve[0]?.t??0;return{start:s,end:Math.max(e.charge_end??s,s+1)}}_chartClick(e){if(this._s.open)return;let r=e.currentTarget.getBoundingClientRect(),{start:n,end:o}=this._range,c=Math.round(lt(e.clientX-r.left,r.width,n,o));n<c&&c<o&&(this._pending={kind:"split",at:c})}render(){if(!this._s)return l`<div class="card"><p class="muted">${this._t("loading")}</p></div>`;let e=this._s,s=v(this.hass),r=this.hass.config.time_zone,n=e.charge_start??void 0,o=m=>m==null?"\u2014":J(m,s,r,n),c=m=>b(m,this.currency,s),a=e.charging_s>0?e.energy_kwh*36e5/e.charging_s:null,p=e.plugged_at!=null&&e.unplugged_at!=null?e.unplugged_at-e.plugged_at:null,u=y(this.hass),h=[e.charge_start!=null?this._t("session_of",{day:ae(e.charge_start,s,r)}):null,e.vehicle_name,e.charger_name].filter(Boolean);return l`
      <div class="card">
        <button class="back" @click=${()=>this._emit("back")}>← ${this._t("back")}</button>
        <div class="head">
          <b>${h.join(" \xB7 ")}</b>
          ${e.edited?l`<span class="badge">${this._t("edited")}</span>`:d}
        </div>
        <div class="figures">
          ${this._figure(w(e.energy_kwh,s),"energy")}
          ${this._figure(`${c(e.cost)}${e.estimated?" *":""}`,"cost")}
          ${this._figure(I(e.soc_start,e.soc_end),"battery")}
          ${this._figure(K(a,s),"average")}
        </div>
        ${this._chart()}
        <table class="facts">
          <tr><td>${this._t("plugged_at")}</td><td>${o(e.plugged_at)}</td></tr>
          <tr><td>${this._t("charge")}</td><td>${o(e.charge_start)} → ${o(e.charge_end)}</td></tr>
          <tr><td>${this._t("unplugged_at")}</td><td>${o(e.unplugged_at)}</td></tr>
          ${this._slices(s).map(([m,g])=>l`<tr><td>${m}</td><td>${w(g.kwh,s)} · ${c(g.cost)}</td></tr>`)}
          <tr>
            <td>${this._t("charging_time")}</td>
            <td>
              ${G(e.charging_s,u)}
              ${p==null?d:l` / ${this._t("plugged_time",{time:G(p,u)})}`}
            </td>
          </tr>
        </table>
        ${e.open?l`<p class="muted">${this._t("in_progress_note")}</p>`:this._actions()}
      </div>
    `}_figure(e,s){return l`<div><div class="value">${e}</div><div class="muted">${this._t(s)}</div></div>`}_slices(e){let s=this._s;return s.has_off_peak_source?[[this._t("off_peak_slice"),s.off_peak],[this._t("peak_slice"),s.peak]]:Object.entries(s.by_price).map(([r,n])=>[r==="none"?this._t("unknown_price"):this._t("price_slice",{price:new Intl.NumberFormat(e,{style:"currency",currency:this.currency,maximumFractionDigits:4}).format(Number(r))}),n])}_chart(){let e=this._s,{start:s,end:r}=this._range,n=u=>(u-s)/(r-s)*ce,o=v(this.hass),c=this.hass.config.time_zone,a=Math.max(0,...e.curve.map(u=>u.w)),p=this._pending?.kind==="split"?this._pending.at:void 0;return l`
      <svg
        class="chart ${e.open?"":"clickable"}"
        viewBox="0 0 ${ce} ${Q}"
        preserveAspectRatio="none"
        role="img"
        @click=${this._chartClick}
      >
        ${e.has_off_peak_source?P`<rect class="peak" x="0" y="0" width=${ce} height=${Q}></rect>
              ${pt(e.curve,r).map(u=>P`<rect class="off-peak" x=${n(u.from)} y="0" width=${n(u.to)-n(u.from)} height=${Q}></rect>`)}`:d}
        <path class="line" d=${dt(e.curve,ce,Q-4,s,r)} transform="translate(0 4)"></path>
        ${p==null?d:P`<line class="cut" x1=${n(p)} x2=${n(p)} y1="0" y2=${Q}></line>`}
      </svg>
      <div class="axis muted">
        <span>${U(s,o,c)}</span>
        <span>${a?`max ${K(a,o)}`:""}</span>
        <span>${U(r,o,c)}</span>
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
      ${r?.kind==="split"?o(this._t("confirm_split",{time:J(r.at,v(this.hass),n,e.charge_start??void 0)}),()=>tt(this.hass,s,r.at)):d}
      ${r?.kind==="delete"?o(this._t("confirm_delete"),()=>et(this.hass,s)):d}
      <div class="actions">
        <label>
          ${this._t("vehicle")}
          <select
            ?disabled=${this._busy}
            @change=${c=>{let a=c.target,p=a.value;a.value=e.vehicle_id??"",p&&p!==e.vehicle_id&&this._run(()=>Qe(this.hass,s,p))}}
          >
            ${e.vehicle_id==null?l`<option value="" selected>${"\u2014"}</option>`:d}
            ${this.vehicles.map(c=>l`<option value=${c.id} .selected=${c.id===e.vehicle_id}>${c.name}</option>`)}
          </select>
        </label>
        <button
          ?disabled=${this._busy||!this._prev}
          @click=${()=>this._run(()=>ke(this.hass,s,this._prev))}
        >
          ${this._t("merge_prev")}
        </button>
        <button
          ?disabled=${this._busy||!this._next}
          @click=${()=>this._run(()=>ke(this.hass,s,this._next))}
        >
          ${this._t("merge_next")}
        </button>
        <button class="danger" ?disabled=${this._busy} @click=${()=>this._pending={kind:"delete"}}>
          ${this._t("delete")}
        </button>
      </div>
    `}static{this.styles=$`
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
  `}};customElements.define("charge-board-session-detail",Ce);var Ee=class extends f{constructor(){super(...arguments);this.version=0;this._vehicle="";this._charger="";this._req=0}static{this.properties={hass:{attribute:!1},version:{type:Number},_sessions:{state:!0},_summary:{state:!0},_overview:{state:!0},_error:{state:!0},_message:{state:!0},_vehicle:{state:!0},_charger:{state:!0},_month:{state:!0},_selected:{state:!0}}}willUpdate(){this._month===void 0&&this.hass&&(this._month=X(Date.now()/1e3,this.hass.config.time_zone))}updated(e){["version","_vehicle","_charger","_month"].some(s=>e.has(s))&&this.hass&&this._fetch()}async _fetch(){let e=++this._req,s={...this._vehicle&&{vehicle_id:this._vehicle},...this._charger&&{charger_id:this._charger},...this._month&&{month:this._month}};try{let[r,n]=await Promise.all([ne(this.hass,s),O(this.hass)]);if(e!==this._req)return;this._sessions=r.sessions,this._summary=r.summary,this._overview=n,this._error=void 0}catch(r){e===this._req&&(this._error=k(r))}}_t(e,s){return x(y(this.hass),e,s)}_changed(e){this._selected=e.detail.id,this._message=e.detail.error,this._fetch()}render(){if(this._error&&!this._sessions)return l`<p class="message">${this._t(this._error)}</p>`;if(!this._sessions||!this._overview)return l`<p class="message">${this._t("loading")}</p>`;let e=this._overview,s=(r,n,o,c)=>l`<select @change=${a=>c(a.target.value)}>
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
    `}_banner(){let e=this._summary,s=v(this.hass),r=b(e.cost,this._overview.currency,s);e.cost!=null&&e.unpriced_count>0&&(r=`\u2265 ${r}`);let o=[this._month?new Date(`${this._month}-15T12:00:00Z`).toLocaleString(s,{month:"long",year:"numeric",timeZone:"UTC"}):null,this._t("sessions_count",{n:String(e.count)}),w(e.energy_kwh,s),l`<b>${r}</b>`,e.off_peak_share==null?"\u2014":this._t("off_peak_short",{share:M(e.off_peak_share,s)})].filter(c=>c!=null);return l`<div class="banner">${o.map((c,a)=>l`${a?" \xB7 ":""}${c}`)}</div>`}_table(){let e=this._sessions;if(!e.length)return l`<p class="message">${this._t("no_sessions")}</p>`;let s=v(this.hass),r=this.hass.config.time_zone,n=a=>a==null?"\u2014":ae(a,s,r),o=["col_start","col_end","col_vehicle","col_battery","col_kwh","col_duration","col_cost"],c=this._summary.unpriced_count;return l`
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
                <td>${I(a.soc_start,a.soc_end)}</td>
                <td>${a.energy_kwh.toLocaleString(s,{minimumFractionDigits:1,maximumFractionDigits:1})}</td>
                <td>${G(a.charging_s,y(this.hass))}</td>
                <td>
                  ${b(a.cost,this._overview.currency,s)}${a.estimated?" *":""}
                  ${a.edited?l`<span class="badge">${this._t("edited")}</span>`:d}
                </td>
              </tr>`)}
          </tbody>
        </table>
      </div>
      <div class="note">
        ${this._t("estimated_note")}${c?l` · ${this._t("unpriced_note",{n:String(c)})}`:d}
      </div>
    `}static{this.styles=$`
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
  `}};customElements.define("charge-board-sessions",Ee);var le=$`
  :host {
    display: block;
    padding: 16px;
    max-width: 1100px;
    margin: 0 auto;
  }
  .message,
  .note,
  .label,
  small {
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
  button.chip {
    font: inherit;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--divider-color, #e0e0e0);
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color);
    cursor: pointer;
  }
  button.chip[aria-pressed="true"] {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
  .card,
  .scroll {
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: var(--ha-card-border-radius, 12px);
    margin-bottom: 12px;
  }
  .card {
    padding: 12px;
  }
  .label {
    margin-bottom: 8px;
  }
  .figs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
    text-align: center;
  }
  .fig b {
    display: block;
    font-size: 1.3em;
  }
  .fig span,
  .fig small {
    display: block;
    font-size: 0.85em;
  }
  .good {
    color: var(--success-color, #16a34a);
  }
  .bad {
    color: var(--error-color, #db4437);
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
  }
  @media (max-width: 600px) {
    :host {
      padding: 8px;
    }
  }
`;var ee=110,Pe=class extends f{constructor(){super(...arguments);this.version=0;this._year=new Date().getFullYear();this._req=0}static{this.properties={hass:{attribute:!1},version:{type:Number},_stats:{state:!0},_overview:{state:!0},_error:{state:!0},_vehicle:{state:!0},_year:{state:!0}}}updated(e){["version","_vehicle","_year"].some(s=>e.has(s))&&this.hass&&this._fetch()}async _fetch(){let e=++this._req;try{let s=this._overview??await O(this.hass);this._vehicle===void 0&&(this._vehicle=s.vehicles[0]?.id??"");let r=await st(this.hass,this._year,this._vehicle||void 0);if(e!==this._req)return;this._overview=s,this._stats=r,this._error=void 0}catch(s){e===this._req&&(this._error=k(s))}}_t(e,s){return x(y(this.hass),e,s)}_monthName(e,s="long"){return new Date(`${e}-15T12:00:00Z`).toLocaleString(v(this.hass),{month:s,...s==="long"&&{year:"numeric"},timeZone:"UTC"})}render(){if(this._error&&!this._stats)return l`<p class="message">${this._t(this._error)}</p>`;if(!this._stats||!this._overview)return l`<p class="message">${this._t("loading")}</p>`;let e=Array.from({length:5},(s,r)=>new Date().getFullYear()-r);return l`
      <div class="filters">
        <select @change=${s=>this._vehicle=s.target.value}>
          ${this._overview.vehicles.map(s=>l`<option value=${s.id} ?selected=${s.id===this._vehicle}>${s.name}</option>`)}
          <option value="" ?selected=${this._vehicle===""}>${this._t("all_vehicles")}</option>
        </select>
        <select
          aria-label=${this._t("year")}
          @change=${s=>this._year=Number(s.target.value)}
        >
          ${e.map(s=>l`<option value=${s} ?selected=${s===this._year}>${s}</option>`)}
        </select>
      </div>
      ${this._error?l`<p class="error">${this._t(this._error)}</p>`:d} ${this._head()} ${this._bars()}
      ${this._table()}
      <div class="note">${this._t("km_note")}<br />${this._t("stats_settings_note")}</div>
    `}_head(){let{rows:e,total:s,currency:r}=this._stats,n=v(this.hass),o=X(Date.now()/1e3,this.hass.config.time_zone),c=e.findIndex(he=>he.month===o),a=c>=0?e[c]:s,p=c>0?e[c-1]:null,u=c>=0?this._t("current_month",{month:this._monthName(o)}):this._t("total_year",{year:String(this._year)}),h=p&&p.cost&&a.cost!=null?l`<small class="delta ${a.cost<=p.cost?"good":"bad"}"
          >${at(a.cost/p.cost-1,n)} ${this._t("vs_prev")}</small
        >`:d,m=(he,ft,vt=d,bt="")=>l`<div class="fig"><b class=${bt}>${he}</b><span>${ft}</span>${vt}</div>`,g=a.fuel_l100!=null&&a.fuel_price!=null?l`<small
            >${this._t("petrol_ref",{l100:a.fuel_l100.toLocaleString(n,{maximumFractionDigits:1}),price:b(a.fuel_price,r,n)})}</small
          >`:d,S=a.savings==null?"\u2014":b(-a.savings,r,n);return l`<div class="card">
      <div class="label">${u}</div>
      <div class="figs">
        ${m(b(a.cost,r,n),this._t("cost"),h)}
        ${m(w(a.energy_kwh,n),this._t("sessions_n",{n:String(a.sessions)}))}
        ${m(a.off_peak_share==null?"\u2014":M(a.off_peak_share,n),this._t("off_peak_label"))}
        ${m(b(a.cost_per_100km,r,n),this._t("per_100km"),a.km==null?d:l`<small>${this._t("km_n",{km:Math.round(a.km).toLocaleString(n)})}</small>`)}
        ${m(S,this._t("vs_petrol"),g,a.savings!=null&&a.savings>0?"good":"")}
      </div>
    </div>`}_bars(){let e=this._stats.rows,s=ut(e,ee);return l`<div class="card">
      <div class="label">
        ${this._t("cost_by_month")} · <span class="off">■</span> ${this._t("off_peak_slice")}
        <span class="peak">■</span> ${this._t("peak_slice")}
      </div>
      <svg viewBox="0 0 100 ${ee}" preserveAspectRatio="none" class="bars" role="img">
        ${s.map(r=>P`<rect class="peak" x=${r.x} width=${r.w} y=${ee-r.hOff-r.hPeak} height=${r.hPeak}></rect>
            <rect class="off" x=${r.x} width=${r.w} y=${ee-r.hOff} height=${r.hOff}></rect>`)}
      </svg>
      <div class="months">${e.map(r=>l`<span>${this._monthName(r.month,"short")}</span>`)}</div>
    </div>`}_table(){let{rows:e,total:s,currency:r}=this._stats,n=v(this.hass),o=X(Date.now()/1e3,this.hass.config.time_zone),c=e.filter(h=>h.month<=o&&(h.sessions||h.km!=null)),a=h=>h.toLocaleString(n,{minimumFractionDigits:1,maximumFractionDigits:1}),p=(h,m,g="")=>l`<tr class=${g}>
      <td>${m}</td>
      <td>${h.sessions}</td>
      <td>${a(h.energy_kwh)}</td>
      <td><b>${b(h.cost,r,n)}</b></td>
      <td>${h.off_peak_share==null?"\u2014":M(h.off_peak_share,n)}</td>
      <td>
        ${h.km==null?"\u2014":Math.round(h.km).toLocaleString(n)}${h.km_partial?" *":""}
      </td>
      <td>${h.cost_per_100km==null?"\u2014":b(h.cost_per_100km,r,n)}</td>
      <td class=${h.savings!=null&&h.savings>0?"good":""}>
        ${h.savings==null?"\u2014":b(-h.savings,r,n)}
      </td>
    </tr>`;return l`<div class="scroll">
      <table>
        <thead>
          <tr>${["col_month","col_sessions","col_kwh","col_cost","col_hc","col_km","col_per_100","col_vs_petrol"].map(h=>l`<th>${this._t(h)}</th>`)}</tr>
        </thead>
        <tbody>
          ${c.reverse().map(h=>p(h,this._monthName(h.month)))}
          ${p(s,this._t("total_year",{year:String(this._year)}),"total")}
        </tbody>
      </table>
    </div>`}static{this.styles=[le,$`
      .bars {
        width: 100%;
        height: ${ee}px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      rect.off,
      span.off {
        fill: var(--info-color, #3b82f6);
        color: var(--info-color, #3b82f6);
      }
      rect.peak,
      span.peak {
        fill: var(--warning-color, #f59e0b);
        color: var(--warning-color, #f59e0b);
      }
      .months {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        text-align: center;
        font-size: 0.75em;
        color: var(--secondary-text-color);
      }
      tr.total {
        font-weight: 600;
      }
    `]}};customElements.define("charge-board-stats",Pe);var mt=30,Oe=300,He=80,Me=class extends f{constructor(){super(...arguments);this.version=0;this._soc=[];this._req=0}static{this.properties={hass:{attribute:!1},version:{type:Number},_overview:{state:!0},_card:{state:!0},_soc:{state:!0},_error:{state:!0},_vehicle:{state:!0}}}updated(e){["version","_vehicle"].some(s=>e.has(s))&&this.hass&&this._fetch()}async _fetch(){let e=++this._req;try{let s=await O(this.hass);if(e!==this._req||(this._overview=s,(!this._vehicle||!s.vehicles.some(o=>o.id===this._vehicle))&&(this._vehicle=s.vehicles[0]?.id,!this._vehicle)))return;let r=await rt(this.hass,this._vehicle);if(e!==this._req)return;this._card=r,this._error=void 0;let n=r.config.find(o=>o.key==="soc_entity")?.entity_id;if(n&&this._socFor!==r.id){let o=Date.now()/1e3;this._soc=await it(this.hass,n,o-mt*86400,o).catch(()=>[]),this._socFor=r.id}}catch(s){e===this._req&&(this._error=k(s))}}_t(e,s){return x(y(this.hass),e,s)}render(){return this._error&&!this._card?l`<p class="message">${this._t(this._error)}</p>`:this._overview&&!this._overview.vehicles.length?l`<p class="message">${this._t("no_vehicles")}</p>`:!this._card||!this._overview?l`<p class="message">${this._t("loading")}</p>`:l`
      <div class="filters">
        ${this._overview.vehicles.map(e=>l`<button
            class="chip"
            aria-pressed=${e.id===this._vehicle}
            @click=${()=>{e.id!==this._vehicle&&(this._vehicle=e.id,this._soc=[])}}
          >
            ${e.name}
          </button>`)}
      </div>
      ${this._card.cut_ignored&&this._card.target_source==="home"?l`<p class="error">${this._t("cut_ignored")}</p>`:d}
      ${this._figures()} ${this._chart()} ${this._table()} ${this._config()}
    `}_figures(){let e=this._card,s=v(this.hass),r=(o,c=0)=>o==null?"\u2014":o.toLocaleString(s,{maximumFractionDigits:c,minimumFractionDigits:c}),n=(o,c,a)=>l`<div class="fig"><b>${o}</b><span>${c}</span>${a?l`<small>${a}</small>`:d}</div>`;return l`<div class="card">
      <div class="figs">
        ${n(e.soc==null?"\u2014":`${r(e.soc)} %`,this._t("battery_now"),e.target==null?void 0:this._t("target_n",{n:r(e.target)}))}
        ${n(e.consumption_30d==null?"\u2014":`${r(e.consumption_30d,1)} kWh`,this._t("consumption_30d"))}
        ${n(e.odometer==null?"\u2014":`${r(e.odometer)} km`,this._t("odometer"))}
        ${n(e.autonomy_km==null?"\u2014":`\u2248 ${r(e.autonomy_km)} km`,this._t("autonomy"))}
      </div>
      ${e.consumption_since==null?d:l`<div class="note">${this._t("consumption_since",{value:r(e.consumption_since,1)})}</div>`}
    </div>`}_chart(){let e=Date.now()/1e3,s=e-mt*86400,r=this.hass.config.time_zone,n=v(this.hass),o=c=>(Math.max(c,s)-s)/(e-s)*Oe;return l`<div class="card">
      <div class="label">${this._t("battery_30d")} · <span class="band">▮</span> ${this._t("recharges")}</div>
      <svg viewBox="0 0 ${Oe} ${He}" preserveAspectRatio="none" class="line" role="img">
        ${this._card.sessions.map(c=>P`<rect class="band" x=${o(c.start)} y="0" height=${He}
            width=${Math.max(o(c.end??e)-o(c.start),1.5)}></rect>`)}
        <path d=${_t(this._soc,Oe,He,s,e)}></path>
      </svg>
      <div class="axis">
        <span>${H(s,n,r)}</span><span>${H(e,n,r)}</span>
      </div>
    </div>`}_table(){let e=this._card,s=v(this.hass),r=e.rows.filter(c=>c.sessions||c.km!=null).reverse();if(!r.length)return d;let n=c=>new Date(`${c}-15T12:00:00Z`).toLocaleString(s,{month:"long",year:"numeric",timeZone:"UTC"}),o=["col_month","col_km","col_kwh","col_kwh_100","col_per_100"];return l`<div class="card">
      <div class="label">${this._t("consumption_by_month")}</div>
      <div class="scroll flat">
        <table>
          <thead>
            <tr>${o.map(c=>l`<th>${this._t(c)}</th>`)}</tr>
          </thead>
          <tbody>
            ${r.map(c=>l`<tr>
                <td>${n(c.month)}</td>
                <td>
                  ${c.km==null?"\u2014":Math.round(c.km).toLocaleString(s)}${c.km_partial?" *":""}
                </td>
                <td>${w(c.energy_kwh,s)}</td>
                <td>${c.kwh_100km==null?"\u2014":c.kwh_100km.toLocaleString(s,{maximumFractionDigits:1})}</td>
                <td>${b(c.cost_per_100km,e.currency,s)}</td>
              </tr>`)}
          </tbody>
        </table>
      </div>
    </div>`}_config(){let e=this._card,s=v(this.hass),r=c=>l`<span class=${c.ok?"good":"bad"}>●</span> ${c.value==null?"\u2014":c.value.toLocaleString(s,{maximumFractionDigits:3})}`,n=(c,a,p)=>l`<tr>
      <td>${this._t(c)}</td>
      <td>
        ${a.entity_id??(a.key==="target"||a.key==="fuel_price"?this._t("fixed_value"):"\u2014")}
        ${r(a)}${p?l` <small>${p}</small>`:d}</td>
    </tr>`,o=c=>e.config.find(a=>a.key===c);return l`<div class="card">
      <div class="head">
        <span class="label">${this._t("configuration")}</span>
        <a href="/config/integrations/integration/charge_board">${this._t("edit")} ↗</a>
      </div>
      <table class="cfg">
        <tbody>
          <tr>
            <td>${this._t("cfg_capacity")}</td>
            <td>${e.capacity_kwh==null?"\u2014":`${e.capacity_kwh.toLocaleString(s)} kWh`}</td>
          </tr>
          ${n("cfg_soc_entity",o("soc_entity"))}
          ${n("cfg_target",o("target"),this._t(e.target_source==="home"?"target_home":"target_vehicle"))}
          ${n("cfg_odometer_entity",o("odometer_entity"))} ${n("cfg_fuel_price",o("fuel_price"))}
          <tr>
            <td>${this._t("cfg_fuel_l100")}</td>
            <td>${e.fuel_l100==null?"\u2014":`${e.fuel_l100.toLocaleString(s)} L/100 km`}</td>
          </tr>
        </tbody>
      </table>
    </div>`}static{this.styles=[le,$`
      .line {
        width: 100%;
        height: 90px;
      }
      .line path {
        fill: none;
        stroke: var(--info-color, #3b82f6);
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
      }
      rect.band {
        fill: var(--success-color, #22c55e);
        opacity: 0.25;
      }
      span.band {
        color: var(--success-color, #22c55e);
      }
      .axis,
      .head {
        display: flex;
        justify-content: space-between;
      }
      .axis {
        font-size: 0.75em;
        color: var(--secondary-text-color);
      }
      .head a {
        color: var(--primary-color);
        text-decoration: none;
      }
      .flat {
        border: none;
        margin: 0;
      }
      table.cfg td:first-child {
        color: var(--secondary-text-color);
      }
      table.cfg tr {
        border: none;
      }
    `]}};customElements.define("charge-board-vehicles",Me);var Nt="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",gt={overview:"tab_overview",sessions:"tab_sessions",vehicles:"tab_vehicles",stats:"tab_stats"},De=class extends f{constructor(){super(...arguments);this.narrow=!1;this._tab="overview";this._version=0}static{this.properties={hass:{attribute:!1},narrow:{type:Boolean},route:{attribute:!1},panel:{attribute:!1},_tab:{state:!0},_version:{state:!0}}}connectedCallback(){super.connectedCallback(),this._subscribe()}disconnectedCallback(){super.disconnectedCallback(),this._unsub?.then(e=>e()).catch(()=>{}),this._unsub=void 0}updated(e){e.has("hass")&&this._subscribe()}_subscribe(){if(!this.hass||this._unsub)return;let e=nt(this.hass,()=>this._version++);this._unsub=e,e.then(()=>this._version++).catch(()=>{this._unsub===e&&(this._unsub=void 0)})}_t(e){return x(y(this.hass),e)}_toggleMenu(){this.dispatchEvent(new CustomEvent("hass-toggle-menu",{bubbles:!0,composed:!0}))}render(){return this.hass?l`
      <header>
        <div class="toolbar">
          ${this.narrow?l`<button class="menu" aria-label=${this._t("menu")} @click=${this._toggleMenu}>
                <svg viewBox="0 0 24 24"><path d=${Nt}></path></svg>
              </button>`:l``}
          <div class="title">${this._t("title")}</div>
        </div>
        <nav role="tablist">
          ${Object.keys(gt).map(e=>l`<button
              role="tab"
              aria-selected=${this._tab===e}
              @click=${()=>this._tab=e}
            >
              ${this._t(gt[e])}
            </button>`)}
        </nav>
      </header>
      <main>
        ${this._content()}
      </main>
    `:l``}_content(){let e={hass:this.hass,version:this._version};switch(this._tab){case"sessions":return l`<charge-board-sessions .hass=${e.hass} .version=${e.version}></charge-board-sessions>`;case"vehicles":return l`<charge-board-vehicles .hass=${e.hass} .version=${e.version}></charge-board-vehicles>`;case"stats":return l`<charge-board-stats .hass=${e.hass} .version=${e.version}></charge-board-stats>`;default:return l`<charge-board-overview .hass=${e.hass} .version=${e.version}></charge-board-overview>`}}static{this.styles=$`
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
      overflow-x: auto;
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
  `}};customElements.define("charge-board-panel",De);
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
