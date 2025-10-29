# 🔧 Branch Protection Sorunu - Çözüm

## ✅ Durum

Repository-level rulesets yok ama hala "Cannot create ref" hatası alıyoruz.

Bu şu anlama gelir:
1. **Branch protection rules** (eski yöntem) aktif VEYA
2. **Organization-level rulesets** aktif

## 🔍 Kontrol 1: Branch Protection Rules

### Adım 1: Branch Protection Ayarlarına Git

**Direkt link:** https://github.com/getgrowly/s3-browser/settings/branches

### Ne Göreceksiniz?

**Eğer "Branch protection rules" bölümü varsa:**
```
Branch protection rules
├─ main (veya master)
   └─ [Edit] [Delete]
```

### Çözüm: GitHub App'e İzin Ver

1. **"main"** branch'in yanındaki **"Edit"** butonuna tıklayın

2. En aşağıya kaydırın

3. **"Allow specified actors to bypass required pull requests"**
   - ✅ Bu kutuyu işaretleyin

4. **"Add bypass"** butonuna tıklayın
   - "Apps" sekmesine geçin
   - GitHub App'inizin adını seçin

5. **"Save changes"** butonuna tıklayın

## 🔍 Kontrol 2: Organization Rulesets

Eğer branch protection yoksa, organization seviyesinde ruleset olabilir.

### Adım 1: Organization Rulesets'e Git

**Link:** https://github.com/organizations/getgrowly/settings/rules

⚠️ **Not:** Organization owner/admin olmanız gerekiyor.

### Adım 2: Aktif Rulesets'leri Kontrol Et

Eğer "s3-browser" repository'sine uygulanan bir ruleset görüyorsanız:

1. O ruleset'e tıklayın
2. **"Bypass list"** bölümünü bulun
3. **"Add bypass"** → GitHub App'inizi ekleyin
4. **"Save changes"**

## 🔍 Kontrol 3: GitHub App Permissions

GitHub App'inize **"Administration"** izni vermek de sorunu çözebilir.

### Adım 1: GitHub App Ayarlarına Git

**Link:** https://github.com/settings/apps

### Adım 2: App'inize Tıklayın

"Permissions & events" sekmesine gidin

### Adım 3: Administration İznini Ekleyin

**Repository permissions:**
- **Administration:** "Read and write" yapın

⚠️ **Önemli:** Daha geniş bir izin. İlk iki yöntemi deneyin önce.

### Adım 4: Kaydet ve Onayla

1. **"Save changes"**
2. Repository'ye gidin: https://github.com/getgrowly/s3-browser/installations
3. **"Accept new permissions"** butonuna tıklayın

## 🎯 Hangi Yöntem Daha İyi?

| Yöntem | Güvenlik | Kolay mı? | Önerilen |
|--------|----------|-----------|----------|
| Branch Protection + Bypass | 🟢 Yüksek | ✅ Kolay | ⭐ #1 |
| Org Rulesets + Bypass | 🟢 Yüksek | ✅ Kolay | ⭐ #2 |
| Administration izni | 🟡 Orta | ✅ En kolay | 🔄 Alternatif |

## 📋 Adım Adım Test

Hangisinin sorununuz olduğunu anlamak için:

### 1. Branch Protection Kontrolü

```bash
# Repository ayarlarına git:
https://github.com/getgrowly/s3-browser/settings/branches

# "Branch protection rules" var mı?
```

**✅ Varsa:** Branch Protection + Bypass yöntemini kullan
**❌ Yoksa:** Adım 2'ye geç

### 2. Organization Rulesets Kontrolü

```bash
# Organization ayarlarına git:
https://github.com/organizations/getgrowly/settings/rules

# "Repository rulesets" var mı?
# s3-browser'a uygulanan var mı?
```

**✅ Varsa:** Org Rulesets + Bypass yöntemini kullan
**❌ Yoksa:** Adım 3'e geç

### 3. Administration İzni Ver

En kolay ama en geniş izin:

```bash
# GitHub App ayarlarına git:
https://github.com/settings/apps → Your App

# Permissions & events → Repository permissions
# Administration: "Read and write" yap
```

## 🧪 Test Et

Ayarları yaptıktan sonra:

```bash
# Workflow'u yeniden çalıştır
# veya
git pull
git commit -m "test: verify GitHub App bypass" --allow-empty
git push
```

Artık çalışmalı! 🎉

## ✅ Başarı Göstergeleri

Başarılı olduğunda göreceğiniz:

```
✅ Generate GitHub App Token - Success
✅ Using: GitHub App Token
✅ Create release for pull #3
✅ Tag created: v1.0.2
✅ Release published: v1.0.2
```

## ❓ Hala Çalışmazsa

### Seçenek 1: PR'ı Manuel Merge Et

En basit geçici çözüm:

1. PR #3'ü manuel merge edin: https://github.com/getgrowly/s3-browser/pull/3
2. Workflow otomatik olarak release oluşturacak

### Seçenek 2: PAT Token Kullan

GitHub App yerine Personal Access Token:

1. PAT oluştur: https://github.com/settings/tokens/new
   - `repo` + `workflow` + `admin:repo_hook` izinleri
2. Secret olarak ekle: `RELEASE_PLEASE_TOKEN`
3. Workflow otomatik PAT'i kullanacak

## 🎊 Özet

**Sorun:** Branch protection veya org rulesets GitHub App'i engelliyor

**Olası Çözümler:**
1. ✅ Branch protection → Add bypass
2. ✅ Org rulesets → Add bypass
3. ✅ Administration permission ver
4. 🔄 Manual merge yap
5. 🔄 PAT kullan

Her durumda bir çözümü var! 🚀
