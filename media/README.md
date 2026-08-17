# Medya dosyaları

Karşılama videonuzu (örn. işletmenizin drone çekimi) bu klasöre koyun, GitHub'a push edin, sonra admin panelinde
**Ayarlar > Karşılama Videosu** alanına dosya adını yazın:

```
media/hero.mp4
```

Firebase Storage/Blaze planına ihtiyaç yoktur — video, sitenin geri kalanıyla birlikte GitHub'dan/GitHub Pages'ten servis edilir.

**Öneriler:**
- Dosya adını sade tutun (boşluksuz, Türkçe karakter olmadan): `hero.mp4`
- Format: `.mp4` (H.264) en uyumlusu; `.webm` de desteklenir.
- Boyut: mobil QR taramasında hızlı açılması için videoyu **10-20 saniyelik bir döngü** ve **~15-25 MB altında** tutacak şekilde sıkıştırın (HandBrake gibi ücretsiz bir araçla). Ham drone çekimi genelde çok büyük ve yavaş yüklenir.
- GitHub tekil dosyalarda 100 MB sınırı koyar; pratikte çok daha küçük tutmanız hem yükleme hem de ziyaretçi deneyimi için gerekir.
