module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  // Placeholder endpoint for an authorized TikTok integration.
  // Before production, add TikTok signature verification according to the exact
  // product/webhook your approved developer app receives. Do not process or
  // trust arbitrary public payloads here.
  const event=req.body||{};
  console.log('TikTok webhook received', {event:event?.event||'unknown', create_time:event?.create_time||null});
  return res.status(200).json({received:true});
}
