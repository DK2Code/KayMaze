import {STARTERS,SPECIES,ROUTES,MODES,signature} from './data.mjs';
import {createMaze,tick,showHint,switchPartner,blankSave,sanitizeSave,chooseStarter,collectionIds,nextReward,completeRun,medals,isRouteUnlocked} from './game.mjs';
import {loadArt,createRenderer} from './art.mjs';
import {TRAINERS,trainerPortrait,loadWorldArt,renderTrailPreview} from './world-art.mjs';
import {Audio} from './audio.mjs';
import {SAVE_KEY,resetProgress,unlockAdmin} from './progress.mjs';
import {createExplorerControls,cellAtPoint} from './controls.mjs';
import {RIBBON_PORTRAITS} from './ui/ribbon-portraits.mjs';
const controls=createExplorerControls();
const touchMedia=matchMedia('(pointer: coarse), (max-width: 860px)');
const $=s=>document.querySelector(s),dialog=$('#dialog'),canvas=$('#game'),sound=new Audio(),render=createRenderer(canvas);
const paths={maze:'M3 4h18v7h-7v10H3V11h5v5m0-12v3m13 10v4',compass:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m4 6-2.5 5.5L8 16l2.5-5.5L16 8',ball:'M2 12h7m6 0h7M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',book:'M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2m0-16c4-3 8-2 10-1v15c-3-1-6-1-10 2V5',map:'m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3V5m6-3v17m6-14v17',arrow:'M4 12h16m-6-6 6 6-6 6',tree:'m12 2-6 7h3l-5 6h6v6h4v-6h6l-5-6h3L12 2',pause:'M8 5v14M16 5v14',play:'m8 4 12 8-12 8V4',expand:'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5',clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 4v6l4 2',spark:'m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2',leaf:'M20 3C9 2 2 7 5 15c3 8 16 6 15-12M4 21l11-11',flag:'M5 22V3m0 0c5-5 9 5 15 0v12c-6 5-10-5-15 0',chevron:'m6 9 6 6 6-6',swap:'M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4',pointer:'m4 3 5 17 3-7 7-3L4 3m9 11 5 6',mute:'M11 4 6 8H2v8h4l5 4V4m6 5 5 6m0-6-5 6',volume:'M11 4 6 8H2v8h4l5 4V4m5 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14',close:'m6 6 12 12M6 18 18 6',lock:'M6 10h12v11H6V10m2 0V6a4 4 0 0 1 8 0v4',check:'m4 12 5 5L20 6',heart:'M12 21 3 12C-3 4 8-2 12 6c4-8 15-2 9 6l-9 9'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.spark}"/></svg>`;
function icons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);el.removeAttribute('data-icon');});}
icons();
let save=blankSave(),storageOK=true;try{save=sanitizeSave(JSON.parse(localStorage.getItem(SAVE_KEY)));}catch{}
const systemReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(systemReduced)save.reduced=true;
let routeIndex=0,activePartner=save.starter||25,game=createMaze(0,save.mode,46187,activePartner,nextReward(save,0)),started=false,paused=false,trailPickerOpen=true,atlasSelection=0,atlasMode=save.mode,refreshAtlas=()=>{},hover=null,lastTime=0,hudAge=0,modalReturnFocus=null,lastMessage='',pendingPartner=null;
sound.enabled=save.sound;
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));storageOK=true;}catch{storageOK=false;}$('.autosave').innerHTML=`<i></i> ${storageOK?'Collection saves automatically':'Session only · browser storage unavailable'}`;}
function timeText(seconds){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;}
function setRibbonPortrait(image,source){
 image.src=source;const p=RIBBON_PORTRAITS[source];
 if(p){image.style.width=p.width+'px';image.style.height=p.height+'px';image.style.transform=`translate(${p.x}px,${p.y}px)`;}
}
function syncProfile(){
 $('#profile-name').textContent=TRAINERS[save.trainer].name;setRibbonPortrait($('#profile-img'),trainerPortrait(save.trainer));
 $('#profile-button').ariaLabel=`Change trainer — ${TRAINERS[save.trainer].name}`;$('#profile-button').title=$('#profile-button').ariaLabel;
 $('#collection-count').textContent=save.owned.length;$('#sound-button').innerHTML=icon(save.sound?'volume':'mute');$('#sound-button').ariaLabel=save.sound?'Mute sound':'Turn sound on';$('#sound-button').title=$('#sound-button').ariaLabel;$('#sound-button').setAttribute('aria-pressed',save.sound);
 if(trailPickerOpen)refreshAtlas();
}
function updatePartner(){const p=SPECIES[activePartner];setRibbonPortrait($('#partner-image'),`assets/${p.id}.png`);$('#switch-button').ariaLabel=save.starter?`Switch Pokémon — ${p.name}`:'Choose your Pokémon';$('#switch-button').title=$('#switch-button').ariaLabel;}
function updateRoute(){syncWebState();const r=ROUTES[routeIndex];$('#route-title').textContent=trailPickerOpen?'Choose your trail':r.name;$('#route-kicker').textContent=trailPickerOpen?'YOUR FIELD ATLAS · 7 LITTLE WORLDS':`TRAIL 0${routeIndex+1} · ${r.tag}`;$('#mode-label').innerHTML=MODES[game.mode].name+icon('chevron');$('#mode-label').ariaLabel=`Change difficulty — ${MODES[game.mode].name}`;$('#journal-tip').textContent='Collect the three trail stars before reaching your new friend.';}
function startExpedition(index=routeIndex){if(!save.starter){openSetup(false,index);return;}if(!isRouteUnlocked(save,index))return;routeIndex=index;activePartner=pendingPartner??activePartner;const seed=(Date.now()^(save.runs*71237))>>>0;game=createMaze(index,save.mode,seed,activePartner,nextReward(save,index));started=true;paused=false;trailPickerOpen=false;pendingPartner=null;controls.reset(game);$('#pause-curtain').classList.add('hidden');$('#pause-button').innerHTML=icon('pause');$('#pause-button').ariaLabel='Pause expedition';updateRoute();updatePartner();modalReturnFocus=canvas;closeDialog();canvas.focus({preventScroll:true});}
function clearInput(){controls.reset(game);}
function setPaused(value){if(!started||trailPickerOpen||game.status==='won')return;paused=value;clearInput();sound.stop();$('#pause-curtain').classList.toggle('hidden',!value);$('#pause-button').innerHTML=icon(value?'play':'pause');$('#pause-button').ariaLabel=value?'Resume expedition':'Pause expedition';if(!value)canvas.focus({preventScroll:true});}
function openDialog(html){closeJournal();if(!dialog.open)modalReturnFocus=document.activeElement;clearInput();sound.stop();$('#dialog-content').innerHTML=html;icons(dialog);if(!dialog.open)dialog.showModal();dialog.querySelector('[data-close]')?.addEventListener('click',closeDialog);dialog.querySelector('button')?.focus({preventScroll:true});}
function closeDialog(){if(dialog.open)dialog.close();clearInput();}
dialog.addEventListener('close',()=>{clearInput();(modalReturnFocus?.isConnected?modalReturnFocus:canvas)?.focus({preventScroll:true});});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
const modalTop=(eyebrow,title,description)=>`<div class="modal-top"><div><div class="eyebrow">${eyebrow}</div><h2 id="dialog-title">${title}</h2>${description?`<p>${description}</p>`:''}</div><button class="icon-button" data-close aria-label="Close dialog">${icon('close')}</button></div>`;
const journalMenu=$('#journal-menu'),journalButton=$('#journal-button'),journalPopover=$('#journal-popover');
let journalPinned=false,journalCloseTimer;
function showJournal(pin=false){if(trailPickerOpen)return;clearTimeout(journalCloseTimer);journalPinned=journalPinned||pin;journalPopover.hidden=false;journalButton.setAttribute('aria-expanded','true');}
function closeJournal(){clearTimeout(journalCloseTimer);journalPinned=false;journalPopover.hidden=true;journalButton.setAttribute('aria-expanded','false');}
journalButton.onclick=()=>journalPinned?closeJournal():showJournal(true);
journalMenu.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')showJournal();});
journalMenu.addEventListener('pointerleave',()=>{if(!journalPinned&&!journalMenu.contains(document.activeElement))journalCloseTimer=setTimeout(closeJournal,180);});
journalMenu.addEventListener('focusin',()=>showJournal());
journalMenu.addEventListener('focusout',e=>{if(!journalPinned&&!journalMenu.contains(e.relatedTarget))closeJournal();});
document.addEventListener('pointerdown',e=>{if(!journalMenu.contains(e.target))closeJournal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!journalPopover.hidden){e.preventDefault();e.stopImmediatePropagation();journalButton.focus({preventScroll:true});closeJournal();}},true);
function syncWebState(){
 document.body.classList.toggle('is-playing',started);document.body.classList.toggle('selecting-trail',trailPickerOpen);
 $('#trail-picker').hidden=!trailPickerOpen;$('#canvas-wrap').hidden=trailPickerOpen;
 $('#begin-button').hidden=started||trailPickerOpen;$('#pause-button').hidden=!started||trailPickerOpen;
 $('#mode-label').hidden=trailPickerOpen;$('#journal-button').disabled=trailPickerOpen;
 $('#atlas-button').setAttribute('aria-expanded',String(trailPickerOpen));
}
function closeAtlas(){
 if(!started)return;
 trailPickerOpen=false;clearInput();updateRoute();canvas.focus({preventScroll:true});
}
function openSetup(profileOnly=false,initialRoute=0){let chosenTrainer=save.trainer,chosenStarter=save.starter||25;
 const draw=()=>{openDialog(`<div class="modal-body">${modalTop('THE START OF SOMETHING GOOD',profileOnly?'Who’s leading the way?':'Meet your adventure team.',profileOnly?'Your trainer’s look is up to you. Your collection stays with you.':'Choose your trainer and one starter. You’ll meet more Pokémon on the trail.')}<div class="modal-section-label">01 / CHOOSE YOUR TRAINER</div><div class="trainer-options">${Object.entries(TRAINERS).map(([id,t])=>`<button class="trainer-option ${chosenTrainer===id?'selected':''}" data-trainer="${id}" aria-pressed="${chosenTrainer===id}"><img src="${trainerPortrait(id)}" alt="">${t.name}</button>`).join('')}</div>${profileOnly?'':`<div class="modal-section-label">02 / ONE PARTNER. A BIG ADVENTURE.</div><div class="starter-options">${STARTERS.map(id=>`<button class="starter-option ${chosenStarter===id?'selected':''}" data-starter="${id}" aria-pressed="${chosenStarter===id}">${chosenStarter===id?'<span class="selection-check">✓</span>':''}<img src="assets/${id}.png" alt=""><strong>${SPECIES[id].name}</strong><small>${SPECIES[id].type} · ${signature(id).name}</small></button>`).join('')}</div>`}<div class="modal-footer"><p>${profileOnly?'Trainer choice is cosmetic.':'Every starter can clear every maze. Matching moves simply open the way faster.'}</p><button class="primary" id="confirm-team">${profileOnly?'Save trainer':'Start my adventure'} ${icon('arrow')}</button></div></div>`);
 dialog.querySelectorAll('[data-trainer]').forEach(b=>b.onclick=()=>{chosenTrainer=b.dataset.trainer;draw();dialog.querySelector(`[data-trainer="${chosenTrainer}"]`).focus();});dialog.querySelectorAll('[data-starter]').forEach(b=>b.onclick=()=>{chosenStarter=Number(b.dataset.starter);draw();dialog.querySelector(`[data-starter="${chosenStarter}"]`).focus();});$('#confirm-team').onclick=()=>{sound.unlock();if(profileOnly){save.trainer=chosenTrainer;persist();syncProfile();closeDialog();}else if(chooseStarter(save,chosenStarter,chosenTrainer)){activePartner=chosenStarter;if(trailPickerOpen)save.mode=atlasMode;persist();syncProfile();startExpedition(initialRoute);}};};draw();}
function openAtlas(initialRoute=routeIndex){
 closeJournal();if(dialog.open){modalReturnFocus=$('#atlas-button');closeDialog();}clearInput();sound.stop();
 atlasSelection=isRouteUnlocked(save,initialRoute)?initialRoute:routeIndex;atlasMode=save.mode;trailPickerOpen=true;
 const draw=()=>{
  const scrollTop=$('#trail-picker .route-options')?.scrollTop||0;
  $('#trail-picker').innerHTML=`<div class="picker-intro"><div><h2 id="trail-picker-title">Where shall we wander?</h2><p>Pick a trail and your pace.${save.starter?' Your team is ready.':' Then choose your trainer and first Pokémon.'}</p></div><span class="picker-count">${save.unlockedRoutes.length} / ${ROUTES.length} unlocked</span></div>
  <div class="route-options">${ROUTES.map((r,i)=>`<button class="route-option ${atlasSelection===i?'selected':''}" data-route="${i}" ${!isRouteUnlocked(save,i)?'disabled':''} aria-pressed="${atlasSelection===i}" aria-label="${r.name}${!isRouteUnlocked(save,i)?' — locked':''}"><span class="route-number">TRAIL 0${i+1}</span><span class="route-lock">${!isRouteUnlocked(save,i)?icon('lock'):atlasSelection===i?icon('check'):'OPEN'}</span><canvas class="route-preview" data-route-preview="${i}" aria-hidden="true"></canvas><h3>${r.name}</h3><p>${!isRouteUnlocked(save,i)?'Catch a friend on the previous trail to unlock.':r.description}</p></button>`).join('')}</div>
  <div class="picker-footer"><div class="picker-pace"><span class="modal-section-label">SET YOUR PACE</span><div class="mode-options">${Object.entries(MODES).map(([id,m])=>`<button class="mode-option ${atlasMode===id?'selected':''}" data-mode="${id}" aria-pressed="${atlasMode===id}">${m.name}</button>`).join('')}</div><p class="mode-explanation">${MODES[atlasMode].description}</p></div><div class="picker-start">${started?'<button class="secondary" id="cancel-trail">Back to current trail</button>':''}<button class="primary" id="start-trail">${save.starter?'Explore this trail':'Choose my team'} ${icon('arrow')}</button></div>${started?'<p class="picker-warning">Starting a trail replaces this expedition. Your collection and records stay saved.</p>':''}</div>`;
  const picker=$('#trail-picker');picker.querySelector('.route-options').scrollTop=scrollTop;
  picker.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{atlasSelection=Number(b.dataset.route);draw();picker.querySelector(`[data-route="${atlasSelection}"]`).focus({preventScroll:true});});
  picker.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{atlasMode=b.dataset.mode;draw();picker.querySelector(`[data-mode="${atlasMode}"]`).focus({preventScroll:true});});
  const previews=[...picker.querySelectorAll('[data-route-preview]')];loadWorldArt().then(()=>previews.filter(c=>c.isConnected).forEach(c=>{const i=Number(c.dataset.routePreview);renderTrailPreview(c,createMaze(i,'relaxed',4587,25,ROUTES[i].rewards[0]),ROUTES[i].id);})).catch(()=>{});
  $('#cancel-trail')?.addEventListener('click',closeAtlas);
  $('#start-trail').onclick=()=>{save.mode=atlasMode;persist();if(save.starter)startExpedition(atlasSelection);else openSetup(false,atlasSelection);};
 };
 refreshAtlas=draw;draw();updateRoute();
}
function openDifficulty(){
 if(!started||trailPickerOpen)return;
 let selected=game.mode;
 const draw=()=>{
  openDialog(`<div class="modal-body">${modalTop('YOUR TRAIL. YOUR PACE.','Choose your difficulty.',`Stay on ${ROUTES[routeIndex].name} and pick a challenge that feels right.`)}<div class="difficulty-options">${Object.entries(MODES).map(([id,m])=>`<button class="difficulty-option ${selected===id?'selected':''}" data-difficulty="${id}" aria-pressed="${selected===id}"><span><strong>${m.name}</strong><small>${m.description}</small><small>${m.width} × ${m.height} maze · ${m.hp} obstacle strength</small></span>${selected===id?icon('check'):''}</button>`).join('')}</div><p class="difficulty-notice">Changing difficulty starts a fresh maze on this trail. Your trainer, Pokémon collection, and earned records stay saved.</p><div class="modal-footer difficulty-actions"><button class="secondary" id="difficulty-cancel">Keep playing</button><button class="primary" id="difficulty-apply" ${selected===game.mode?'disabled':''}>Start ${MODES[selected].name} maze ${icon('arrow')}</button></div></div>`);
  dialog.querySelectorAll('[data-difficulty]').forEach(b=>b.onclick=()=>{selected=b.dataset.difficulty;draw();dialog.querySelector(`[data-difficulty="${selected}"]`).focus({preventScroll:true});});
  $('#difficulty-cancel').onclick=closeDialog;
  $('#difficulty-apply').onclick=()=>{save.mode=selected;persist();startExpedition(routeIndex);};
 };
 draw();dialog.querySelector(`[data-difficulty="${selected}"]`).focus({preventScroll:true});
}
function openCollection(){if(!save.starter){openSetup(false,atlasSelection);return;}const ids=collectionIds(save);openDialog(`<div class="modal-body">${modalTop('LITTLE FRIENDS. BIG POSSIBILITIES.','Your trail companions.',`${save.owned.length} of ${ids.length} companions ${save.adminUnlocked?'available · Admin unlock active':'found'}. Pick an owned Pokémon to explore together.`)}<div class="collection-grid">${ids.map(id=>{const p=SPECIES[id],owned=save.owned.includes(id),route=ROUTES.find(r=>r.rewards.includes(id)),m=signature(id);return`<button class="collection-option ${owned?'':'locked'} ${id===activePartner?'active':''}" data-partner="${id}" ${owned?'':'disabled'} aria-pressed="${id===activePartner}">${id===activePartner?'<span class="selection-check">✓</span>':''}<img src="assets/${id}.png" alt=""><strong>${p.name}</strong><small>${owned?m.name:route?.name||'Starter Pokémon'}</small></button>`;}).join('')}</div><div class="modal-footer"><p>Catch the waiting Pokémon by reaching the exit. Each trail offers three new friends before repeat encounters.</p><button class="secondary" id="collection-done">Back to the trail</button></div></div>`);$('#collection-done').onclick=closeDialog;dialog.querySelectorAll('[data-partner]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.partner);if(started&&game.status==='playing'){pendingPartner=id;if(trailPickerOpen){activePartner=id;updatePartner();}}else{activePartner=id;game.partner=id;updatePartner();}closeDialog();canvas.focus({preventScroll:true});});}
function openGuide(){openDialog(`<div class="modal-body">${modalTop('A FEW NOTES FOR THE ROAD','Your field guide.','There’s no timer to beat and no partner left behind. Explore at your own pace.')}<div class="guide-grid"><div class="guide-item">${icon('compass')}<strong>Find your own way</strong><p>Click or tap a reachable path to walk there on any device. Keyboard shortcuts are also available: WASD or arrows to move. Choose A little nudge for a trail to the exit (keyboard: H).</p></div><div class="guide-item">${icon('spark')}<strong>Make a little room</strong><p>Click or tap an obstacle to walk beside it and clear it automatically. Your partner repeats its move at the normal attack rate. Every partner can clear every obstacle. Select another destination or open a menu to cancel. Keyboard: Space attacks an adjacent obstacle.</p></div><div class="guide-item">${icon('ball')}<strong>A friend at every finish</strong><p>Reach the Pokémon beside the little gold flag. The catch is guaranteed! Find your new partner in Collection and take them into any unlocked maze.</p></div><div class="guide-item">${icon('flag')}<strong>Leave room for a detour</strong><p>Earn one medal for the catch and another for all three trail stars. Use the difficulty button in the game ribbon to start a smaller or more challenging maze on your current trail.</p></div></div><div class="modal-section-label">MAKE YOURSELF COMFORTABLE</div><label class="toggle-line"><input id="reduced-toggle" type="checkbox" ${save.reduced?'checked':''}> Reduce decorative motion and flashes</label><p class="credit-text">Esc or P pauses. Open dialogs pause the adventure. Leaving this tab also pauses it.<br>Your collection, trail unlocks, and records save in this browser. Reloading starts a new expedition.</p><section class="admin-section"><div><strong>Admin tools${save.adminUnlocked?' · Active':''}</strong><p>${save.adminUnlocked?'Every trail and Pokémon is available for testing.':'Unlock all trails and Pokémon with the admin password.'}</p></div><button class="secondary" id="admin-tools">${save.adminUnlocked?'View admin tools':'Admin unlock'}</button></section><section class="reset-section"><div><strong>Start a new adventure</strong><p>Reset all progress to choose a new trainer and starting Pokémon.</p></div><button class="danger-outline" id="reset-progress">Reset all progress</button></section><div class="modal-footer"><p>Tip: ${ROUTES[routeIndex].tip}</p><button class="primary" id="guide-done">Got it. Let’s wander ${icon('arrow')}</button></div></div>`);$('#guide-done').onclick=closeDialog;$('#reset-progress').onclick=openReset;$('#admin-tools').onclick=openAdmin;$('#reduced-toggle').onchange=e=>{save.reduced=e.target.checked;persist();};}
function openAdmin(){
 const count=collectionIds({adminUnlocked:true}).length;
 if(save.adminUnlocked){
  openDialog(`<div class="modal-body">${modalTop('ADMIN TOOLS · ACTIVE','Everything is ready to explore.','All trails and Pokémon are unlocked for testing.')}<div class="admin-summary"><span class="admin-status">${icon('check')} ADMIN UNLOCK ACTIVE</span><div class="admin-stats"><div><strong>${ROUTES.length} / ${ROUTES.length}</strong><span>Trails available</span></div><div><strong>${count} / ${count}</strong><span>Pokémon available</span></div></div><p>Try every partner, landscape, and difficulty. Your chosen team and earned records stay saved; reaching the exit still plays the full catch sequence.</p></div><p class="credit-text">${storageOK?'Admin unlock stays active after reload.':'Session only: browser storage is unavailable.'} Use Reset all progress in the field guide to return to a fresh adventure.</p><div class="modal-footer admin-actions"><button class="secondary" id="admin-collection">Choose a Pokémon</button><button class="primary" id="admin-atlas">Explore all trails ${icon('arrow')}</button></div></div>`);
  $('#admin-collection').onclick=openCollection;$('#admin-atlas').onclick=openAtlas;
  return;
 }
 openDialog(`<div class="modal-body">${modalTop('ADMIN TOOLS','Unlock the whole adventure.','Enter the admin password to access every trail and Pokémon for testing.')}<div class="admin-summary"><div class="admin-stats"><div><strong>${ROUTES.length}</strong><span>Trails to explore</span></div><div><strong>${count}</strong><span>Pokémon, including all starters</span></div></div><p>Keep your current expedition, trainer, starter choice, and earned records.</p></div><form id="admin-form"><label class="admin-label" for="admin-password">Admin password</label><input class="admin-password" id="admin-password" name="password" type="password" inputmode="numeric" autocomplete="off" aria-describedby="admin-error" required><p class="admin-error" id="admin-error" role="alert"></p><div class="modal-footer admin-actions"><button class="secondary" type="button" id="admin-cancel">Back to field guide</button><button class="primary" type="submit">Unlock everything ${icon('lock')}</button></div></form></div>`);
 $('#admin-cancel').onclick=openGuide;
 $('#admin-password').oninput=e=>{e.target.removeAttribute('aria-invalid');$('#admin-error').textContent='';};
 $('#admin-form').onsubmit=e=>{
  e.preventDefault();const input=$('#admin-password');
  if(!unlockAdmin(save,input.value)){input.setAttribute('aria-invalid','true');$('#admin-error').textContent='Incorrect password. Try again.';input.select();return;}
  input.value='';persist();syncProfile();updateRoute();openAdmin();
 };
 $('#admin-password').focus();
}
function openReset(){
 openDialog(`<div class="modal-body">${modalTop('A FRESH START','Reset your adventure?','Choose a new trainer and starter after resetting.')}<div class="reset-summary"><strong>This clears all KayMaze progress in this browser.</strong><p>Your starter and trainer choice, caught Pokémon, unlocked trails, medals, records, settings, and admin unlock will be reset. This cannot be undone.</p><p>${save.owned.length} companion${save.owned.length===1?'':'s'} · ${save.runs} completed expedition${save.runs===1?'':'s'}</p></div><div class="modal-footer reset-actions"><button class="secondary" id="cancel-reset">Keep my adventure</button><button class="danger" id="confirm-reset">Reset everything</button></div></div>`);
 $('#cancel-reset').onclick=openGuide;
 $('#confirm-reset').onclick=resetAdventure;
 $('#cancel-reset').focus({preventScroll:true});
}
function resetAdventure(){
 clearInput();sound.stop();let storage;try{storage=localStorage;}catch{}
 const result=resetProgress(storage);save=result.save;storageOK=result.stored;sound.enabled=false;
 routeIndex=0;activePartner=25;game=createMaze(0,save.mode,46187,activePartner,nextReward(save,0));
 started=false;paused=false;trailPickerOpen=true;pendingPartner=null;hover=null;lastMessage='';lastTime=0;hudAge=0;
 document.body.classList.remove('expanded');$('#expand-button').ariaLabel='Expand game';
 $('#pause-curtain').classList.add('hidden');
 $('#pause-button').innerHTML=icon('pause');$('#pause-button').ariaLabel='Pause expedition';
 $('.autosave').innerHTML=`<i></i> ${storageOK?'Collection saves automatically':'Session only · browser storage unavailable'}`;
 syncProfile();updatePartner();openAtlas(0);updateHUD();openSetup();
 if(!storageOK){const notice=document.createElement('p');notice.className='storage-notice';notice.setAttribute('role','alert');notice.textContent='Your browser could not reset the saved file. This new adventure is available for this session; old progress may return after reloading.';dialog.querySelector('.modal-top').after(notice);}
}
function showWin(){const id=game.reward,p=SPECIES[id],n=medals(game),newRoute=routeIndex<ROUTES.length-1;openDialog(`<div class="win-body"><div class="eyebrow">A NEW CHAPTER IN YOUR FIELD JOURNAL</div><div class="win-art"><img src="assets/${id}.png" alt="${p.name}"></div><h2 id="dialog-title">${p.name} came along!</h2><p>${p.description}<br>Ready for your next adventure together.</p><div class="win-medals" aria-label="${n} of 2 medals">${Array.from({length:2},(_,i)=>`<span style="opacity:${i<n?1:.2}">✦</span>`).join('')}</div><div class="win-stats"><div><strong>${timeText(game.time)}</strong><small>TIME EXPLORING</small></div><div><strong>${game.found} / 3</strong><small>TRAIL STARS</small></div></div><p>${newRoute?`${ROUTES[routeIndex+1].name} is open. The adventure goes on.`:'You reached the final trail! Revisit the atlas to keep exploring and meet every companion.'}</p><div class="win-buttons"><button class="secondary" id="win-replay">Wander here again</button><button class="primary" id="win-next">Bring ${p.name} along ${icon('arrow')}</button></div><button class="text-button" id="win-atlas" style="margin:22px auto 0">Open the trail atlas ${icon('map')}</button></div>`);$('#win-replay').onclick=()=>startExpedition(routeIndex);$('#win-next').onclick=()=>{activePartner=id;startExpedition(Math.min(ROUTES.length-1,routeIndex+1));};$('#win-atlas').onclick=openAtlas;}
function updateHUD(){$('#stars-label').innerHTML=`${game.found} <span>/ 3</span>`;$('#timer-label').textContent=timeText(game.time);$('#medal-label').textContent=`${medals(game)} / 2`;
 for(const [id,done]of [['catch',game.status==='won'],['stars',game.found===3]]){const el=$('#objective-'+id);el.classList.toggle('done',done);el.querySelector('.objective-check').textContent=done?'✓':'○';}
 $('#pointer-guidance').lastChild.textContent=controls.assisting?' Clearing the selected obstacle · choose another path to cancel':' Click or tap a path to walk · an obstacle to clear it';
 $('#hint-button').disabled=!started||paused||trailPickerOpen||game.hintCooldown>0||game.status!=='playing';$('#hint-label').textContent=game.hintCooldown>0?`Nudge in ${Math.ceil(game.hintCooldown)}s`:'A little nudge';
 const message=!storageOK?'Your browser cannot save right now. Catches are available for this session.':game.toastTime>0&&started?game.toast:started?'Take your time. Follow the flag to find your next friend.':'Welcome to KayMaze. Your next little adventure starts here.';if(message!==lastMessage){$('#status-text').textContent=message;lastMessage=message;}
}
$('#begin-button').onclick=()=>{if(started){setPaused(false);canvas.scrollIntoView({block:'center',behavior:save.reduced?'auto':'smooth'});canvas.focus({preventScroll:true});}else openAtlas();};$('#explore-nav').onclick=()=>started&&!trailPickerOpen?canvas.focus():openAtlas();$('#collection-button').onclick=openCollection;$('#switch-button').onclick=openCollection;$('#atlas-button').onclick=()=>trailPickerOpen&&started?closeAtlas():openAtlas();$('#guide-button').onclick=openGuide;$('#mode-label').onclick=openDifficulty;$('#profile-button').onclick=()=>openSetup(!!save.starter,trailPickerOpen?atlasSelection:routeIndex);$('#hint-button').onclick=()=>{showHint(game);canvas.focus({preventScroll:true});};$('#pause-button').onclick=()=>setPaused(!paused);$('#resume-button').onclick=()=>setPaused(false);$('#expand-button').onclick=()=>{const expanded=document.body.classList.toggle('expanded');$('#expand-button').ariaLabel=expanded?'Exit expanded game':'Expand game';};$('#sound-button').onclick=()=>{save.sound=!save.sound;sound.enabled=save.sound;if(save.sound){sound.unlock();sound.tone(660,.1);}else sound.stop();persist();syncProfile();};
$('#credits-button').onclick=()=>openDialog(`<div class="modal-body">${modalTop('MADE WITH A LITTLE TRAIL MAGIC','Credits & notes.','KayMaze is an unofficial, noncommercial Pokémon fan adventure.')}<div class="credit-text"><p>Pokémon names and characters belong to Nintendo, Game Freak, and The Pokémon Company. KayMaze is not affiliated with or endorsed by them.</p><p>Directional sprites: <a href="https://github.com/PMDCollab/SpriteCollab" target="_blank" rel="noreferrer">SpriteCollab</a>, including CHUNSOFT and credited community artists. Community contributions use CC BY-NC 4.0. <a href="assets/directional/CREDITS.txt" target="_blank">Bundled credits</a> and per-species credit histories are included with the game.</p><p>Roster images and move data: <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noreferrer">PokéAPI</a>. Overworld trainers and terrain: <a href="assets/world/CREDITS.txt" target="_blank">Emerald / FireRed art credits</a>. Trainer portraits: <a href="assets/trainers/CREDITS.txt" target="_blank">pret/pokefirered credits</a>.</p><p>KayMaze combines bundled animation and move renderers with its own balance, composed terrain maps, directional overworld trainer animation, and locally synthesized sound. No account, purchase, or external game API is needed.</p></div></div>`);
const keyDirections={ArrowUp:0,KeyW:0,ArrowRight:1,KeyD:1,ArrowDown:2,KeyS:2,ArrowLeft:3,KeyA:3};
const canControl=()=>started&&!paused&&!trailPickerOpen&&!dialog.open&&game.status==='playing';
function syncTouchLayout(){document.body.classList.toggle('touch-ui',touchMedia.matches);}
syncTouchLayout();touchMedia.addEventListener('change',()=>{clearInput();syncTouchLayout();});
document.addEventListener('keydown',e=>{
 if(dialog.open||e.ctrlKey||e.metaKey||e.altKey)return;
 if(trailPickerOpen){if(e.code==='Escape'&&started){e.preventDefault();closeAtlas();}return;}
 if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(!e.repeat)setPaused(!paused);return;}
 if(e.code==='KeyH'&&!e.repeat&&canControl()){e.preventDefault();showHint(game);return;}
 if(!canControl()||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
 if(Object.hasOwn(keyDirections,e.code)||e.code==='Space'){
  if(e.code==='Space'&&e.target.closest('button'))return;
  e.preventDefault();if(e.repeat)return;sound.unlock();
  if(e.code==='Space')controls.pressAttack(game,e.code);else controls.pressMove(game,e.code,keyDirections[e.code]);
 }
});
document.addEventListener('keyup',e=>controls.release(e.code));
window.addEventListener('blur',()=>{clearInput();if(started&&game.status!=='won')setPaused(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();sound.stop();if(started&&game.status!=='won')setPaused(true);}});
function cellFromEvent(e){return cellAtPoint(canvas.getBoundingClientRect(),canvas,game,{x:e.clientX,y:e.clientY});}
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')hover=cellFromEvent(e);});
canvas.addEventListener('pointerleave',()=>hover=null);
canvas.addEventListener('pointerdown',e=>{
 if(!canControl()||e.button!==0)return;const cell=cellFromEvent(e);if(!cell)return;
 e.preventDefault();canvas.focus({preventScroll:true});sound.unlock();controls.tapWorld(game,cell);
});
function frame(ts){const elapsed=Math.min((ts-(lastTime||ts))/1000,.05);lastTime=ts;const running=started&&!paused&&!trailPickerOpen&&!dialog.open;if(running){if(game.status==='playing'){if(pendingPartner!==null&&!game.step&&!game.cast&&game.switchCooldown<=0){if(pendingPartner===game.partner||switchPartner(game,pendingPartner,save.owned)){activePartner=game.partner;pendingPartner=null;updatePartner();}}controls.update(game,elapsed);}tick(game,elapsed);while(game.events.length){const event=game.events.shift();sound.play(event.type,event.element);if(event.type==='caught'){completeRun(save,game);persist();syncProfile();updateHUD();showWin();}}}render(game,{trainerId:save.trainer,reduced:save.reduced,hover});hudAge+=elapsed;if(hudAge>.12){hudAge=0;updateHUD();}requestAnimationFrame(frame);}
syncProfile();updatePartner();openAtlas(0);updateHUD();requestAnimationFrame(frame);loadArt().then(syncProfile).catch(error=>{console.error(error);$('#status-text').textContent='Some artwork could not load. Reload the game to retry.';});
