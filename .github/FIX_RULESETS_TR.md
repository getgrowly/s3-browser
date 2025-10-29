# 🔧 Repository Rulesets Sorunu - Çözüm

## ✅ İyi Haber

GitHub App token başarıyla oluşturuluyor! 🎉

Gördüğümüz log:
```
Using: GitHub App Token ✅
```

## ❌ Sorun

Ama GitHub App'in repository rulesets'leri bypass etme izni yok:

```
Error: pre_receive Repository rule violations found
Cannot create ref due to creations being restricted
```

## 🎯 Çözüm: 2 Seçenek

### Seçenek 1: GitHub App'e Bypass İzni Ver (ÖNERİLEN)

#### Adım 1: Repository Rulesets'e Git

**Direkt link:** https://github.com/getgrowly/s3-browser/settings/rules

#### Adım 2: Aktif Rule'u Bul ve Düzenle

1. Muhtemelen **"main" branch** için bir rule var
2. O rule'un yanındaki **"Edit"** butonuna tıklayın

#### Adım 3: Bypass Actors Ekle

1. Sayfayı aşağı kaydırın
2. **"Bypass list"** bölümünü bulun
3. **"Add bypass"** butonuna tıklayın
4. Dropdown'dan şunlardan birini seçin:
   - **"Repository apps"** → GitHub App'inizin adını seçin
   veya
   - **"Deploy keys"** → `github-actions[bot]` ekleyin

#### Adım 4: Kaydet

- **"Save changes"** butonuna tıklayın
- Değişiklik hemen aktif olacak

### Seçenek 2: GitHub App'e Administration İzni Ver

Bu daha geniş bir izin ama bazı durumlarda gerekli olabilir.

#### Adım 1: GitHub App Ayarlarına Git

**Link:** https://github.com/settings/apps

#### Adım 2: App'inize Tıklayın

"Permissions & events" sekmesine gidin

#### Adım 3: Repository Permissions Güncelleyin

**Administration:** "Read-only" veya "Read and write" yapın

⚠️ **Dikkat:** Bu daha geniş bir izin. Seçenek 1 daha güvenli.

#### Adım 4: Kaydet ve Onayla

1. "Save changes"
2. Repository'de "Accept new permissions" yapın

## 🔍 Repository Rulesets Nedir?

Repository rulesets, branch protection'ın yeni ve daha güçlü versiyonu:

- ✅ Daha esnek
- ✅ Birden fazla branch'e uygulanabilir
- ✅ Daha detaylı kontrol
- ⚠️ Ama bypass etmek için açıkça izin verilmesi gerekiyor

## 📊 Nasıl Kontrol Ederim?

### Mevcut Rulesets'leri Görmek İçin:

1. **Repository → Settings → Rules**
2. "Rulesets" sekmesine bakın
3. Aktif rule'ları göreceksiniz

### Bypass List'e Bakmak İçin:

1. Rule'a tıklayın
2. "Bypass list" bölümünü bulun
3. GitHub App'iniz listede mi?

## ✅ Doğrulama

Ayarları yaptıktan sonra:

```bash
# Workflow'u yeniden çalıştır
# GitHub Actions → Son run → "Re-run all jobs"
```

veya

```bash
# Yeni bir commit push et
git commit -m "test: verify GitHub App bypass works" --allow-empty
git push
```

Artık başarılı olmalı! 🎉

## 🎯 Beklenen Sonuç

Başarılı olduğunda:

```
✅ Generate GitHub App Token - Success
✅ Using: GitHub App Token
✅ Create release PR - Success
✅ Tag created: v1.0.2
```

## ❓ Hala Çalışmazsa

### "Cannot create ref" Hatası Devam Ediyorsa:

1. **GitHub App bypass listede mi?**
   - Settings → Rules → Rule → Bypass list
   - App'inizi görebiliyor musunuz?

2. **App doğru repository'ye install edilmiş mi?**
   - https://github.com/settings/apps
   - Install App → s3-browser seçili mi?

3. **Permissions doğru mu?**
   - Contents: Read and write ✅
   - Pull requests: Read and write ✅
   - (Opsiyonel) Administration: Read-only ✅

### "tag_name was used by an immutable release"

Bu hata varsa:

1. **Mevcut release'i kontrol edin:**
   - https://github.com/getgrowly/s3-browser/releases
   - v1.0.2 release'i var mı?

2. **PR'ı manual merge edin:**
   - https://github.com/getgrowly/s3-browser/pull/3
   - PR'ı merge edin
   - Release otomatik oluşacak

## 📚 Daha Fazla Bilgi

- **GitHub Rulesets Docs:** https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- **GitHub App Permissions:** https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/choosing-permissions-for-a-github-app

## 🎊 Özet

1. ✅ GitHub App çalışıyor
2. ✅ Token oluşturuluyor
3. ❌ Repository rulesets bypass izni gerekiyor
4. 🔧 **Çözüm:** Settings → Rules → Edit rule → Add bypass → GitHub App'inizi ekleyin

5 dakikada halledersiniz! 🚀
