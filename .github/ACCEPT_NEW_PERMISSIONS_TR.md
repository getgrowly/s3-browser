# 🔧 GitHub App Yeni İzinleri Kabul Etme

## ⚠️ ÖNEMLİ: İzin Güncellemesi Sonrası Yapılması Gereken

GitHub App'e yeni izinler eklediğinizde (örn: Administration), bu izinlerin **repository tarafından kabul edilmesi** gerekiyor!

## 📋 Adım Adım İzin Kabul Etme

### Yöntem 1: Repository Settings Üzerinden

1. **Repository ayarlarına gidin:**
   ```
   https://github.com/getgrowly/s3-browser/settings/installations
   ```

2. **Pending permission update** uyarısı görüyor musunuz?
   - ✅ **Görüyorsanız:** "Review" veya "Accept new permissions" butonuna tıklayın
   - ❌ **Görmüyorsanız:** Yöntem 2'yi deneyin

### Yöntem 2: GitHub App Settings Üzerinden

1. **GitHub App ayarlarına gidin:**
   ```
   https://github.com/settings/apps
   ```

2. **App'inize tıklayın** → Sol menüden **"Install App"** sekmesine gidin

3. **"getgrowly" organization'ını** bulun → ⚙️ **Configure** butonuna tıklayın

4. **Sayfanın üstünde** sarı bir banner görüyor musunuz?
   ```
   ⚠️ This installation has pending permission requests
   [Review permissions]
   ```

5. **"Review permissions"** veya **"Accept new permissions"** butonuna tıklayın

6. İzinleri gözden geçirin ve **"Accept new permissions"** onaylayın

## ✅ Doğrulama

İzinleri kabul ettikten sonra:

```bash
# Workflow'u yeniden çalıştırın
# GitHub Actions → Son run → "Re-run all jobs"
```

Veya yeni bir commit push edin:

```bash
git commit -m "test: verify Administration permission accepted" --allow-empty
git push
```

## 🔍 Hala Çalışmıyor mu?

Eğer izinleri kabul ettiyseniz ama hala "Cannot create ref" hatası alıyorsanız:

### Kontrol 1: Branch Protection Rules

Administration izni bile olsa, branch protection rules'da **bypass list**'e eklenmeniz gerekebilir.

**Adımlar:**
1. Git: https://github.com/getgrowly/s3-browser/settings/branches
2. **"Branch protection rules"** bölümünde **"main"** var mı?
3. Varsa → **"Edit"** → Aşağı kaydır
4. **"Allow specified actors to bypass required pull requests"**
   - ✅ Bu kutuyu işaretle
   - **"Add bypass"** → **"Apps"** sekmesi → GitHub App'inizi seçin
5. **"Save changes"**

### Kontrol 2: Organization Rulesets

Organization-level rulesets varsa, orada da bypass gerekebilir.

**Adımlar (Org admin gerekli):**
1. Git: https://github.com/organizations/getgrowly/settings/rules
2. **s3-browser**'a uygulanan bir rule var mı?
3. Varsa → O rule'a tıkla → **"Bypass list"** bölümü
4. **"Add bypass"** → **"Repository apps"** → GitHub App'inizi ekleyin
5. **"Save changes"**

## 🎯 Hangi Durumdasınız?

### ✅ Durum 1: Sarı banner gördüm ve "Accept" tıkladım
→ Artık çalışmalı! Workflow'u yeniden çalıştırın.

### ⚠️ Durum 2: Sarı banner yok ama hala hata alıyorum
→ Branch protection rules veya org rulesets kontrol edin (yukarıda)

### ❌ Durum 3: Hiçbir sarı banner göremedim
→ App doğru install edilmemiş olabilir. Kontrol için:
   - https://github.com/settings/apps
   - Install App → getgrowly org → s3-browser seçili mi?

## 🔍 Mevcut Durumu Kontrol Et

Terminalde şunu çalıştırabilirsiniz:

```bash
# GitHub CLI ile app installation kontrol
gh api /repos/getgrowly/s3-browser/installation --jq '.permissions'
```

Bu komut mevcut izinleri gösterir. **"administration": "write"** görmelisiniz.

## 📞 Debug Bilgisi

Hala çalışmazsa, şu bilgileri paylaşın:

1. **Sarı banner gördünüz mü?** (Evet/Hayır)
2. **"Accept new permissions" tıkladınız mı?** (Evet/Hayır)
3. **Branch protection rules var mı?** (https://github.com/getgrowly/s3-browser/settings/branches)
4. **Son workflow error'u nedir?** (GitHub Actions → Latest run → Error mesajı)

Bu bilgilerle tam olarak nerede takıldığınızı bulabiliriz!

## 🎊 Özet

**Administration permission ekledikten sonra:**
1. ✅ Repository'de "Accept new permissions" yapın (ZORUNLU)
2. ✅ Branch protection varsa bypass list'e ekleyin (gerekebilir)
3. ✅ Org rulesets varsa bypass list'e ekleyin (gerekebilir)
4. ✅ Workflow'u yeniden çalıştırın

Administration permission güçlü bir izin - genellikle bu yeterli oluyor! 🚀
