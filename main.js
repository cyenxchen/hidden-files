"use strict";var y=Object.defineProperty;var S=Object.getOwnPropertyDescriptor;var N=Object.getOwnPropertyNames;var H=Object.prototype.hasOwnProperty;var P=(i,t)=>{for(var n in t)y(i,n,{get:t[n],enumerable:!0})},T=(i,t,n,e)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of N(t))!H.call(i,s)&&s!==n&&y(i,s,{get:()=>t[s],enumerable:!(e=S(t,s))||e.enumerable});return i};var A=i=>T(y({},"__esModule",{value:!0}),i);var D={};P(D,{default:()=>m});module.exports=A(D);var E=require("obsidian");var u={enabled:!0,hiddenNames:[]};function p(i){return{enabled:i.enabled,hiddenNames:[...i.hiddenNames]}}function v(i){if(!i||typeof i!="object")return p(u);let t=i,n=typeof t.enabled=="boolean"?t.enabled:u.enabled,e=Array.isArray(t.hiddenNames)?t.hiddenNames:[],s=[],r=new Set;for(let o of e){if(typeof o!="string")continue;let a=o.trim();a&&(r.has(a)||(r.add(a),s.push(a)))}return{enabled:n,hiddenNames:s}}function x(i,t){let n=Object.keys(t).map(e=>k(i,e,t[e]));return n.length===1?n[0]:function(){n.forEach(e=>e())}}function k(i,t,n){let e=i[t],s=i.hasOwnProperty(t),r=n(e);return e&&Object.setPrototypeOf(r,e),Object.setPrototypeOf(o,r),i[t]=o,a;function o(...l){return r===e&&i[t]===o&&a(),r.apply(this,l)}function a(){i[t]===o&&(s?i[t]=e:delete i[t]),r!==e&&(r=e,Object.setPrototypeOf(o,e||Function))}}function F(i){return i.name}function C(i){return i instanceof TFolder?i.parent===null:!1}function w(i){let t=new Set,n="";function e(){let r=i(),o=`${r.enabled}|${r.hiddenNames.join(`
`)}`;o!==n&&(t=new Set(r.hiddenNames),n=o)}function s(r){if(e(),!i().enabled)return!1;let a=F(r);return t.has(a)}return{shouldHide:s}}function O(i,t){let{shouldHide:n}=w(t);try{let e=i.workspace.getLeavesOfType("file-explorer")[0];if(!e)return console.warn("[Hide Files] File Explorer not found"),null;let s=e.view;return x(Object.getPrototypeOf(s),{getSortedFolderItems(o){return function(a){return o.call(this,a).filter(d=>!n(d.file))}},onFileOpen(o){return function(a){if(!(a&&n(a)))return o.call(this,a)}},revealInFolder(o){return function(a){if(!n(a))return o.call(this,a)}}})}catch(e){return console.error("[Hide Files] Failed to patch File Explorer:",e),null}}function R(i,t,n){let{shouldHide:e}=w(t),s=i.workspace.on("file-menu",(r,o,a)=>{if(a!=="file-explorer"||C(o))return;let l=F(o),d=e(o);r.addItem(f=>{f.setTitle(d?"Already hidden":"Hide this file").setIcon("eye-off").setDisabled(d).onClick(async()=>{d||await n(l)})})});return()=>{i.workspace.offref(s)}}async function b(i,t,n){let e=[],s=null;i.workspace.layoutReady||await new Promise(l=>{let d=i.workspace.on("layout-ready",()=>{i.workspace.offref(d),l()})});let r=()=>{if(s)return!0;if(i.workspace.getLeavesOfType("file-explorer").length===0)return!1;let l=O(i,t);return l?(s=l,e.push(l),c(i),!0):!1};if(!r()){let l=null,d=()=>{l&&(i.workspace.offref(l),l=null)};l=i.workspace.on("layout-change",()=>{r()&&d()}),e.push(d)}async function o(l){let d=t(),f=l.trim();d.hiddenNames.includes(f)||(d.hiddenNames=[...d.hiddenNames,f],await n(),c(i))}let a=R(i,t,o);return e.push(a),{refresh(){c(i)},dispose(){for(;e.length>0;){let l=e.pop();l==null||l()}}}}function c(i){try{let t=i.workspace.getLeavesOfType("file-explorer")[0];if(!t)return;let n=t.view;typeof n.requestSort=="function"&&n.requestSort()}catch(t){console.error("[Hide Files] Failed to refresh File Explorer:",t)}}var h=require("obsidian");var g=class extends h.PluginSettingTab{constructor(t,n){super(t,n),this.plugin=n}display(){let{containerEl:t}=this;t.empty(),t.createEl("h2",{text:"Hide Specified Files"}),new h.Setting(t).setName("Enable file hiding").setDesc("Toggle file hiding on/off").addToggle(s=>s.setValue(this.plugin.settings.enabled).onChange(async r=>{this.plugin.settings.enabled=r,await this.plugin.saveSettings(),c(this.app)}));let n=new h.Setting(t).setName("Add file or folder name to hide").setDesc("Enter the exact name (for files: include extension)"),e;if(n.addText(s=>{e=s.inputEl,s.setPlaceholder("e.g., README.md, drafts, .obsidian").onChange(()=>{e.removeClass("hide-files-error")})}),n.addButton(s=>s.setButtonText("Add").setCta().onClick(async()=>{let r=e.value.trim();if(!r){e.addClass("hide-files-error");return}if(this.plugin.settings.hiddenNames.includes(r)){e.addClass("hide-files-error"),e.value="",e.placeholder="Already in the list!",setTimeout(()=>{e.placeholder="e.g., README.md, drafts, .obsidian"},2e3);return}this.plugin.settings.hiddenNames=[...this.plugin.settings.hiddenNames,r],await this.plugin.saveSettings(),c(this.app),e.value="",this.display()})),this.plugin.settings.hiddenNames.length>0){t.createEl("h3",{text:"Currently hidden:"});let s=t.createDiv("hide-files-list");for(let r of this.plugin.settings.hiddenNames){let o=s.createDiv("hide-files-item");o.createSpan({text:r,cls:"hide-files-name"}),o.createEl("button",{text:"Delete",cls:"hide-files-delete"}).addEventListener("click",async()=>{this.plugin.settings.hiddenNames=this.plugin.settings.hiddenNames.filter(l=>l!==r),await this.plugin.saveSettings(),c(this.app),this.display()})}}else t.createEl("p",{text:"No files or folders are currently hidden.",cls:"hide-files-empty"});this.addStyles()}addStyles(){if(document.getElementById("hide-files-styles"))return;let t=document.createElement("style");t.id="hide-files-styles",t.textContent=`
      .hide-files-error {
        border-color: var(--color-red) !important;
      }

      .hide-files-list {
        margin-top: 10px;
      }

      .hide-files-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        margin-bottom: 6px;
        background-color: var(--background-secondary);
        border-radius: 4px;
      }

      .hide-files-name {
        font-family: var(--font-monospace);
        font-size: 0.9em;
      }

      .hide-files-delete {
        padding: 4px 12px;
        font-size: 0.85em;
        cursor: pointer;
        border: 1px solid var(--background-modifier-border);
        border-radius: 3px;
        background-color: var(--interactive-normal);
        color: var(--text-normal);
      }

      .hide-files-delete:hover {
        background-color: var(--interactive-hover);
      }

      .hide-files-empty {
        color: var(--text-muted);
        font-style: italic;
        margin-top: 10px;
      }
    `,document.head.appendChild(t)}};var m=class extends E.Plugin{constructor(){super(...arguments);this.settings=p(u);this.hideFilesHandle=null}async onload(){console.log("[Hide Files] Loading plugin...");try{await this.loadSettings(),this.hideFilesHandle=await b(this.app,()=>this.settings,()=>this.saveSettings()),this.addSettingTab(new g(this.app,this)),this.addCommand({id:"refresh-file-explorer",name:"Refresh File Explorer",callback:()=>{var n;(n=this.hideFilesHandle)==null||n.refresh()}}),this.addCommand({id:"toggle-hide-files",name:"Toggle file hiding on/off",callback:async()=>{await this.setEnabled(!this.settings.enabled)}}),console.log("[Hide Files] Plugin loaded successfully")}catch(n){console.error("[Hide Files] Failed to load plugin:",n)}}async onunload(){var n;console.log("[Hide Files] Unloading plugin...");try{(n=this.hideFilesHandle)==null||n.dispose(),this.hideFilesHandle=null;let e=document.getElementById("hide-files-styles");e==null||e.remove(),console.log("[Hide Files] Plugin unloaded successfully")}catch(e){console.error("[Hide Files] Failed to unload plugin:",e)}}async loadSettings(){try{let n=await this.loadData();this.settings=v(n)}catch(n){console.error("[Hide Files] Failed to load settings:",n),this.settings=p(u)}}async saveSettings(){try{await this.saveData(this.settings)}catch(n){console.error("[Hide Files] Failed to save settings:",n)}}async addHiddenName(n){var s;let e=n.trim();e&&(this.settings.hiddenNames.includes(e)||(this.settings.hiddenNames=[...this.settings.hiddenNames,e],await this.saveSettings(),(s=this.hideFilesHandle)==null||s.refresh()))}async removeHiddenName(n){var e;this.settings.hiddenNames=this.settings.hiddenNames.filter(s=>s!==n),await this.saveSettings(),(e=this.hideFilesHandle)==null||e.refresh()}async setEnabled(n){var e;this.settings.enabled=n,await this.saveSettings(),(e=this.hideFilesHandle)==null||e.refresh()}};
