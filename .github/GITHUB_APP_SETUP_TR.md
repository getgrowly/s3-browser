# 🤖 GitHub App ile Otomatik Release Kurulumu

## Neden GitHub App?

GitHub App kullanmak en güvenli ve profesyonel yöntemdir:

✅ **Daha güvenli:** Token'lar kısa ömürlü (1 saat)
✅ **Repository-specific:** Sadece bu repo'ya erişim
✅ **Branch protection bypass:** Otomatik tag/release oluşturabilir
✅ **Organizasyon seviyesinde yönetilebilir**
✅ **Kişisel hesaba bağlı değil**

## 📋 Gerekli Bilgiler

GitHub App'inizden şu bilgilere ihtiyacınız var:

1. **App ID** - GitHub App'in ID'si
2. **Private Key** - GitHub App'in private key'i (.pem dosyası)

## 🔧 Kurulum Adımları

### Adım 1: GitHub App Permissions Kontrolü

GitHub App'inizin şu izinlere sahip olması gerekiyor:

**Repository Permissions:**
- ✅ **Contents:** Read and write
- ✅ **Metadata:** Read-only
- ✅ **Pull requests:** Read and write
- ✅ **Issues:** Read and write (opsiyonel)

**Organization Permissions (eğer organization repo'suysa):**
- ✅ **Administration:** Read-only (opsiyonel)

GitHub App'i kontrol etmek için:
1. GitHub App ayarları: https://github.com/settings/apps
2. App'inizin adına tıklayın
3. "Permissions & events" sekmesine gidin
4. Yukarıdaki izinleri kontrol edin
5. Değişiklik yaptıysanız "Save changes" → "Accept new permissions"

### Adım 2: App ID'yi Bulun

1. GitHub App ayarları: https://github.com/settings/apps
2. App'inizin adına tıklayın
3. "General" sekmesinde **App ID** numarasını göreceksiniz (örn: `123456`)
4. Bu numarayı kopyalayın

### Adım 3: Private Key'i İndirin

Eğer private key'iniz yoksa:

1. GitHub App ayarları: https://github.com/settings/apps
2. App'inizin adına tıklayın
3. "General" sekmesinde en aşağı inin
4. "Private keys" bölümünde "Generate a private key" butonuna tıklayın
5. `.pem` dosyası indirilecek
6. Dosyayı güvenli bir yerde saklayın!

Eğer zaten varsa, daha önce indirdiğiniz `.pem` dosyasını kullanabilirsiniz.

### Adım 4: Repository'ye App'i Yükleyin

1. GitHub App ayarları: https://github.com/settings/apps
2. App'inizin adına tıklayın
3. "Install App" sekmesine gidin
4. "getgrowly" organizasyonunun yanındaki ⚙️ → "Configure"
5. "Repository access" bölümünde:
   - "Only select repositories" seçin
   - "s3-browser" repository'sini seçin
6. "Save" butonuna tıklayın

### Adım 5: Secrets'ı Repository'ye Ekleyin

**Direkt link:** https://github.com/getgrowly/s3-browser/settings/secrets/actions

İki secret eklemeniz gerekiyor:

#### Secret 1: APP_ID

- **Name:** `APP_ID`
- **Secret:** GitHub App ID'nizi yapıştırın (örn: `123456`)
- "Add secret" butonuna tıklayın

#### Secret 2: APP_PRIVATE_KEY

- **Name:** `APP_PRIVATE_KEY`
- **Secret:** `.pem` dosyasının **tüm içeriğini** yapıştırın
  ```
  -----BEGIN RSA PRIVATE KEY-----
  MIIEpAIBAAKCAQEA...
  (tüm satırları)
  ...
  -----END RSA PRIVATE KEY-----
  ```
- "Add secret" butonuna tıklayın

⚠️ **ÖNEMLİ:** Private key'in tamamını kopyalayın (başındaki ve sonundaki `-----BEGIN/END-----` satırları dahil)!

## ✅ Test Edin

Secrets'ları ekledikten sonra test edin:

```bash
git commit -m "feat: GitHub App ile otomatik release testi" --allow-empty
git push
```

Workflow çalıştığında:
1. ✅ GitHub App token oluşturulacak
2. ✅ Branch protection bypass edilecek
3. ✅ Release PR otomatik oluşturulacak
4. ✅ Tag'ler otomatik eklenecek

## 🔍 Nasıl Çalışır?

Workflow'da token priority şöyle:

```yaml
token: ${{ steps.generate_token.outputs.token || secrets.RELEASE_PLEASE_TOKEN || secrets.GITHUB_TOKEN }}
```

1. **GitHub App token varsa** → En güvenli, onu kullan ✅
2. **Yoksa PAT varsa** → Onu kullan
3. **Yoksa GITHUB_TOKEN** → Son çare (branch protection'da çalışmayabilir)

## 🔒 Güvenlik

- ✅ Token'lar otomatik expire olur (1 saat)
- ✅ Private key GitHub tarafından şifrelenmiş saklanır
- ✅ Sadece bu repository'de kullanılır
- ✅ App permissions istediğiniz zaman değiştirilebilir
- ⚠️ Private key'i asla commit'lemeyin veya paylaşmayın

## ❓ Sorun Giderme

### "Error: Input required and not supplied: private-key"

Private key secret'ını doğru eklediniz mi?
- Secret adı: Tam olarak `APP_PRIVATE_KEY`
- İçerik: `.pem` dosyasının tamamı (BEGIN/END dahil)

### "Error: Cannot create ref due to creations being restricted"

GitHub App'in permissions'larını kontrol edin:
1. Contents: Read and write ✅
2. Pull requests: Read and write ✅
3. App repository'ye install edilmiş mi? ✅

### "Error: Resource not accessible by integration"

GitHub App repository'ye install edilmemiş:
1. GitHub App → Install App
2. s3-browser repository'sini seçin
3. Save

## 📚 Daha Fazla Bilgi

- **İngilizce dok:** `.github/GITHUB_APP_SETUP.md`
- **PAT alternatifi:** `.github/SETUP_GITHUB_TOKEN.md`
- **Genel çözüm:** `.github/COZUM_TR.md`

## 🎉 Tamamlandı!

GitHub App kurulumu tamamlandı. Artık her commit'te otomatik release sistemi çalışacak! 🚀
