# 🔧 Branch Protection Sorunu Çözümü

## Hata Mesajı

```
Error: release-please failed: Validation Failed:
{"resource":"Release","code":"custom","field":"pre_receive",
"message":"pre_receive Repository rule violations found\n\nCannot create ref due to creations being restricted.\n\n"}
```

## Sorun Nedir?

Repository'nizde **branch protection rules** (dal koruma kuralları) aktif ve GitHub Actions'ın otomatik olarak tag/release oluşturmasını engelliyor.

## ✅ Çözüm: Personal Access Token (PAT) Oluşturun

Workflow dosyası güncellendi ve artık PAT token kullanmaya hazır. Şimdi sadece token'ı oluşturmanız gerekiyor:

### Adım 1: PAT Token Oluşturun

1. **GitHub'da gidin:** https://github.com/settings/tokens/new
2. **Token ayarları:**
   - **Note:** `Release Please Token`
   - **Expiration:** `No expiration` (veya istediğiniz süre)
   - **Permissions:** Şunları seçin:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
     - ✅ `admin:repo_hook` (Full control of repository hooks)

3. **"Generate token"** butonuna tıklayın
4. **Token'ı kopyalayın** (bir daha göremezsiniz!)

### Adım 2: Repository Secret'a Ekleyin

1. **Repository'ye gidin:** https://github.com/getgrowly/s3-browser/settings/secrets/actions
2. **"New repository secret"** butonuna tıklayın
3. **Secret bilgileri:**
   - **Name:** `RELEASE_PLEASE_TOKEN`
   - **Secret:** Adım 1'de kopyaladığınız token'ı yapıştırın
4. **"Add secret"** butonuna tıklayın

### Adım 3: Test Edin

Token'ı ekledikten sonra:

```bash
git commit -m "feat: test otomatik release"
git push
```

Bu commit otomatik olarak yeni bir release PR oluşturacak!

## 🎯 Neden Bu Gerekli?

### Branch Protection ile İlgili

Repository'nizde muhtemelen şu kurallar aktif:
- ✅ "Require pull request reviews before merging"
- ✅ "Require status checks to pass"
- ✅ "Include administrators"

Bu kurallar tag oluşturmayı da engelliyor. PAT token bu kuralları bypass edebilir.

## 🔒 Güvenlik Notları

- ✅ PAT token sadece bu repository için kullanılır
- ✅ Secret olarak saklandığı için güvenlidir
- ✅ İstediğiniz zaman token'ı revoke edebilirsiniz
- ⚠️ Token'ı **asla** commit'lemeyin veya paylaşmayın

## 📊 Ne Değişti?

Workflow dosyasında yapılan değişiklikler:

1. **Checkout step'inde PAT kullanımı:**
   ```yaml
   - uses: actions/checkout@v4
     with:
       token: ${{ secrets.RELEASE_PLEASE_TOKEN || secrets.GITHUB_TOKEN }}
   ```

2. **Release-please action'da PAT kullanımı:**
   ```yaml
   - uses: googleapis/release-please-action@v4
     with:
       token: ${{ secrets.RELEASE_PLEASE_TOKEN || secrets.GITHUB_TOKEN }}
   ```

3. **Fallback mekanizması:**
   - Eğer `RELEASE_PLEASE_TOKEN` yoksa, `GITHUB_TOKEN` kullanır
   - Ama branch protection varsa, `RELEASE_PLEASE_TOKEN` şart!

## 🚀 Sonuç

Token'ı ekledikten sonra:

1. ✅ Release-please otomatik çalışacak
2. ✅ Tag'ler otomatik oluşturulacak
3. ✅ Release'ler otomatik publish edilecek
4. ✅ Build'ler otomatik tetiklenecek

Hiç manuel işlem gerekmeyecek! 🎉

## ❓ Sorun mu var?

Eğer hala çalışmazsa:
1. Token'ın doğru permissions'lara sahip olduğundan emin olun
2. Secret adının tam olarak `RELEASE_PLEASE_TOKEN` olduğundan emin olun
3. Workflow'u yeniden çalıştırın: https://github.com/getgrowly/s3-browser/actions
