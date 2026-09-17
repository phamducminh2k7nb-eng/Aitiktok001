const MAX_TEXT_CHARS = 1800;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text = '', voice = 'coral' } = req.body || {};
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Missing text' });
    if (text.length > MAX_TEXT_CHARS) return res.status(413).json({ error: 'Text too long' });

    const sessionKey = req.headers['x-session-ai-key'];
    const key = sessionKey || process.env.OPENAI_API_KEY;
    if (!key) return res.status(401).json({ error: 'Missing OpenAI API key' });

    const selectedVoice = /^[a-zA-Z0-9_-]{2,40}$/.test(voice) ? voice : 'coral';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          voice: selectedVoice,
          input: text,
          instructions: 'Nói tiếng Việt tự nhiên, rõ ràng, giọng trung tính miền Bắc, ấm áp và thân thiện như một host livestream bán hàng chuyên nghiệp. Không đọc theo giọng tiếng Anh. Nhịp nói vừa phải, có cảm xúc nhẹ, không cường điệu.',
          response_format: 'mp3'
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data?.error?.message || `OpenAI TTS HTTP ${response.status}`;
        return res.status(response.status).json({ error: String(message).slice(0, 300) });
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', String(buffer.length));
      return res.status(200).send(buffer);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('tts error', error);
    if (error?.name === 'AbortError') return res.status(504).json({ error: 'TTS request timed out' });
    return res.status(500).json({ error: String(error?.message || 'Unexpected TTS error').slice(0, 300) });
  }
};
