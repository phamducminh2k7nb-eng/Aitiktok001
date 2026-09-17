const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

const seedProducts=[
  {id:'p1',name:'Kính cường lực 9H',price:'99.000đ',offer:'Freeship theo chương trình sàn',benefits:'Phủ kín màn hình\nCảm ứng mượt\nViền gọn, dễ lắp',audience:'Người cần bảo vệ màn hình hằng ngày',guard:'Không nói chống vỡ 100%\nKhông bịa tương thích máy'},
  {id:'p2',name:'Tai nghe Bluetooth AirBeat',price:'249.000đ',offer:'Ưu đãi theo phiên LIVE',benefits:'Thiết kế gọn\nKết nối Bluetooth\nHộp sạc nhỏ gọn',audience:'Sinh viên, người nghe nhạc và gọi thoại hằng ngày',guard:'Không khẳng định chống nước nếu chưa có chứng nhận\nKhông so sánh giả với thương hiệu khác'}
];

const demoComments=[
  ['@linh.anh','Shop ơi kính này có dễ dán không ạ?',1],
  ['@hoangnam88','Giá này đã gồm ship chưa shop?',1],
  ['@meocon_07','Có loại cho máy đời cũ không vậy?',1],
  ['@duongpham','Nhìn cũng xinh á 😍',0],
  ['@huyen.trang','Mua 2 cái có ưu đãi gì thêm không?',1],
  ['@minhngoc','Shop nói nhanh điểm khác biệt đi ạ',1],
  ['@anhkhoa','Dùng lâu cảm ứng có bị đơ không?',1],
  ['@thanhha','Chốt đơn ở đâu thế ạ?',1],
  ['@tuanvu','Test trực tiếp cho xem với shop',1]
];

const S={
  running:false,
  mode:localStorage.getItem('pl_mode')||'manual',
  tone:localStorage.getItem('pl_tone')||'friendly',
  comments:[],
  selected:null,
  spoken:0,
  timer:null,
  products:[],
  active:null,
  edit:null,
  provider:sessionStorage.getItem('pl_provider')||'openai',
  model:sessionStorage.getItem('pl_model')||'gpt-5.6-luna',
  key:sessionStorage.getItem('pl_key')||'',
  rate:Number(localStorage.getItem('pl_rate')||1.02),
  browserVoice:localStorage.getItem('pl_voice')||'',
  ttsEngine:localStorage.getItem('pl_tts_engine')||'openai',
  ttsVoice:localStorage.getItem('pl_tts_voice')||'coral',
  speechQueue:[],
  speaking:false,
  audio:null,
  currentUrl:null,
  audioUnlocked:false,
  aiQueue:[],
  aiBusy:false
};

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(text,good=true){const d=document.createElement('div');d.className='toast';d.style.borderColor=good?'#255846':'#63303A';d.textContent=text;$('#toasts').appendChild(d);setTimeout(()=>d.remove(),3600)}
function log(text){const d=document.createElement('div');d.innerHTML=`<b>${new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</b> ${esc(text)}`;$('#liveLog').prepend(d);while($('#liveLog').children.length>20)$('#liveLog').lastElementChild.remove()}

function load(){
  try{S.products=JSON.parse(localStorage.getItem('pl_products'))||seedProducts}catch{S.products=seedProducts}
  if(!Array.isArray(S.products)||!S.products.length)S.products=seedProducts;
  S.active=localStorage.getItem('pl_active')||S.products[0]?.id;
  bind(); renderProducts(); syncProduct(); syncSettings(); renderComments(); setMode(S.mode,false); setTone(S.tone,false); refreshVoices(); metrics(); healthCheck();
}

function bind(){
  $$('.nav button').forEach(b=>b.onclick=()=>view(b.dataset.view));
  $$('[data-jump]').forEach(b=>b.onclick=()=>view(b.dataset.jump));
  $('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
  $('#startBtn').onclick=toggleBot;
  $('#soundBtn').onclick=()=>unlockAudio(true);
  $('#addCommentBtn').onclick=addComment;
  $('#clearCommentsBtn').onclick=()=>{S.comments=[];S.selected=null;$('#reply').value='';$('#selected').textContent='Chọn một bình luận để AI xử lý.';renderComments();metrics()};
  $$('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode,true));
  $$('.tone').forEach(b=>b.onclick=()=>setTone(b.dataset.tone,true));
  $('#generateBtn').onclick=()=>{if(S.selected)queueAI(S.selected,false);else toast('Hãy chọn một bình luận.',false)};
  $('#speakBtn').onclick=approveSpeak;
  $('#testAiBtn').onclick=testAI;
  $('#newProductBtn').onclick=newProduct;
  $('#saveProductBtn').onclick=saveProduct;
  $('#deleteProductBtn').onclick=deleteProduct;
  $('#makeScriptBtn').onclick=makeScript;
  $('#provider').onchange=e=>{S.provider=e.target.value;sessionStorage.setItem('pl_provider',S.provider);if(S.provider==='openai'&&S.model.startsWith('gemini-'))S.model='gpt-5.6-luna';if(S.provider==='gemini'&&S.model.startsWith('gpt-'))S.model='gemini-3.8-flash';$('#model').value=S.model;updateKeyStatus()};
  $('#model').onchange=e=>{S.model=e.target.value.trim();sessionStorage.setItem('pl_model',S.model)};
  $('#saveKeyBtn').onclick=()=>{S.key=$('#apiKey').value.trim();S.key?sessionStorage.setItem('pl_key',S.key):sessionStorage.removeItem('pl_key');updateKeyStatus();toast(S.key?'Đã lưu key trong tab hiện tại.':'Đang dùng key phía Vercel nếu đã cấu hình.',true)};
  $('#forgetKeyBtn').onclick=()=>{S.key='';$('#apiKey').value='';sessionStorage.removeItem('pl_key');updateKeyStatus();toast('Đã xóa key khỏi trình duyệt. Key Vercel không bị ảnh hưởng.')};
  $('#rate').oninput=e=>{S.rate=Number(e.target.value);$('#rateVal').textContent=S.rate.toFixed(2)+'×';localStorage.setItem('pl_rate',S.rate)};
  $('#ttsEngine').onchange=e=>{S.ttsEngine=e.target.value;localStorage.setItem('pl_tts_engine',S.ttsEngine);syncTTSStatus()};
  $('#ttsVoice').onchange=e=>{S.ttsVoice=e.target.value;localStorage.setItem('pl_tts_voice',S.ttsVoice)};
  $('#browserVoice').onchange=e=>{S.browserVoice=e.target.value;localStorage.setItem('pl_voice',S.browserVoice)};
  $('#previewVoiceBtn').onclick=()=>enqueueSpeech('Xin chào, đây là giọng đọc tiếng Việt của PrismLive AI. Mình sẽ nói tự nhiên, rõ ràng và thân thiện như host livestream.');
  $('#saveTikTokBtn').onclick=()=>{sessionStorage.setItem('pl_tt_mode',$('#ttMode').value);sessionStorage.setItem('pl_tt_client',$('#ttClient').value.trim());sessionStorage.setItem('pl_tt_token',$('#ttToken').value.trim());$('#ttStatus').textContent=$('#ttMode').value==='authorized'?'Đã lưu cấu hình':'Demo adapter';toast('Đã lưu cấu hình TikTok trong phiên.')};
}

function view(v){
  $$('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+v));
  $$('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
  const meta={studio:['Live Studio','Bot AI đọc bình luận, trả lời khéo và giới thiệu sản phẩm.'],products:['Sản phẩm','Nguồn dữ liệu để AI tư vấn đúng, không bịa.'],scripts:['Kịch bản AI','Tạo nội dung LIVE theo sản phẩm đang bán.'],settings:['Cài đặt & Key','AI, giọng Việt, TikTok và các chế độ vận hành.']}[v];
  $('#pageTitle').textContent=meta[0]; $('#pageSub').textContent=meta[1]; $('#sidebar').classList.remove('open');
}

function setMode(mode,notify){
  S.mode=mode; localStorage.setItem('pl_mode',mode);
  $$('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  $('#modeLabel').textContent=mode==='auto'?'Tự động: AI trả lời + tự đọc':'Thủ công: bạn duyệt trước khi đọc';
  if(notify)toast(mode==='auto'?'Đã bật Tự động: AI sẽ trả lời và đọc luôn các bình luận có ý định mua.':'Đã chuyển sang Thủ công: AI soạn, bạn bấm Duyệt & đọc.');
}

function setTone(tone,notify){S.tone=tone;localStorage.setItem('pl_tone',tone);$$('.tone').forEach(b=>b.classList.toggle('active',b.dataset.tone===tone));if(notify)toast('Đã đổi phong cách nói.')}

async function toggleBot(){
  S.running=!S.running;
  $('#startBtn').textContent=S.running?'Dừng bot':'Bắt đầu bot';
  $('#mBot').textContent=S.running?'Đang chạy':'Sẵn sàng';
  $('#hostState').textContent=S.running?'AI host đang trực':'Đang chờ bắt đầu';
  $('#connChip').classList.toggle('live',S.running);
  $('#connText').textContent=S.running?'Demo LIVE đang chạy':'Demo offline';
  clearInterval(S.timer);
  if(S.running){
    await unlockAudio(false);
    if(!S.comments.length)addComment();
    S.timer=setInterval(addComment,5600);
    log('Bot demo đã bắt đầu'); toast('Bot đã bắt đầu.');
  }else{
    stopAllSpeech(); log('Bot đã dừng'); toast('Bot đã dừng.');
  }
}

function addComment(){
  const a=demoComments[Math.floor(Math.random()*demoComments.length)];
  const c={id:String(Date.now()+Math.random()),user:a[0],text:a[1],intent:!!a[2]};
  S.comments.unshift(c); S.comments=S.comments.slice(0,50); renderComments(); metrics(); log(`${c.user}: ${c.text}`);
  if(S.mode==='auto'&&c.intent)queueAI(c,true);
}

function renderComments(){
  const r=$('#comments');
  if(!S.comments.length){r.innerHTML='<div class="empty">Chưa có bình luận. Bật bot hoặc bấm “Demo comment”.</div>';return}
  r.innerHTML=S.comments.map(c=>`<div class="comment ${S.selected?.id===c.id?'selected':''}" data-id="${esc(c.id)}"><div class="avatar">${esc(c.user.replace('@','').slice(0,2).toUpperCase())}</div><div><b>${esc(c.user)}</b><p>${esc(c.text)}</p>${c.intent?'<span class="intent">Ý định mua / hỏi sản phẩm</span>':''}</div></div>`).join('');
  $$('.comment',r).forEach(e=>e.onclick=()=>{const c=S.comments.find(x=>x.id===e.dataset.id);if(c)queueAI(c,false)});
}

function markSelected(c){S.selected=c;renderComments();$('#selected').innerHTML=`<b>${esc(c.user)}</b> — ${esc(c.text)}`}

function queueAI(c,autoSpeak){S.aiQueue.push({c,autoSpeak});runAIQueue()}

async function runAIQueue(){
  if(S.aiBusy||!S.aiQueue.length)return;
  S.aiBusy=true;
  const {c,autoSpeak}=S.aiQueue.shift();
  try{
    markSelected(c); $('#reply').value='Đang nghĩ…';
    const text=await generateReply(c); $('#reply').value=text;
    log(`AI → ${c.user}: ${text}`);
    if(autoSpeak&&S.mode==='auto'){enqueueSpeech(text);toast('Tự động: đã tạo câu trả lời và đưa vào hàng đợi đọc.')}
  }catch(e){console.error(e);$('#reply').value='Không tạo được câu trả lời.';toast('AI gặp lỗi khi xử lý bình luận.',false)}
  finally{S.aiBusy=false;runAIQueue()}
}

function activeProduct(){return S.products.find(p=>p.id===S.active)||S.products[0]}
function context(p){return p?`Tên: ${p.name}\nGiá: ${p.price||'chưa có'}\nƯu đãi: ${p.offer||'chưa có'}\nĐiểm nổi bật: ${p.benefits||'chưa có'}\nKhách phù hợp: ${p.audience||'chưa có'}\nKhông được nói: ${p.guard||'không có ghi chú'}`:'Chưa có dữ liệu sản phẩm.'}

async function generateReply(c){
  const p=activeProduct();
  const tone={friendly:'tự nhiên, ấm áp, duyên',energetic:'trẻ, nhanh, năng lượng vừa phải',premium:'tinh tế, ngắn gọn, có gu'}[S.tone];
  const prompt=`Khách ${c.user} bình luận: "${c.text}"\n${context(p)}\nHãy trả lời bằng tiếng Việt tự nhiên theo phong cách ${tone}. Tối đa 2 câu khoảng 35 từ. Không bịa dữ liệu. Nếu thiếu thông tin hãy nói cần kiểm tra hoặc hỏi lại khéo. Chỉ trả về câu sẽ nói trên livestream.`;
  const out=await ai(prompt,'live_reply');
  return out||fallback(c,p);
}

function fallback(c,p){
  const t=c.text.toLowerCase(),n=p?.name||'sản phẩm';
  if(t.includes('ship'))return 'Phí ship có thể thay đổi theo tài khoản và chương trình của sàn nha. Bạn kiểm tra ở bước đặt hàng giúp mình để ra số chính xác nhất nhé.';
  if(t.includes('ưu đãi')||t.includes('mua 2'))return 'Ưu đãi mình chỉ nói đúng phần đang hiển thị thôi nha. Bạn xem giỏ hàng hiện tại, nếu có chương trình áp dụng mình sẽ chỉ ngay cho bạn.';
  if(t.includes('đắt')||t.includes('mắc'))return `Mình hiểu nha, mình không muốn ép bạn mua. Với ${n}, bạn cứ xem phần mình demo có đúng nhu cầu không rồi hãy quyết định nhé.`;
  if(t.includes('chốt')||t.includes('mua'))return 'Bạn thấy phù hợp thì kiểm tra đúng phân loại sản phẩm đang ghim và xem lại giá hiển thị trước khi đặt nha.';
  return `Câu này hay nè. Với ${n}, mình sẽ chỉ nói đúng thông tin đang có; phần nào chưa chắc mình kiểm tra lại để tư vấn bạn chính xác hơn nha.`;
}

function approveSpeak(){
  const text=$('#reply').value.trim();
  if(!text||text==='Đang nghĩ…'||text==='Không tạo được câu trả lời.')return toast('Chưa có câu trả lời để đọc.',false);
  enqueueSpeech(text); toast('Đã duyệt và đưa câu trả lời vào hàng đợi đọc.');
}

function enqueueSpeech(text){if(!text)return;S.speechQueue.push(text);drainSpeechQueue()}

async function drainSpeechQueue(){
  if(S.speaking||!S.speechQueue.length)return;
  S.speaking=true; const text=S.speechQueue.shift();
  $('#orb').classList.add('speaking'); $('#hostState').textContent='Đang nói tiếng Việt…';
  try{
    if(S.ttsEngine==='openai')await speakOpenAI(text);else await speakBrowserVietnamese(text);
    S.spoken++; metrics(); log(`Đã đọc: ${text}`);
  }catch(e){
    console.error(e); toast(e.message||'Không phát được giọng đọc.',false);
    $('#soundWarning').classList.add('show');
  }finally{
    $('#orb').classList.remove('speaking'); $('#hostState').textContent=S.running?'AI host đang trực':'Đang chờ bắt đầu'; S.speaking=false; drainSpeechQueue();
  }
}

async function speakOpenAI(text){
  const headers={'Content-Type':'application/json'}; if(S.key)headers['x-session-ai-key']=S.key;
  const r=await fetch('/api/tts',{method:'POST',headers,body:JSON.stringify({text,voice:S.ttsVoice})});
  if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||'TTS tiếng Việt chưa sẵn sàng')}
  const blob=await r.blob(); if(S.currentUrl)URL.revokeObjectURL(S.currentUrl); S.currentUrl=URL.createObjectURL(blob);
  if(S.audio){S.audio.pause();S.audio=null}
  const audio=new Audio(S.currentUrl); S.audio=audio; audio.playbackRate=S.rate;
  await new Promise((resolve,reject)=>{audio.onended=resolve;audio.onerror=()=>reject(new Error('Không phát được audio tiếng Việt'));const p=audio.play();if(p&&p.catch)p.catch(()=>reject(new Error('Trình duyệt đang chặn âm thanh. Bấm “Bật âm thanh” một lần rồi thử lại.')))});
}

async function speakBrowserVietnamese(text){
  if(!('speechSynthesis'in window))throw new Error('Trình duyệt không hỗ trợ giọng đọc.');
  const voices=speechSynthesis.getVoices();
  const vi=voices.filter(v=>String(v.lang||'').toLowerCase().startsWith('vi'));
  if(!vi.length)throw new Error('Máy này không có giọng Việt cục bộ. Hãy dùng OpenAI TTS để tránh giọng tiếng Anh.');
  const selected=vi.find(v=>v.name===S.browserVoice)||vi.find(v=>/hoai|nam|minh|viet|vietnam/i.test(v.name))||vi[0];
  speechSynthesis.cancel();
  await new Promise((resolve,reject)=>{const u=new SpeechSynthesisUtterance(text);u.voice=selected;u.lang='vi-VN';u.rate=S.rate;u.onend=resolve;u.onerror=()=>reject(new Error('Lỗi giọng đọc tiếng Việt cục bộ'));speechSynthesis.speak(u)});
}

function stopAllSpeech(){S.speechQueue=[];if(S.audio){S.audio.pause();S.audio=null}if('speechSynthesis'in window)speechSynthesis.cancel();S.speaking=false;$('#orb').classList.remove('speaking')}

async function unlockAudio(showToast){
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(AudioCtx){const ctx=new AudioCtx();await ctx.resume();const osc=ctx.createOscillator(),gain=ctx.createGain();gain.gain.value=0;osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.02);setTimeout(()=>ctx.close(),80)}
    S.audioUnlocked=true; $('#soundWarning').classList.remove('show'); if(showToast)toast('Âm thanh đã được kích hoạt.');
  }catch{if(showToast)toast('Không kích hoạt được âm thanh trên trình duyệt này.',false)}
}

function refreshVoices(){
  if(!('speechSynthesis'in window))return;
  const vi=speechSynthesis.getVoices().filter(v=>String(v.lang||'').toLowerCase().startsWith('vi'));
  $('#browserVoice').innerHTML=vi.length?vi.map(v=>`<option value="${esc(v.name)}">${esc(v.name)} — ${esc(v.lang)}</option>`).join(''):'<option value="">Không có giọng Việt trên máy</option>';
  if(vi.length){S.browserVoice=vi.some(v=>v.name===S.browserVoice)?S.browserVoice:vi[0].name;$('#browserVoice').value=S.browserVoice}
  $('#localVoiceStatus').textContent=vi.length?`${vi.length} giọng Việt khả dụng`:'Không có giọng Việt local — nên dùng OpenAI TTS';
}
if('speechSynthesis'in window)speechSynthesis.onvoiceschanged=refreshVoices;

function metrics(){$('#mComments').textContent=S.comments.length;$('#mIntent').textContent=S.comments.filter(x=>x.intent).length;$('#mSpoken').textContent=S.spoken}

function renderProducts(){
  const r=$('#productList');
  r.innerHTML=S.products.length?S.products.map(p=>`<div class="product-item ${p.id===S.active?'active':''}" data-id="${esc(p.id)}"><b>${esc(p.name)}</b><span>${esc(p.price||'')}</span><small>${esc((p.benefits||'').split('\n')[0]||'Chưa có mô tả')}</small></div>`).join(''):'<div class="empty">Chưa có sản phẩm.</div>';
  $$('.product-item',r).forEach(e=>e.onclick=()=>editProduct(e.dataset.id));
  $('#scriptProduct').innerHTML=S.products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join(''); syncProduct();
}

function editProduct(id){S.edit=id;S.active=id;localStorage.setItem('pl_active',id);const p=S.products.find(x=>x.id===id);$('#pName').value=p.name||'';$('#pPrice').value=p.price||'';$('#pOffer').value=p.offer||'';$('#pBenefits').value=p.benefits||'';$('#pAudience').value=p.audience||'';$('#pGuard').value=p.guard||'';renderProducts()}
function newProduct(){S.edit=null;['pName','pPrice','pOffer','pBenefits','pAudience','pGuard'].forEach(id=>$('#'+id).value='');$('#pName').focus()}
function saveProduct(){const name=$('#pName').value.trim();if(!name)return toast('Nhập tên sản phẩm trước.',false);const p={id:S.edit||('p'+Date.now()),name,price:$('#pPrice').value.trim(),offer:$('#pOffer').value.trim(),benefits:$('#pBenefits').value.trim(),audience:$('#pAudience').value.trim(),guard:$('#pGuard').value.trim()};const i=S.products.findIndex(x=>x.id===p.id);i>=0?S.products[i]=p:S.products.push(p);S.edit=p.id;S.active=p.id;persistProducts();renderProducts();toast('Đã lưu sản phẩm và cập nhật dữ liệu cho AI.')}
function deleteProduct(){if(!S.edit)return toast('Chọn sản phẩm cần xóa.',false);S.products=S.products.filter(x=>x.id!==S.edit);S.active=S.products[0]?.id||null;S.edit=null;persistProducts();renderProducts();newProduct();toast('Đã xóa sản phẩm.')}
function persistProducts(){localStorage.setItem('pl_products',JSON.stringify(S.products));localStorage.setItem('pl_active',S.active||'')}
function syncProduct(){const p=activeProduct();$('#activeProductName').textContent=p?.name||'Chưa có sản phẩm';$('#activeProductPrice').textContent=p?`${p.price||'Chưa nhập giá'} · ${p.offer||'Chưa nhập ưu đãi'}`:'Thêm dữ liệu để AI không bịa.'}

async function makeScript(){
  const p=S.products.find(x=>x.id===$('#scriptProduct').value)||activeProduct(); if(!p)return toast('Hãy thêm sản phẩm trước.',false);
  $('#scriptOut').textContent='AI đang tạo kịch bản…';
  const prompt=`Viết kịch bản livestream TikTok bằng tiếng Việt.\n${context(p)}\nMục tiêu: ${$('#scriptGoal').value}. Cấu trúc HOOK, DEMO/ĐIỂM NỔI BẬT, XỬ LÝ LĂN TĂN, CTA. Lời nói tự nhiên, không bịa, không tạo khan hiếm giả, không ép mua.`;
  const out=await ai(prompt,'script');
  $('#scriptOut').textContent=out||`HOOK\n“Bạn nào đang cần ${p.name.toLowerCase()} thì xem mình demo nhanh nhé.”\n\nĐIỂM NỔI BẬT\n${(p.benefits||'').split('\n').filter(Boolean).map((x,i)=>`${i+1}. ${x}`).join('\n')||'Bổ sung điểm nổi bật trong kho sản phẩm.'}\n\nCTA\n“Thấy phù hợp thì bạn kiểm tra đúng phân loại và giá đang hiển thị trước khi đặt nha.”`;
}

async function ai(prompt,purpose='general'){
  if(S.provider==='demo')return null;
  try{
    const headers={'Content-Type':'application/json'}; if(S.key)headers['x-session-ai-key']=S.key;
    const r=await fetch('/api/chat',{method:'POST',headers,body:JSON.stringify({provider:S.provider,model:S.model,prompt,purpose})});
    const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||'AI API error'); return String(d.text||'').trim();
  }catch(e){console.error(e);toast(`AI chưa sẵn sàng: ${e.message}`,false);return null}
}

async function testAI(){
  if(S.provider==='demo')return toast('Bạn đang ở Demo. Chọn OpenAI để test key Vercel.');
  const out=await ai('Trả lời đúng một câu ngắn bằng tiếng Việt để xác nhận hệ thống AI đang hoạt động.','assistant');
  toast(out?'AI hoạt động: '+out:'Chưa kết nối được AI.',!!out);
}

async function healthCheck(){
  try{const r=await fetch('/api/health',{cache:'no-store'});if(r.ok){$('#backendStatus').textContent='Backend OK';$('#backendStatus').classList.add('good')}}catch{$('#backendStatus').textContent='Backend chưa kết nối';$('#backendStatus').classList.add('warn')}
}

function syncSettings(){
  $('#provider').value=S.provider; $('#model').value=S.model; $('#apiKey').value=S.key; $('#rate').value=S.rate; $('#rateVal').textContent=S.rate.toFixed(2)+'×';
  $('#ttsEngine').value=S.ttsEngine; $('#ttsVoice').value=S.ttsVoice;
  $('#ttMode').value=sessionStorage.getItem('pl_tt_mode')||'demo'; $('#ttClient').value=sessionStorage.getItem('pl_tt_client')||''; $('#ttToken').value=sessionStorage.getItem('pl_tt_token')||'';
  updateKeyStatus(); syncTTSStatus();
}
function updateKeyStatus(){const e=$('#keyStatus');e.textContent=S.provider==='demo'?'Demo offline':S.key?'Key trong tab':'Dùng key Vercel';e.className='chip '+(S.provider==='demo'?'':'good')}
function syncTTSStatus(){$('#ttsStatus').textContent=S.ttsEngine==='openai'?'OpenAI TTS — tiếng Việt tự nhiên':'Giọng Việt của trình duyệt'}

document.addEventListener('DOMContentLoaded',load);
