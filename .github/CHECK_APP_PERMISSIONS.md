# 🔍 GitHub App İzinlerini Kontrol Etme

## Yöntem 1: GitHub Web Interface (En Kolay)

### Adım 1: GitHub App Ayarlarına Git

**Link:** https://github.com/settings/apps

### Adım 2: App'inize Tıklayın

Sol menüden **"Permissions & events"** sekmesine gidin

### Adım 3: Mevcut İzinleri Kontrol Edin

**Repository permissions** bölümünde şunları görmelisiniz:

#### ✅ Olması Gereken Minimum İzinler:
```
Contents: Read and write ✅
Metadata: Read-only ✅
Pull requests: Read and write ✅
Administration: Read and write ✅ (YENİ EKLEDİĞİNİZ)
```

#### ⚠️ Kontrol Noktaları:

1. **"Administration"** satırını bulun
2. Yanında **"Read and write"** yazıyor mu?
3. Eğer yazıyorsa, sayfanın üstünde sarı bir banner var mı?

### Sarı Banner Görüyorsanız:

```
⚠️ Some of your permission changes have not been accepted by all installations
[View installations that need to accept changes]
```

Bu demek ki: **İzinleri güncellediniz ama repository kabul etmedi!**

**Çözüm:**
- "View installations" linkine tıklayın
- "getgrowly" organization'ı bulun
- "Accept new permissions" butonuna tıklayın

## Yöntem 2: Repository Installation Sayfası

### Direkt Link:

```
https://github.com/organizations/getgrowly/settings/installations
```

veya

```
https://github.com/settings/installations
```

### Kontrol:

1. GitHub App'inizin adını bulun
2. **"Configure"** butonuna tıklayın
3. Sayfanın üstünde **sarı banner** var mı?
   ```
   ⚠️ This installation has pending permission requests
   [Review permissions]
   ```
4. Varsa → **"Review permissions"** → **"Accept new permissions"**

## Yöntem 3: Repository Settings

### Direkt Link:

```
https://github.com/getgrowly/s3-browser/settings/installations
```

### Kontrol:

1. GitHub App'inizin adını görüyor musunuz?
2. Yanında bir uyarı var mı?
3. **"Configure"** → Permissions kontrol et

## 🎯 Beklenen Durum

Doğru yapılandırılmışsa görecekleriniz:

### App Settings Sayfasında:
```
✅ Administration: Read and write (Active - no pending changes)
✅ Contents: Read and write
✅ Pull requests: Read and write
✅ Metadata: Read-only
```

### Repository Installation Sayfasında:
```
✅ [Your App Name] - Configured
   • s3-browser
   ℹ️ Last updated: [Recent date]
   ⚠️ NO pending permission banner
```

## ❌ Sorunlu Durum

Eğer şunu görüyorsanız, problem var:

### App Settings'de:
```
⚠️ Administration: Read and write (Pending acceptance by some installations)
```

veya

### Repository Installation'da:
```
⚠️ This installation has pending permission requests
```

**Bu durumda:** "Accept new permissions" butonuna tıklamanız ZORUNLU!

## 🔍 Detaylı Kontrol Listesi

Lütfen şunları kontrol edip bana bildirin:

1. **GitHub App Settings → Permissions & events**
   - [ ] Administration: Read and write yazıyor mu?
   - [ ] Yanında "(Pending)" yazısı var mı?
   - [ ] Sayfanın üstünde sarı banner var mı?

2. **Repository Installation Page**
   - [ ] App yüklü görünüyor mu?
   - [ ] "Pending permission requests" uyarısı var mı?
   - [ ] Son güncelleme tarihi ne? (bugün mü?)

3. **Branch Protection**
   - [ ] https://github.com/getgrowly/s3-browser/settings/branches
   - [ ] "Branch protection rules" bölümü var mı?
   - [ ] "main" için bir rule var mı?

4. **Son Workflow Error**
   - [ ] https://github.com/getgrowly/s3-browser/actions
   - [ ] Son çalışmanın error mesajı ne?

## 🛠️ Manuel Test

Terminal'den şunu çalıştırın:

```bash
# Boş commit ile test
git commit -m "test: verify GitHub App Administration permission" --allow-empty
git push

# Sonra Actions'a bakın
# https://github.com/getgrowly/s3-browser/actions
```

Loglarda şunu arayin:
```
✅ Using: GitHub App Token
```

Eğer bu var ama hala "Cannot create ref" hatası alıyorsanız:
→ İzinler kabul edilmemiş VEYA branch protection bypass gerekiyor

## 📸 Ekran Görüntüsü İsteği

Eğer mümkünse, şunların ekran görüntüsünü alın:

1. **App Permissions sayfası** (Administration satırı görünsün)
2. **Installation sayfası** (sarı banner varsa)
3. **Son workflow error** (tam error mesajı)

Bu bilgilerle tam olarak nerede takıldığınızı bulabiliriz!

## 🎊 Başarı Göstergeleri

Doğru yapılandırılmışsa:

```bash
# Workflow log'unda göreceksiniz:
✅ Generate GitHub App Token - Success
✅ Using: GitHub App Token
✅ Create release PR - Success
✅ No "Cannot create ref" error
```

Eğer hala hata alıyorsanız, yukarıdaki kontrol listesini doldurup paylaşın! 🚀
