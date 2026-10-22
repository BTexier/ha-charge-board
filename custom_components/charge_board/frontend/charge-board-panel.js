var U=globalThis,N=U.ShadowRoot&&(U.ShadyCSS===void 0||U.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,V=Symbol(),ae=new WeakMap,S=class{constructor(e,t,s){if(this._$cssResult$=!0,s!==V)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(N&&e===void 0){let s=t!==void 0&&t.length===1;s&&(e=ae.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&ae.set(t,e))}return e}toString(){return this.cssText}},le=r=>new S(typeof r=="string"?r:r+"",void 0,V),C=(r,...e)=>{let t=r.length===1?r[0]:e.reduce((s,i,n)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+r[n+1],r[0]);return new S(t,r,V)},ce=(r,e)=>{if(N)r.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let s=document.createElement("style"),i=U.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=t.cssText,r.appendChild(s)}},I=N?r=>r:r=>r instanceof CSSStyleSheet?(e=>{let t="";for(let s of e.cssRules)t+=s.cssText;return le(t)})(r):r;var{is:Ue,defineProperty:Ne,getOwnPropertyDescriptor:Le,getOwnPropertyNames:De,getOwnPropertySymbols:ze,getPrototypeOf:je}=Object,L=globalThis,he=L.trustedTypes,Be=he?he.emptyScript:"",Ve=L.reactiveElementPolyfillSupport,E=(r,e)=>r,W={toAttribute(r,e){switch(e){case Boolean:r=r?Be:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,e){let t=r;switch(e){case Boolean:t=r!==null;break;case Number:t=r===null?null:Number(r);break;case Object:case Array:try{t=JSON.parse(r)}catch{t=null}}return t}},pe=(r,e)=>!Ue(r,e),de={attribute:!0,type:String,converter:W,reflect:!1,useDefault:!1,hasChanged:pe};Symbol.metadata??=Symbol("metadata"),L.litPropertyMetadata??=new WeakMap;var _=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=de){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let s=Symbol(),i=this.getPropertyDescriptor(e,s,t);i!==void 0&&Ne(this.prototype,e,i)}}static getPropertyDescriptor(e,t,s){let{get:i,set:n}=Le(this.prototype,e)??{get(){return this[t]},set(o){this[t]=o}};return{get:i,set(o){let d=i?.call(this);n?.call(this,o),this.requestUpdate(e,d,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??de}static _$Ei(){if(this.hasOwnProperty(E("elementProperties")))return;let e=je(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(E("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(E("properties"))){let t=this.properties,s=[...De(t),...ze(t)];for(let i of s)this.createProperty(i,t[i])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[s,i]of t)this.elementProperties.set(s,i)}this._$Eh=new Map;for(let[t,s]of this.elementProperties){let i=this._$Eu(t,s);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let s=new Set(e.flat(1/0).reverse());for(let i of s)t.unshift(I(i))}else e!==void 0&&t.push(I(e));return t}static _$Eu(e,t){let s=t.attribute;return s===!1?void 0:typeof s=="string"?s:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let s of t.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ce(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,s){this._$AK(e,s)}_$ET(e,t){let s=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,s);if(i!==void 0&&s.reflect===!0){let n=(s.converter?.toAttribute!==void 0?s.converter:W).toAttribute(t,s.type);this._$Em=e,n==null?this.removeAttribute(i):this.setAttribute(i,n),this._$Em=null}}_$AK(e,t){let s=this.constructor,i=s._$Eh.get(e);if(i!==void 0&&this._$Em!==i){let n=s.getPropertyOptions(i),o=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:W;this._$Em=i;let d=o.fromAttribute(t,n.type);this[i]=d??this._$Ej?.get(i)??d,this._$Em=null}}requestUpdate(e,t,s,i=!1,n){if(e!==void 0){let o=this.constructor;if(i===!1&&(n=this[e]),s??=o.getPropertyOptions(e),!((s.hasChanged??pe)(n,t)||s.useDefault&&s.reflect&&n===this._$Ej?.get(e)&&!this.hasAttribute(o._$Eu(e,s))))return;this.C(e,t,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:s,reflect:i,wrapped:n},o){s&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,o??t??this[e]),n!==!0||o!==void 0)||(this._$AL.has(e)||(this.hasUpdated||s||(t=void 0),this._$AL.set(e,t)),i===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,n]of this._$Ep)this[i]=n;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[i,n]of s){let{wrapped:o}=n,d=this[i];o!==!0||this._$AL.has(i)||d===void 0||this.C(i,void 0,n,d)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(t)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};_.elementStyles=[],_.shadowRootOptions={mode:"open"},_[E("elementProperties")]=new Map,_[E("finalized")]=new Map,Ve?.({ReactiveElement:_}),(L.reactiveElementVersions??=[]).push("2.1.2");var X=globalThis,ue=r=>r,D=X.trustedTypes,ge=D?D.createPolicy("lit-html",{createHTML:r=>r}):void 0,be="$lit$",v=`lit$${Math.random().toFixed(9).slice(2)}$`,ye="?"+v,Ie=`<${ye}>`,y=document,P=()=>y.createComment(""),H=r=>r===null||typeof r!="object"&&typeof r!="function",Y=Array.isArray,We=r=>Y(r)||typeof r?.[Symbol.iterator]=="function",F=`[ 	
\f\r]`,k=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,me=/-->/g,_e=/>/g,$=RegExp(`>|${F}(?:([^\\s"'>=/]+)(${F}*=${F}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),fe=/'/g,ve=/"/g,xe=/^(?:script|style|textarea|title)$/i,Z=r=>(e,...t)=>({_$litType$:r,strings:e,values:t}),c=Z(1),it=Z(2),rt=Z(3),x=Symbol.for("lit-noChange"),h=Symbol.for("lit-nothing"),$e=new WeakMap,b=y.createTreeWalker(y,129);function Ae(r,e){if(!Y(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return ge!==void 0?ge.createHTML(e):e}var Fe=(r,e)=>{let t=r.length-1,s=[],i,n=e===2?"<svg>":e===3?"<math>":"",o=k;for(let d=0;d<t;d++){let a=r[d],p,u,l=-1,m=0;for(;m<a.length&&(o.lastIndex=m,u=o.exec(a),u!==null);)m=o.lastIndex,o===k?u[1]==="!--"?o=me:u[1]!==void 0?o=_e:u[2]!==void 0?(xe.test(u[2])&&(i=RegExp("</"+u[2],"g")),o=$):u[3]!==void 0&&(o=$):o===$?u[0]===">"?(o=i??k,l=-1):u[1]===void 0?l=-2:(l=o.lastIndex-u[2].length,p=u[1],o=u[3]===void 0?$:u[3]==='"'?ve:fe):o===ve||o===fe?o=$:o===me||o===_e?o=k:(o=$,i=void 0);let f=o===$&&r[d+1].startsWith("/>")?" ":"";n+=o===k?a+Ie:l>=0?(s.push(p),a.slice(0,l)+be+a.slice(l)+v+f):a+v+(l===-2?d:f)}return[Ae(r,n+(r[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),s]},O=class r{constructor({strings:e,_$litType$:t},s){let i;this.parts=[];let n=0,o=0,d=e.length-1,a=this.parts,[p,u]=Fe(e,t);if(this.el=r.createElement(p,s),b.currentNode=this.el.content,t===2||t===3){let l=this.el.content.firstChild;l.replaceWith(...l.childNodes)}for(;(i=b.nextNode())!==null&&a.length<d;){if(i.nodeType===1){if(i.hasAttributes())for(let l of i.getAttributeNames())if(l.endsWith(be)){let m=u[o++],f=i.getAttribute(l).split(v),R=/([.?@])?(.*)/.exec(m);a.push({type:1,index:n,name:R[2],strings:f,ctor:R[1]==="."?q:R[1]==="?"?J:R[1]==="@"?G:w}),i.removeAttribute(l)}else l.startsWith(v)&&(a.push({type:6,index:n}),i.removeAttribute(l));if(xe.test(i.tagName)){let l=i.textContent.split(v),m=l.length-1;if(m>0){i.textContent=D?D.emptyScript:"";for(let f=0;f<m;f++)i.append(l[f],P()),b.nextNode(),a.push({type:2,index:++n});i.append(l[m],P())}}}else if(i.nodeType===8)if(i.data===ye)a.push({type:2,index:n});else{let l=-1;for(;(l=i.data.indexOf(v,l+1))!==-1;)a.push({type:7,index:n}),l+=v.length-1}n++}}static createElement(e,t){let s=y.createElement("template");return s.innerHTML=e,s}};function A(r,e,t=r,s){if(e===x)return e;let i=s!==void 0?t._$Co?.[s]:t._$Cl,n=H(e)?void 0:e._$litDirective$;return i?.constructor!==n&&(i?._$AO?.(!1),n===void 0?i=void 0:(i=new n(r),i._$AT(r,t,s)),s!==void 0?(t._$Co??=[])[s]=i:t._$Cl=i),i!==void 0&&(e=A(r,i._$AS(r,e.values),i,s)),e}var K=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:s}=this._$AD,i=(e?.creationScope??y).importNode(t,!0);b.currentNode=i;let n=b.nextNode(),o=0,d=0,a=s[0];for(;a!==void 0;){if(o===a.index){let p;a.type===2?p=new M(n,n.nextSibling,this,e):a.type===1?p=new a.ctor(n,a.name,a.strings,this,e):a.type===6&&(p=new Q(n,this,e)),this._$AV.push(p),a=s[++d]}o!==a?.index&&(n=b.nextNode(),o++)}return b.currentNode=y,i}p(e){let t=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(e,s,t),t+=s.strings.length-2):s._$AI(e[t])),t++}},M=class r{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,s,i){this.type=2,this._$AH=h,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=A(this,e,t),H(e)?e===h||e==null||e===""?(this._$AH!==h&&this._$AR(),this._$AH=h):e!==this._$AH&&e!==x&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):We(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==h&&H(this._$AH)?this._$AA.nextSibling.data=e:this.T(y.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:s}=e,i=typeof s=="number"?this._$AC(e):(s.el===void 0&&(s.el=O.createElement(Ae(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(t);else{let n=new K(i,this),o=n.u(this.options);n.p(t),this.T(o),this._$AH=n}}_$AC(e){let t=$e.get(e.strings);return t===void 0&&$e.set(e.strings,t=new O(e)),t}k(e){Y(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,s,i=0;for(let n of e)i===t.length?t.push(s=new r(this.O(P()),this.O(P()),this,this.options)):s=t[i],s._$AI(n),i++;i<t.length&&(this._$AR(s&&s._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let s=ue(e).nextSibling;ue(e).remove(),e=s}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},w=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,s,i,n){this.type=1,this._$AH=h,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=n,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=h}_$AI(e,t=this,s,i){let n=this.strings,o=!1;if(n===void 0)e=A(this,e,t,0),o=!H(e)||e!==this._$AH&&e!==x,o&&(this._$AH=e);else{let d=e,a,p;for(e=n[0],a=0;a<n.length-1;a++)p=A(this,d[s+a],t,a),p===x&&(p=this._$AH[a]),o||=!H(p)||p!==this._$AH[a],p===h?e=h:e!==h&&(e+=(p??"")+n[a+1]),this._$AH[a]=p}o&&!i&&this.j(e)}j(e){e===h?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},q=class extends w{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===h?void 0:e}},J=class extends w{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==h)}},G=class extends w{constructor(e,t,s,i,n){super(e,t,s,i,n),this.type=5}_$AI(e,t=this){if((e=A(this,e,t,0)??h)===x)return;let s=this._$AH,i=e===h&&s!==h||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,n=e!==h&&(s===h||i);i&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},Q=class{constructor(e,t,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){A(this,e)}};var Ke=X.litHtmlPolyfillSupport;Ke?.(O,M),(X.litHtmlVersions??=[]).push("3.3.3");var we=(r,e,t)=>{let s=t?.renderBefore??e,i=s._$litPart$;if(i===void 0){let n=t?.renderBefore??null;s._$litPart$=i=new M(e.insertBefore(P(),n),n,void 0,t??{})}return i._$AI(r),i};var ee=globalThis,g=class extends _{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=we(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return x}};g._$litElement$=!0,g.finalized=!0,ee.litElementHydrateSupport?.({LitElement:g});var qe=ee.litElementPolyfillSupport;qe?.({LitElement:g});(ee.litElementVersions??=[]).push("4.2.2");var Je=(r,e,t={})=>r.connection.sendMessagePromise({type:`charge_board/${e}`,...t}),Se=r=>Je(r,"overview");var Ce=(r,e)=>r.connection.subscribeMessage(e,{type:"charge_board/subscribe"});var Ge={title:"Recharge",tab_overview:"Aper\xE7u",tab_sessions:"Sessions",loading:"Chargement\u2026",error:"Impossible de charger les donn\xE9es",not_loaded:"Charge Board n'est pas charg\xE9",no_chargers:"Aucun chargeur configur\xE9. Ajoutez-en un dans les param\xE8tres de l'int\xE9gration Charge Board.",sessions_soon:"\u2026",charging:"En charge",plugged:"Branch\xE9",free:"Libre",power:"puissance",session:"session",cost:"co\xFBt",end:"fin estim\xE9e",end_short:"fin {time}",plugged_since:"Branch\xE9e depuis {time}",charging_since:"en charge depuis {time}",charge_started:"d\xE9but de charge {time}",off_peak:"{share} heures creuses",last_session:"Derni\xE8re session : {summary}",no_session:"Aucune session enregistr\xE9e",no_vehicle:"aucun v\xE9hicule",menu:"Menu",close:"Fermer"},Qe={title:"Charging",tab_overview:"Overview",tab_sessions:"Sessions",loading:"Loading\u2026",error:"Could not load the data",not_loaded:"Charge Board is not loaded",no_chargers:"No charger configured. Add one in the Charge Board integration settings.",sessions_soon:"\u2026",charging:"Charging",plugged:"Plugged in",free:"Free",power:"power",session:"session",cost:"cost",end:"estimated end",end_short:"end {time}",plugged_since:"Plugged in since {time}",charging_since:"charging since {time}",charge_started:"charge started {time}",off_peak:"{share} off-peak",last_session:"Last session: {summary}",no_session:"No session recorded",no_vehicle:"no vehicle",menu:"Menu",close:"Close"},Xe={fr:Ge,en:Qe},z=r=>r.language?.startsWith("fr")?"fr":"en",Ee=r=>r.locale?.language??r.language??"en";function j(r,e,t={}){return Xe[r][e].replace(/\{(\w+)\}/g,(s,i)=>t[i]??"")}var te=r=>r.replace(/[  ]/g," "),ke=(r,e,t)=>te(r.toLocaleString(e,{minimumFractionDigits:t,maximumFractionDigits:t}));function se(r,e){return r==null?"\u2014":`${ke(r,e,1)} kWh`}function ie(r,e){return r==null?"\u2014":`${ke(r/1e3,e,1)} kW`}function Pe(r,e,t){return r==null?"\u2014":te(new Intl.NumberFormat(t,{style:"currency",currency:e}).format(r))}function He(r,e){if(r==null&&e==null)return"\u2014";let t=s=>s==null?"\u2014":String(Math.round(s));return`${t(r)} \u2192 ${t(e)} %`}function Oe(r,e){return te(r.toLocaleString(e,{style:"percent",maximumFractionDigits:0}))}var Me=(r,e,t,s)=>new Intl.DateTimeFormat(e,{timeZone:t,...s}).format(new Date(r*1e3));function re(r,e,t){return Me(r,e,t,{hour:"2-digit",minute:"2-digit"})}function B(r,e,t){return Me(r,e,t,{day:"2-digit",month:"2-digit"})}function Te(r,e,t,s=Date.now()/1e3){let i=re(r,e,t),n=B(r,e,t);return n===B(s,e,t)?i:`${n} ${i}`}var Re={charging:"var(--success-color, #43a047)",plugged:"var(--info-color, #039be5)",free:"var(--disabled-text-color, #9e9e9e)"},ne=class extends g{constructor(){super(...arguments);this.version=0}static{this.properties={hass:{attribute:!1},version:{type:Number},_data:{state:!0},_error:{state:!0},_open:{state:!0}}}updated(t){t.has("version")&&this.hass&&this._fetch(),t.has("_open")&&this._open&&this.renderRoot.querySelector("dialog")?.showModal()}async _fetch(){try{this._data=await Se(this.hass),this._error=void 0}catch(t){this._error=t.code==="not_loaded"?"not_loaded":"error"}}_t(t,s){return j(z(this.hass),t,s)}render(){if(this._error)return c`<p class="message">${this._t(this._error)}</p>`;if(!this._data)return c`<p class="message">${this._t("loading")}</p>`;let{chargers:t,style:s}=this._data;if(!t.length)return c`<p class="message">${this._t("no_chargers")}</p>`;if(s!=="compact")return c`<div class="grid">${t.map(n=>this._card(n))}</div>`;let i=t.find(n=>n.id===this._open);return c`
      <div class="grid compact">${t.map(n=>this._tile(n))}</div>
      ${i?c`<dialog @close=${()=>this._open=void 0} @click=${this._backdropClose}>
            <div class="dialog-bar">
              <button aria-label=${this._t("close")} @click=${this._close}>×</button>
            </div>
            ${this._card(i)}
          </dialog>`:h}
    `}_backdropClose(t){t.target===t.currentTarget&&this._close()}_close(){this.renderRoot.querySelector("dialog")?.close()}get _fmt(){let t=Ee(this.hass),s=this.hass.config.time_zone;return{locale:t,when:i=>Te(i,t,s),time:i=>re(i,t,s),day:i=>B(i,t,s),cost:i=>Pe(i,this._data.currency,t)}}_stateLabel(t){return this._t(t.state)}_idle(t){return t.state==="free"&&!t.session}_card(t){let s=this._fmt,i=t.session,n=t.vehicle?.soc??null,o=i?[i.plugged_at!=null?this._t("plugged_since",{time:s.when(i.plugged_at)}):null,i.charge_start!=null?this._t(t.state==="charging"?"charging_since":"charge_started",{time:s.when(i.charge_start)}):null,i.has_off_peak_source&&i.energy_kwh>0?this._t("off_peak",{share:Oe(i.off_peak.kwh/i.energy_kwh,s.locale)}):null].filter(Boolean):[];return c`
      <ha-card class="card" style="--state:${Re[t.state]}">
        <div class="head">
          <span class="name"><ha-icon icon="mdi:ev-station"></ha-icon>${t.name}</span>
          <span class="state">${this._stateLabel(t)}</span>
        </div>
        ${this._idle(t)?c`<div class="muted">${this._lastSession(t)}</div>`:c`
              <div class="vehicle">
                <ha-icon icon="mdi:car-electric"></ha-icon>
                <b>${t.vehicle?.name??"\u2014"}</b> ·
                ${n==null?"\u2014":He(n,t.vehicle?.target)}
              </div>
              ${n==null?h:c`<div class="bar"><div style="width:${Math.min(100,Math.max(0,n))}%"></div></div>`}
              <div class="stats">
                ${this._stat(ie(t.power_w,s.locale),"power")}
                ${this._stat(se(i?.energy_kwh,s.locale),"session")}
                ${this._stat(s.cost(i?.cost),"cost")}
                ${t.estimated_end==null?h:this._stat(s.time(t.estimated_end),"end")}
              </div>
              ${o.length?c`<div class="muted">${o.join(" \xB7 ")}</div>`:h}
            `}
      </ha-card>
    `}_stat(t,s){return c`<div><div class="value">${t}</div><div class="muted">${this._t(s)}</div></div>`}_lastSession(t){let s=t.last_session;if(!s)return this._t("no_session");let i=this._fmt,n=s.charge_start??s.plugged_at,o=[s.vehicle_name??"\u2014",n!=null?i.day(n):null,se(s.energy_kwh,i.locale),i.cost(s.cost)].filter(Boolean);return this._t("last_session",{summary:o.join(" \xB7 ")})}_tile(t){let s=this._fmt,i=this._idle(t)?null:t.vehicle?.soc??null,n=i==null?"0":String(Math.min(100,Math.max(0,i))),o=this._idle(t)?this._t("free").toLowerCase():i==null?"\u2014":`${Math.round(i)} %`,d=[ie(t.power_w,s.locale),s.cost(t.session?.cost),t.estimated_end==null?null:this._t("end_short",{time:s.time(t.estimated_end)})].filter(Boolean);return c`
      <ha-card class="tile" style="--state:${Re[t.state]}">
        <button @click=${()=>this._open=t.id}>
          <div class="gauge" style="--soc:${n}%"><span>${o}</span></div>
          <b>${t.name}</b>
          ${this._idle(t)?c`<div class="muted">${this._t("no_vehicle")}</div>`:c`
                <div>${t.vehicle?.name??"\u2014"} · ${this._stateLabel(t).toLowerCase()}</div>
                <div class="muted">${d.join(" \xB7 ")}</div>
              `}
        </button>
      </ha-card>
    `}static{this.styles=C`
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
  `}};customElements.define("charge-board-overview",ne);var Ye="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",oe=class extends g{constructor(){super(...arguments);this.narrow=!1;this._tab="overview";this._version=0}static{this.properties={hass:{attribute:!1},narrow:{type:Boolean},route:{attribute:!1},panel:{attribute:!1},_tab:{state:!0},_version:{state:!0}}}connectedCallback(){super.connectedCallback(),this._subscribe()}disconnectedCallback(){super.disconnectedCallback(),this._unsub?.then(t=>t()).catch(()=>{}),this._unsub=void 0}updated(t){t.has("hass")&&this._subscribe()}_subscribe(){!this.hass||this._unsub||(this._unsub=Ce(this.hass,()=>this._version++),this._unsub.catch(()=>{}))}_t(t){return j(z(this.hass),t)}_toggleMenu(){this.dispatchEvent(new CustomEvent("hass-toggle-menu",{bubbles:!0,composed:!0}))}render(){if(!this.hass)return c``;let t=["overview","sessions"];return c`
      <header>
        <div class="toolbar">
          ${this.narrow?c`<button class="menu" aria-label=${this._t("menu")} @click=${this._toggleMenu}>
                <svg viewBox="0 0 24 24"><path d=${Ye}></path></svg>
              </button>`:c``}
          <div class="title">${this._t("title")}</div>
        </div>
        <nav role="tablist">
          ${t.map(s=>c`<button
              role="tab"
              aria-selected=${this._tab===s}
              @click=${()=>this._tab=s}
            >
              ${this._t(s==="overview"?"tab_overview":"tab_sessions")}
            </button>`)}
        </nav>
      </header>
      <main>
        ${this._tab==="overview"?c`<charge-board-overview .hass=${this.hass} .version=${this._version}></charge-board-overview>`:c`<p class="placeholder">${this._t("sessions_soon")}</p>`}
      </main>
    `}static{this.styles=C`
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
    .placeholder {
      text-align: center;
      color: var(--secondary-text-color);
    }
  `}};customElements.define("charge-board-panel",oe);
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
