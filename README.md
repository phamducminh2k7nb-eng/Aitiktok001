# Lion AI — AI đồng hành bán hàng live

Lion AI là dashboard AI livestream bán hàng theo hướng tối giản, sáng, dễ dùng và ưu tiên trải nghiệm người dùng.

## Tính năng chính

- Light Mode mặc định + Dark Mode.
- Giao diện đen/trắng với điểm nhấn gradient: `#00C2FF`, `#4F8CFF`, `#7C5CFF`, `#D946EF`, `#FF5E8A`.
- Live Studio với chế độ duyệt tay hoặc tự động + đọc.
- Demo comment để test toàn bộ luồng khi TikTok chưa kết nối.
- AI trả lời comment bằng tiếng Việt theo hướng tự nhiên, khéo, không ép mua và không bịa thông tin sản phẩm.
- OpenAI TTS server-side qua `/api/tts` và fallback chỉ sang voice tiếng Việt `vi*` trên trình duyệt.
- Kho sản phẩm: tên, giá, ưu đãi, khách phù hợp, điểm nổi bật và guardrails.
- Lịch sử chat lưu tối đa 50 hội thoại gần nhất bằng `localStorage`.
- Tự động xếp hàng phát giọng để tránh phát chồng audio.
- OpenAI/Gemini adapter trong `/api/chat.js`.
- Health endpoint trong `/api/health.js`.
- TikTok adapter theo hướng authorization-first; không dùng scraper không chính thức.

## Biến môi trường Vercel

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash

TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=
```

Không commit file `.env` hoặc key thật lên GitHub.

## Deploy

1. Import repo này vào Vercel.
2. Không cần build command cho frontend tĩnh.
3. Thêm biến môi trường ở Project → Settings → Environment Variables.
4. Redeploy.
5. Test `/api/health`, sau đó mở giao diện Lion AI và bấm `Test AI`.

## TikTok

Khi chưa có kết nối TikTok được cấp quyền, Lion AI vẫn chạy đầy đủ ở Demo Mode. Khi có quyền/API phù hợp, tích hợp phía server qua adapter/webhook và giữ `client secret` ở server.

## Persona AI

Lion AI phải:
- nói tiếng Việt tự nhiên, ngắn gọn, thân thiện;
- ưu tiên 1–2 câu cho phản hồi LIVE;
- không bịa giá, tồn kho, bảo hành, freeship, thông số hoặc ưu đãi;
- không tạo khan hiếm giả;
- không ép mua;
- ưu tiên giúp khách chọn đúng nhu cầu.
