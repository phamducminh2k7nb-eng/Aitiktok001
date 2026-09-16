# PrismLive AI — TikTok Live Commerce Studio

A dark, multicolor AI livestream sales dashboard designed for TikTok live-commerce workflows.

## What already works

- Polished responsive dark UI using palette: `#07070A`, `#111118`, `#FFFFFF`, `#25F4EE`, `#8B5CF6`, `#FE2C55`, `#3B82F6`.
- Demo LIVE comment feed with purchase-intent comments.
- AI reply composer with friendly / energetic / premium tones.
- Browser text-to-speech fallback (works without a paid TTS key on supported browsers).
- Product truth source: price, offers, benefits, audience, guardrails.
- AI script generator and sales-copilot chat.
- Session history and human-approval mode.
- OpenAI and Gemini serverless adapters in `/api/chat.js`.
- API keys are never committed. You can enter a key for the current browser tab or use Vercel environment variables.
- TikTok webhook placeholder is intentionally authorization-first; no unofficial scraper is included.

## Test locally

Because the frontend is static, you can open `index.html` to test Demo mode. Serverless `/api/*` endpoints require a Vercel-compatible dev environment/deployment.

## Deploy on Vercel

1. Import this GitHub repository into Vercel.
2. No build command is required for the static frontend.
3. Add one AI provider key under Project > Settings > Environment Variables:
   - `OPENAI_API_KEY` and optionally `OPENAI_MODEL`
   - OR `GEMINI_API_KEY` and optionally `GEMINI_MODEL`
4. Deploy.
5. In the website Settings, choose the matching provider. If the server environment already has the key, the browser key field may stay empty.

## TikTok integration

The public TikTok developer platform requires authorized access/review for APIs and SDK integrations. LIVE-comment ingestion availability depends on the exact TikTok developer product/partner access granted to your app. This project therefore exposes a safe adapter boundary instead of installing an unofficial scraping dependency.

When your TikTok app is approved and you know the exact LIVE event/API contract you have access to, implement it behind `/api/tiktok-webhook.js` or a dedicated connector service and keep client secrets server-side.

## Security notes

- Never commit `.env` files or real keys.
- Session key entry is for the operator's current tab only (`sessionStorage`).
- For a public production dashboard, add authentication before enabling server-side shared AI keys.
- Verify TikTok webhook signatures before trusting events in production.
- Human approval is enabled by default to reduce accidental on-air output.

## AI persona

The server prompt tells the model to be natural, concise, tactful, not pushy, and to avoid inventing prices, promotions, inventory, specifications, warranties or product claims. Product data comes from the catalog you enter in the UI.
