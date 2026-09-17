const MAX_PROMPT_CHARS = 7000;

const BASE_INSTRUCTIONS = `Bạn là Lion AI, trợ lý bán hàng livestream tiếng Việt.
Mục tiêu: trả lời tự nhiên, duyên, ngắn gọn, hữu ích và tôn trọng quyền quyết định của khách.
Phong cách: nói như một host livestream giỏi, thân thiện, biết bắt ý, biết hỏi lại khi thiếu thông tin, xử lý chê giá mềm mại và không nói kiểu robot.
Quy tắc bắt buộc:
- Không bịa giá, ưu đãi, tồn kho, bảo hành, thông số, công dụng hoặc chứng nhận.
- Chỉ dùng dữ liệu sản phẩm được cung cấp. Nếu thiếu, nói khéo rằng cần kiểm tra hoặc hỏi lại.
- Không tạo khan hiếm giả, áp lực giả, lời hứa tuyệt đối hay so sánh thiếu căn cứ.
- Không ép mua; ưu tiên giúp khách chọn đúng nhu cầu.
- Nếu khách hỏi trực tiếp, phải nói rõ đây là trợ lý AI hỗ trợ livestream.
- Tránh spam, công kích, kỳ thị, nội dung tình dục, nguy hiểm hoặc tư vấn chuyên môn vượt quá dữ liệu.
- Với phản hồi LIVE, ưu tiên 1-2 câu, dễ đọc thành tiếng, thường khoảng 20-40 từ.
- Biết dùng lời chuyển ý tự nhiên, gợi mở nhu cầu và CTA mềm.
- Không lặp lại nguyên văn bình luận của khách nếu không cần thiết.
- Nếu khách do dự, hãy thể hiện sự quan tâm và tư vấn thật thay vì cố chốt đơn bằng mọi giá.`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { provider='openai', model, prompt='', purpose='general' } = req.body || {};
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt' });
    if (prompt.length > MAX_PROMPT_CHARS) return res.status(413).json({ error: 'Prompt too large' });

    const sessionKey = req.headers['x-session-ai-key'];
    if (provider === 'openai') {
      const key = sessionKey || process.env.OPENAI_API_KEY;
      if (!key) return res.status(401).json({ error: 'Missing OpenAI API key' });
      const selectedModel = sanitizeModel(model) || process.env.OPENAI_MODEL || 'gpt-5.6-luna';
      const text = await callOpenAI({ key, model:selectedModel, prompt, purpose });
      return res.status(200).json({ text, provider:'openai', model:selectedModel });
    }
    if (provider === 'gemini') {
      const key = sessionKey || process.env.GEMINI_API_KEY;
      if (!key) return res.status(401).json({ error: 'Missing Gemini API key' });
      const selectedModel = sanitizeModel(model) || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
      const text = await callGemini({ key, model:selectedModel, prompt, purpose });
      return res.status(200).json({ text, provider:'gemini', model:selectedModel });
    }
    return res.status(400).json({ error: 'Unsupported provider' });
  } catch (error) {
    console.error('chat error', error);
    const status = error?.status && Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({ error: safeMessage(error) });
  }
}

async function callOpenAI({key,model,prompt,purpose}){
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 25000);
  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method:'POST', signal:controller.signal,
      headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model,
        instructions: BASE_INSTRUCTIONS + purposeInstruction(purpose),
        input: prompt,
        max_output_tokens: purpose==='script' ? 900 : 320
      })
    });
    const data = await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(data?.error?.message||`OpenAI HTTP ${r.status}`);e.status=r.status;throw e;}
    return extractOpenAIText(data) || 'Mình chưa nhận được nội dung trả lời.';
  } finally { clearTimeout(timeout); }
}

async function callGemini({key,model,prompt,purpose}){
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 25000);
  try {
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const r=await fetch(url,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({
      systemInstruction:{parts:[{text:BASE_INSTRUCTIONS+purposeInstruction(purpose)}]},
      contents:[{role:'user',parts:[{text:prompt}]}],
      generationConfig:{maxOutputTokens:purpose==='script'?900:320,temperature:.75}
    })});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(data?.error?.message||`Gemini HTTP ${r.status}`);e.status=r.status;throw e;}
    return data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim() || 'Mình chưa nhận được nội dung trả lời.';
  } finally { clearTimeout(timeout); }
}

function purposeInstruction(purpose){
  if(purpose==='live_reply') return '\nNgữ cảnh hiện tại: trả lời bình luận trực tiếp trên livestream. Ưu tiên 20-40 từ nếu đủ ý.';
  if(purpose==='script') return '\nNgữ cảnh hiện tại: soạn kịch bản livestream. Có thể dài hơn nhưng phải nói được thành lời, tránh văn viết cứng.';
  if(purpose==='assistant') return '\nNgữ cảnh hiện tại: tư vấn cho người vận hành livestream. Có thể giải thích chiến thuật rõ hơn.';
  return '';
}
function sanitizeModel(v){return typeof v==='string'&&/^[a-zA-Z0-9._-]{2,80}$/.test(v)?v:null;}
function extractOpenAIText(data){
  if(typeof data.output_text==='string') return data.output_text.trim();
  const chunks=[];
  for(const item of data.output||[]) for(const c of item.content||[]) if(typeof c.text==='string') chunks.push(c.text);
  return chunks.join('\n').trim();
}
function safeMessage(error){
  if(error?.name==='AbortError') return 'AI request timed out';
  return String(error?.message||'Unexpected server error').slice(0,300);
}
