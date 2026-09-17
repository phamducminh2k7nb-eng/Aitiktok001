(function(){
  const state={voices:[],selectedName:localStorage.getItem('lion_browser_voice')||''};
  function normalize(v){return String(v||'').toLowerCase().replace('_','-')}
  function isVietnameseVoice(v){const lang=normalize(v.lang),name=normalize(v.name);return lang==='vi'||lang.startsWith('vi-')||/vietnam|vietnamese|hoai|namminh/.test(name)}
  function load(){if(!('speechSynthesis'in window)){state.voices=[];return []}state.voices=speechSynthesis.getVoices().filter(isVietnameseVoice);return state.voices}
  function best(){load();return state.voices.find(v=>v.name===state.selectedName)||state.voices.find(v=>normalize(v.lang)==='vi-vn')||state.voices[0]||null}
  function setSelected(name){state.selectedName=name||'';localStorage.setItem('lion_browser_voice',state.selectedName)}
  function speak(text,rate=1){return new Promise((resolve,reject)=>{if(!('speechSynthesis'in window))return reject(new Error('Thiết bị không hỗ trợ Web Speech'));const voice=best();if(!voice)return reject(new Error('Không tìm thấy giọng tiếng Việt'));speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.voice=voice;u.lang=voice.lang||'vi-VN';u.rate=Number(rate)||1;u.onend=()=>resolve(voice);u.onerror=e=>reject(new Error(e.error||'Không phát được giọng Việt'));speechSynthesis.speak(u)})}
  window.LionVietnameseVoices={load,best,setSelected,speak,getAll:()=>state.voices.slice(),isVietnameseVoice};
  if('speechSynthesis'in window){speechSynthesis.onvoiceschanged=()=>{load();window.dispatchEvent(new CustomEvent('lionvoiceschanged'))};setTimeout(load,250)}
})();
