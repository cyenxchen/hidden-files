"use strict";var v=Object.defineProperty;var H=Object.getOwnPropertyDescriptor;var N=Object.getOwnPropertyNames;var P=Object.prototype.hasOwnProperty;var T=(n,t)=>{for(var i in t)v(n,i,{get:t[i],enumerable:!0})},A=(n,t,i,e)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of N(t))!P.call(n,s)&&s!==i&&v(n,s,{get:()=>t[s],enumerable:!(e=H(t,s))||e.enumerable});return n};var k=n=>A(v({},"__esModule",{value:!0}),n);var D={};T(D,{default:()=>m});module.exports=k(D);var S=require("obsidian");var u={enabled:!0,hiddenNames:[]};function p(n){return{enabled:n.enabled,hiddenNames:[...n.hiddenNames]}}function y(n){if(!n||typeof n!="object")return p(u);let t=n,i=typeof t.enabled=="boolean"?t.enabled:u.enabled,e=Array.isArray(t.hiddenNames)?t.hiddenNames:[],s=[],r=new Set;for(let o of e){if(typeof o!="string")continue;let l=o.trim();l&&(r.has(l)||(r.add(l),s.push(l)))}return{enabled:i,hiddenNames:s}}var x=require("obsidian");function b(n,t){let i=Object.keys(t).map(e=>I(n,e,t[e]));return i.length===1?i[0]:function(){i.forEach(e=>e())}}function I(n,t,i){let e=n[t],s=n.hasOwnProperty(t),r=i(e);return e&&Object.setPrototypeOf(r,e),Object.setPrototypeOf(o,r),n[t]=o,l;function o(...a){return r===e&&n[t]===o&&l(),r.apply(this,a)}function l(){n[t]===o&&(s?n[t]=e:delete n[t]),r!==e&&(r=e,Object.setPrototypeOf(o,e||Function))}}function F(n){return n.name}function R(n){return n instanceof x.TFolder?n.parent===null:!1}function E(n){let t=new Set,i="";function e(){let r=n(),o=`${r.enabled}|${r.hiddenNames.join(`
`)}`;o!==i&&(t=new Set(r.hiddenNames),i=o)}function s(r){if(e(),!n().enabled)return!1;let l=F(r);return t.has(l)}return{shouldHide:s}}function C(n,t){let{shouldHide:i}=E(t);try{let e=n.workspace.getLeavesOfType("file-explorer")[0];if(!e)return console.warn("[Hide Files] File Explorer not found"),null;let s=e.view;return b(Object.getPrototypeOf(s),{getSortedFolderItems(o){return function(l){return o.call(this,l).filter(d=>!i(d.file))}},onFileOpen(o){return function(l){if(!(l&&i(l)))return o.call(this,l)}},revealInFolder(o){return function(l){if(!i(l))return o.call(this,l)}}})}catch(e){return console.error("[Hide Files] Failed to patch File Explorer:",e),null}}function O(n,t,i){let{shouldHide:e}=E(t),s=n.workspace.on("file-menu",(r,o,l)=>{if(l!=="file-explorer"||R(o))return;let a=F(o),d=e(o);r.addItem(f=>{f.setTitle(d?"Already hidden":"Hide this file").setIcon("eye-off").setDisabled(d).onClick(async()=>{d||await i(a)})})});return()=>{n.workspace.offref(s)}}function w(n,t,i){let e=[],s=null,r=()=>{if(s)return!0;if(n.workspace.getLeavesOfType("file-explorer").length===0)return!1;let a=C(n,t);return a?(s=a,e.push(a),c(n),!0):!1};async function o(a){let d=t(),f=a.trim();d.hiddenNames.includes(f)||(d.hiddenNames=[...d.hiddenNames,f],await i(),c(n))}let l=O(n,t,o);return e.push(l),n.workspace.onLayoutReady(()=>{if(!r()){let a=null,d=()=>{a&&(n.workspace.offref(a),a=null)};a=n.workspace.on("layout-change",()=>{r()&&d()}),e.push(d)}}),{refresh(){c(n)},dispose(){for(;e.length>0;){let a=e.pop();a==null||a()}}}}function c(n){try{let t=n.workspace.getLeavesOfType("file-explorer")[0];if(!t)return;let i=t.view;typeof i.requestSort=="function"&&i.requestSort()}catch(t){console.error("[Hide Files] Failed to refresh File Explorer:",t)}}var h=require("obsidian");var g=class extends h.PluginSettingTab{constructor(t,i){super(t,i),this.plugin=i}display(){let{containerEl:t}=this;t.empty(),t.createEl("h2",{text:"Hide Specified Files"}),new h.Setting(t).setName("Enable file hiding").setDesc("Toggle file hiding on/off").addToggle(s=>s.setValue(this.plugin.settings.enabled).onChange(async r=>{this.plugin.settings.enabled=r,await this.plugin.saveSettings(),c(this.app)}));let i=new h.Setting(t).setName("Add file or folder name to hide").setDesc("Enter the exact name (for files: include extension)"),e;if(i.addText(s=>{e=s.inputEl,s.setPlaceholder("e.g., README.md, drafts, .obsidian").onChange(()=>{e.removeClass("hide-files-error")})}),i.addButton(s=>s.setButtonText("Add").setCta().onClick(async()=>{let r=e.value.trim();if(!r){e.addClass("hide-files-error");return}if(this.plugin.settings.hiddenNames.includes(r)){e.addClass("hide-files-error"),e.value="",e.placeholder="Already in the list!",setTimeout(()=>{e.placeholder="e.g., README.md, drafts, .obsidian"},2e3);return}this.plugin.settings.hiddenNames=[...this.plugin.settings.hiddenNames,r],await this.plugin.saveSettings(),c(this.app),e.value="",this.display()})),this.plugin.settings.hiddenNames.length>0){t.createEl("h3",{text:"Currently hidden:"});let s=t.createDiv("hide-files-list");for(let r of this.plugin.settings.hiddenNames){let o=s.createDiv("hide-files-item");o.createSpan({text:r,cls:"hide-files-name"}),o.createEl("button",{text:"Delete",cls:"hide-files-delete"}).addEventListener("click",async()=>{this.plugin.settings.hiddenNames=this.plugin.settings.hiddenNames.filter(a=>a!==r),await this.plugin.saveSettings(),c(this.app),this.display()})}}else t.createEl("p",{text:"No files or folders are currently hidden.",cls:"hide-files-empty"});this.addStyles()}addStyles(){if(document.getElementById("hide-files-styles"))return;let t=document.createElement("style");t.id="hide-files-styles",t.textContent=`
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
    `,document.head.appendChild(t)}};var m=class extends S.Plugin{constructor(){super(...arguments);this.settings=p(u);this.hideFilesHandle=null;this.ribbonIconEl=null}async onload(){console.log("[Hide Files] Loading plugin...");try{await this.loadSettings(),this.hideFilesHandle=w(this.app,()=>this.settings,()=>this.saveSettings()),this.addRibbonIconButton(),this.addSettingTab(new g(this.app,this)),this.addCommand({id:"refresh-file-explorer",name:"Refresh File Explorer",callback:()=>{var i;(i=this.hideFilesHandle)==null||i.refresh()}}),this.addCommand({id:"toggle-hide-files",name:"Toggle file hiding on/off",callback:async()=>{await this.setEnabled(!this.settings.enabled)}}),console.log("[Hide Files] Plugin loaded successfully")}catch(i){console.error("[Hide Files] Failed to load plugin:",i)}}async onunload(){var i;console.log("[Hide Files] Unloading plugin...");try{(i=this.hideFilesHandle)==null||i.dispose(),this.hideFilesHandle=null;let e=document.getElementById("hide-files-styles");e==null||e.remove(),console.log("[Hide Files] Plugin unloaded successfully")}catch(e){console.error("[Hide Files] Failed to unload plugin:",e)}}async loadSettings(){try{let i=await this.loadData();this.settings=y(i)}catch(i){console.error("[Hide Files] Failed to load settings:",i),this.settings=p(u)}}async saveSettings(){try{await this.saveData(this.settings)}catch(i){console.error("[Hide Files] Failed to save settings:",i)}}async addHiddenName(i){var s;let e=i.trim();e&&(this.settings.hiddenNames.includes(e)||(this.settings.hiddenNames=[...this.settings.hiddenNames,e],await this.saveSettings(),(s=this.hideFilesHandle)==null||s.refresh()))}async removeHiddenName(i){var e;this.settings.hiddenNames=this.settings.hiddenNames.filter(s=>s!==i),await this.saveSettings(),(e=this.hideFilesHandle)==null||e.refresh()}async setEnabled(i){var e;this.settings.enabled=i,await this.saveSettings(),(e=this.hideFilesHandle)==null||e.refresh(),this.updateRibbonIcon()}addRibbonIconButton(){let i=this.settings.enabled?"eye-off":"eye";this.ribbonIconEl=this.addRibbonIcon(i,"Toggle file hiding",async e=>{await this.setEnabled(!this.settings.enabled)})}updateRibbonIcon(){this.ribbonIconEl&&(this.ribbonIconEl.remove(),this.addRibbonIconButton())}};
