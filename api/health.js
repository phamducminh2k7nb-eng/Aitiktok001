module.exports = function handler(req,res){
  res.status(200).json({
    ok:true,
    service:'lion-ai',
    ai:{openai:Boolean(process.env.OPENAI_API_KEY),gemini:Boolean(process.env.GEMINI_API_KEY)},
    tts:{openai:Boolean(process.env.OPENAI_API_KEY)},
    tiktok:{configured:Boolean(process.env.TIKTOK_CLIENT_KEY)}
  });
}
