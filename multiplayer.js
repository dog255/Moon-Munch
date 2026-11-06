// ===== MOON MUNCH MULTIPLAYER + FRIENDS (needs a free Firebase project) =====
const FIREBASE_CONFIG={
  apiKey: "AIzaSyDvQIwfM2yntaPiXh5q6TKIOiuXZIrjnnI",
  authDomain: "moon-munch-multyplayer.firebaseapp.com",
  databaseURL: "https://moon-munch-multyplayer-default-rtdb.firebaseio.com",
  projectId: "moon-munch-multyplayer",
  storageBucket: "moon-munch-multyplayer.firebasestorage.app",
  messagingSenderId: "312637998071",
  appId: "1:312637998071:web:7adc3004ff8c43b383a4f2",
  measurementId: "G-T0PFWJWKD1"
}; // <- replace null with your Firebase config object
(()=>{
const $=id=>document.getElementById(id);let db,auth,me,myName=localStorage.mmUser||'',queued=null,G=null,ready=false,matching=null,matchAttempt=0,matchStarting=false,authListeners=[];
function ov(h){let o=$('mpOv');if(!o){o=document.createElement('div');o.id='mpOv';o.className='homeInfo';o.style.zIndex=160;o.innerHTML='<section class="homeInfoCard" id="mpCard"></section>';document.body.appendChild(o)}$('mpCard').innerHTML=h+'<button class="secondary" id="mpClose">CLOSE</button>';o.style.display='grid';$('mpClose').onclick=()=>{o.style.display='none'}}
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
function getAuth(){
 if(typeof firebase==='undefined')throw new Error('Firebase could not load. Check your internet connection and reload.');
 if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);
 auth=firebase.auth();db=firebase.database();
 return auth;
}
async function setLocalPersistence(){
 const a=getAuth();
 await a.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
 return a;
}
function clearAuthListeners(){for(const [ref,event,handler] of authListeners)ref.off(event,handler);authListeners=[];ready=false}
function afterAuthChange(user){
 if(me&&user&&me!==user.uid)clearAuthListeners();
 me=user?user.uid:null;
}
function openSettings(){
 const user=auth&&auth.currentUser,title=$('homeInfoTitle'),content=$('homeInfoText');
 title.textContent='⚙ ACCOUNT SETTINGS';
 content.innerHTML=user&&!user.isAnonymous
  ?'<p>Signed in as <b>'+esc(user.email||'')+'</b>.</p><button class="primary" id="accountLogout">LOG OUT</button>'
  :'<p>You are playing as a guest. Create an account or log in with email and password.</p><button class="primary" id="accountLogin">LOG IN / CREATE ACCOUNT</button>';
 $('homeInfo').style.display='grid';
 const login=$('accountLogin');if(login)login.onclick=showAccountForm;
 const logout=$('accountLogout');if(logout)logout.onclick=logoutAccount;
}
function showAccountForm(){
 $('homeInfoTitle').textContent='LOG IN OR CREATE ACCOUNT';
 $('homeInfoText').innerHTML='<p>Use your email and a password. Choose <b>Create account</b> if this is your first time.</p><form id="accountForm" class="profileFields"><label>Email<input id="accountEmail" type="email" autocomplete="email" required></label><label>Password<input id="accountPassword" type="password" autocomplete="current-password" minlength="6" required></label><p id="accountStatus" class="shopStatus" role="status"></p><button type="submit" class="primary" id="accountLoginSubmit">LOG IN</button><button type="button" class="secondary" id="accountCreateSubmit">CREATE ACCOUNT</button><button type="button" class="secondary" id="accountBack">BACK TO SETTINGS</button></form>';
 const form=$('accountForm'),status=$('accountStatus');
 async function submitAccount(create){
  const email=$('accountEmail').value.trim(),password=$('accountPassword').value;
  if(!form.reportValidity())return;
  status.textContent=create?'Creating account…':'Logging in…';
  try{
   const a=await setLocalPersistence();let user;
   if(create){
    if(a.currentUser&&a.currentUser.isAnonymous){
     const credential=firebase.auth.EmailAuthProvider.credential(email,password);
     user=(await a.currentUser.linkWithCredential(credential)).user;
    }else user=(await a.createUserWithEmailAndPassword(email,password)).user;
   }else user=(await a.signInWithEmailAndPassword(email,password)).user;
   afterAuthChange(user);openSettings();
  }catch(e){status.textContent=accountError(e)}
 }
 form.onsubmit=e=>{e.preventDefault();submitAccount(false)};
 $('accountCreateSubmit').onclick=()=>submitAccount(true);
 $('accountBack').onclick=openSettings;
}
function accountError(error){
 const messages={
  'auth/email-already-in-use':'That email already has an account. Choose Log In instead.',
  'auth/invalid-email':'Enter a valid email address.',
  'auth/weak-password':'Choose a password with at least 6 characters.',
  'auth/user-not-found':'No account was found for that email. Choose Create Account if you are new.',
  'auth/wrong-password':'That password is incorrect.',
  'auth/invalid-credential':'The email or password is incorrect.',
  'auth/operation-not-allowed':'Email and password sign-in is not enabled for this Firebase project.'
 };
 return messages[error.code]||error.message||'Could not complete the account request. Please try again.';
}
async function logoutAccount(){
 try{
  const a=await setLocalPersistence();await a.signOut();const guest=(await a.signInAnonymously()).user;
  afterAuthChange(guest);openSettings();
 }catch(e){$('homeInfoText').insertAdjacentHTML('beforeend','<p class="shopStatus">'+esc(accountError(e))+'</p>')}
}
function showQueueScreen(message='Finding another player…'){
 let style=$('matchQueueStyles');if(!style){style=document.createElement('style');style.id='matchQueueStyles';style.textContent='.matchQueue{position:fixed;inset:0;z-index:160;display:grid;place-items:center;padding:18px;background:#080a13ed;backdrop-filter:blur(8px)}.matchQueueCard{width:min(440px,100%);padding:30px 24px;text-align:center;background:linear-gradient(145deg,#191d37,#10182d);border:1px solid #54aef4;border-radius:22px;box-shadow:0 0 42px #148bff33}.matchQueueCard h2{margin:0 0 10px;color:#d9ff6b}.matchQueueCard p{color:#c8cbe4;line-height:1.5}.matchQueueSpinner{width:48px;height:48px;margin:18px auto;border:4px solid #344263;border-top-color:#d9ff6b;border-right-color:#54aef4;border-radius:50%;animation:matchQueueSpin .8s linear infinite}@keyframes matchQueueSpin{to{transform:rotate(360deg)}}.matchQueueCancel{width:100%;margin-top:10px}';document.head.appendChild(style)}
 let screen=$('matchQueue');if(!screen){screen=document.createElement('div');screen.id='matchQueue';screen.className='matchQueue';screen.setAttribute('role','dialog');screen.setAttribute('aria-modal','true');screen.innerHTML='<section class="matchQueueCard"><h2>⚔ MATCHMAKING</h2><div class="matchQueueSpinner" aria-hidden="true"></div><p id="matchQueueMessage"></p><button class="secondary matchQueueCancel" id="matchQueueCancel">CANCEL</button></section>';document.body.appendChild(screen);$('matchQueueCancel').onclick=cancelMatch}
 $('matchQueueMessage').textContent=message;screen.style.display='grid';
}
function hideQueueScreen(){const screen=$('matchQueue');if(screen)screen.style.display='none'}
function stopQueue(state,removeWaiting){if(!state)return;clearInterval(state.heartbeat);state.playersRef.off('value',state.onPlayers);if(matching===state)matching=null;if(removeWaiting)db.ref('waiting').transaction(w=>w&&w.uid===me&&w.room===state.room?null:w)}
async function cancelMatch(){matchAttempt++;matchStarting=false;const state=matching;matching=null;if(state)stopQueue(state,true);if(state&&queued===state.room)queued=null;hideQueueScreen()}
async function init(){if(ready)return true;
 if(!FIREBASE_CONFIG||typeof firebase==='undefined'){ov('<h2>Multiplayer not set up yet</h2><p>The game owner needs to paste a Firebase config into the game file (see setup steps).</p>');return false}
 try{const a=await setLocalPersistence(),user=a.currentUser||(await a.signInAnonymously()).user;if(ready&&me===user.uid)return true;if(ready)clearAuthListeners();afterAuthChange(user);
 if(!myName){const n=(prompt('Pick a username (3-16 letters or numbers):')||'').trim().toLowerCase();if(!/^[a-z0-9]{3,16}$/.test(n)){ov('<h2>Invalid username</h2>');return false}
  const r=await db.ref('usernames/'+n).transaction(v=>v||me);if(!r.committed||r.snapshot.val()!==me){ov('<h2>That username is taken</h2><p>Try another one.</p>');return false}myName=n;localStorage.mmUser=n}
 await db.ref('users/'+me).set({name:myName});
 const requestsRef=db.ref('requests/'+me),requestsHandler=s=>{const f=s.key,n=s.val();if(confirm('👥 '+n+' wants to be your friend. Accept?'))db.ref().update({['friends/'+me+'/'+f]:n,['friends/'+f+'/'+me]:myName,['requests/'+me+'/'+f]:null});else s.ref.remove()};
 requestsRef.on('child_added',requestsHandler);authListeners.push([requestsRef,'child_added',requestsHandler]);
 const invitesRef=db.ref('invites/'+me),invitesHandler=s=>{const v=s.val();if(!v)return;s.ref.remove();if(!G&&confirm('🎮 '+v.name+' invited you to a 1v1. Play?'))play(v.room)};
 invitesRef.on('value',invitesHandler);authListeners.push([invitesRef,'value',invitesHandler]);
 ready=true;return true}catch(e){ov('<h2>Could not connect</h2><p>'+esc(e.message)+'</p>');return false}}
async function friends(){if(!await init())return;
 const fl=(await db.ref('friends/'+me).get()).val()||{};
 ov('<h2>👥 FRIENDS</h2><p>You are: <b>'+esc(myName)+'</b></p><div class="profileFields"><label>Find a player<input id="fSearch" maxlength="16" placeholder="their username"></label><button class="primary" id="fGo">SEARCH</button></div><p id="fRes"></p><h3>Your friends</h3><div id="fList">'+(Object.keys(fl).length?'':'<p>No friends yet.</p>')+'</div>');
 $('fList').innerHTML+=Object.entries(fl).map(([u,n])=>'<p>'+esc(n)+' <button data-u="'+u+'" class="fInv">▶ INVITE TO PLAY</button></p>').join('');
 document.querySelectorAll('.fInv').forEach(b=>b.onclick=async()=>{const room=db.ref('rooms').push().key;await db.ref('invites/'+b.dataset.u).set({name:myName,room});$('mpOv').style.display='none';play(room)});
 $('fGo').onclick=async()=>{const n=$('fSearch').value.trim().toLowerCase(),r=$('fRes');if(!n)return;const u=(await db.ref('usernames/'+n).get()).val();
  if(!u){r.textContent='No player called "'+n+'".';return}if(u===me){r.textContent='That is you!';return}if(fl[u]){r.textContent='Already friends!';return}
  r.innerHTML='Found <b>'+esc(n)+'</b> <button id="fAdd" class="primary">ADD FRIEND</button>';$('fAdd').onclick=async()=>{await db.ref('requests/'+u+'/'+me).set(myName);r.textContent='Request sent! They will see it on their screen.'}}}
async function match(){if(matchStarting||matching||G)return;matchStarting=true;const attempt=++matchAttempt;showQueueScreen('Connecting to matchmaking…');
 try{if(!await init()){if(attempt===matchAttempt){matchStarting=false;hideQueueScreen()}return}if(attempt!==matchAttempt)return;const room=db.ref('rooms').push().key;let m=null;
  const result=await db.ref('waiting').transaction(c=>{m=null;if(c&&c.uid!==me&&Date.now()-c.t<30000){m=c;return null}return{uid:me,room,t:Date.now()}});
  if(attempt!==matchAttempt){matchStarting=false;if(m&&m.room){hideQueueScreen();play(m.room)}else await db.ref('waiting').transaction(w=>w&&w.uid===me&&w.room===room?null:w);return}
  $('mpOv')&&($('mpOv').style.display='none');
  if(m&&m.room){matchStarting=false;hideQueueScreen();play(m.room);return}
  if(!result.committed)throw new Error('Could not reserve a place in the matchmaking queue.');
  matchStarting=false;queued=room;showQueueScreen('Waiting for another player to join…');
  const state={room,playersRef:db.ref('rooms/'+room+'/p'),heartbeat:null,onPlayers:null};matching=state;
  state.onPlayers=s=>{const players=s.val()||{};if(Object.keys(players).some(uid=>uid!==me)){stopQueue(state,false);hideQueueScreen();play(room)}};
  state.playersRef.on('value',state.onPlayers);
  state.heartbeat=setInterval(()=>db.ref('waiting').transaction(w=>w&&w.uid===me&&w.room===room?{...w,t:Date.now()}:w),10000);
 }catch(e){if(attempt===matchAttempt){matchStarting=false;hideQueueScreen();ov('<h2>Could not find a match</h2><p>'+esc(e.message)+'</p>')}}}
function play(room){if(G)return;const cv=document.createElement('canvas');cv.width=900;cv.height=600;const box=document.createElement('div');box.style.cssText='position:fixed;inset:0;z-index:170;background:#050a18;display:grid;place-items:center';box.innerHTML='<div style="position:relative;width:min(900px,100vw)"></div>';box.firstChild.appendChild(cv);
 const ex=document.createElement('button');ex.textContent='✖ LEAVE';ex.style.cssText='position:absolute;top:8px;right:8px';box.firstChild.appendChild(ex);document.body.appendChild(box);cv.style.cssText='width:100%;border:2px solid #54aef4;border-radius:14px';
 const c=cv.getContext('2d'),imgs={},im=k=>imgs[k]||(imgs[k]=Object.assign(new Image(),{src:(MM.art[k]||MM.art.moon_muncher)}));
 const first=!!queued&&queued===room,P=db.ref('rooms/'+room+'/p'),S=db.ref('rooms/'+room+'/s'),keys=new Set();
 const st={x:first?150:750,y:300,hp:100,n:myName,k:MM.key(MM.choice())};let opp=null,shots=[],cd=0,over='',seen=false,last=performance.now(),sent=0,iv=0;
 G={room};const mine=P.child(me);mine.set(st);mine.onDisconnect().remove();
 P.on('value',s=>{const v=s.val()||{};opp=null;for(const u in v)if(u!==me)opp=v[u];if(opp&&!seen){seen=true;if(queued){db.ref('waiting').transaction(w=>w&&w.uid===me?null:w);queued=null}}if(seen&&!opp&&!over)over='🏆 Your opponent left — you win!'});
 S.on('child_added',s=>{const v=s.val();if(v.o!==me)shots.push(v)});
 if(queued)iv=setInterval(()=>db.ref('waiting').transaction(w=>w&&w.uid===me?{...w,t:Date.now()}:w),10000);
 const kd=e=>{keys.add(e.key.toLowerCase());if(e.key===' ')e.preventDefault()},ku=e=>keys.delete(e.key.toLowerCase());addEventListener('keydown',kd);addEventListener('keyup',ku);
 function end(){cancelAnimationFrame(raf);clearInterval(iv);removeEventListener('keydown',kd);removeEventListener('keyup',ku);P.off();S.off();mine.remove();if(queued){db.ref('waiting').transaction(w=>w&&w.uid===me?null:w);queued=null}box.remove();G=null}
 ex.onclick=end;let raf;
 (function loop(now){raf=requestAnimationFrame(loop);const dt=Math.min((now-last)/1000,.04);last=now;
  if(!over){const dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0),l=Math.hypot(dx,dy)||1;st.x=Math.max(25,Math.min(875,st.x+dx/l*240*dt));st.y=Math.max(25,Math.min(575,st.y+dy/l*240*dt));
   cd-=dt;if(opp&&keys.has(' ')&&cd<=0){cd=.35;const a=Math.atan2(opp.y-st.y,opp.x-st.x),b={x:st.x,y:st.y,vx:Math.cos(a)*520,vy:Math.sin(a)*520,o:me};shots.push(b);S.push(b)}}
  for(let i=shots.length-1;i>=0;i--){const b=shots[i];b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.o!==me&&!over&&Math.hypot(b.x-st.x,b.y-st.y)<22){st.hp=Math.max(0,st.hp-10);shots.splice(i,1);if(st.hp<=0)over='💀 You were defeated!';continue}
   if(b.o===me&&opp&&Math.hypot(b.x-opp.x,b.y-opp.y)<22||b.x<0||b.x>900||b.y<0||b.y>600)shots.splice(i,1)}
  if(opp&&opp.hp<=0&&!over)over='🏆 You win!';
  if(now-sent>66){sent=now;mine.set(st)}
  c.fillStyle='#0b1226';c.fillRect(0,0,900,600);c.strokeStyle='#1c3b6b';c.lineWidth=4;c.strokeRect(8,8,884,584);
  for(const p of[st,opp]){if(!p)continue;const i=im(p.k);if(i.complete&&i.naturalWidth)c.drawImage(i,p.x-30,p.y-30,60,60);else{c.fillStyle='#d9ff6b';c.beginPath();c.arc(p.x,p.y,20,0,7);c.fill()}
   c.fillStyle='#fff';c.font='bold 13px system-ui';c.textAlign='center';c.fillText(p.n||'',p.x,p.y-42);c.fillStyle='#411';c.fillRect(p.x-30,p.y-36,60,6);c.fillStyle=p===st?'#79e76b':'#ff4f83';c.fillRect(p.x-30,p.y-36,60*p.hp/100,6)}
  for(const b of shots){c.fillStyle=b.o===me?'#d9ff6b':'#ff76c8';c.beginPath();c.arc(b.x,b.y,6,0,7);c.fill()}
  c.fillStyle='#e7e8ff';c.font='bold 16px system-ui';c.textAlign='center';if(!seen)c.fillText('⏳ Waiting for an opponent…  (WASD move · SPACE shoot)',450,40);else if(!over)c.fillText('1v1 — WASD move · SPACE shoot',450,30);
  if(over){c.fillStyle='#000a';c.fillRect(0,230,900,120);c.fillStyle='#d9ff6b';c.font='bold 34px system-ui';c.fillText(over,450,300);c.font='16px system-ui';c.fillText('Press LEAVE to go back',450,335)}})(last)}
$('homeMulti').onclick=match;$('homeFriends').onclick=friends;
window.MMAuth={openSettings};
})();
